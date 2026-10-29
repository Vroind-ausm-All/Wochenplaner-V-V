import { createDecipheriv, createECDH, createHmac, createPublicKey, randomBytes, verify } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expandIcs } from '../src/lib/ical.ts';
import { buildFeed } from './feed.mjs';
import { b64url, encrypt, fromB64url, loadVapid, vapidHeader } from './push.mjs';
import { dueReminders, reminderMessage } from './reminders.mjs';
import { createPlannerServer } from './server.mjs';
import { wallToUtc } from './time.mjs';

const hmac = (k, d) => createHmac('sha256', k).update(d).digest();

/** Empfängerseite nach RFC 8291 – so entschlüsselt ein Browser. */
function decrypt(body, uaEcdh, auth) {
  const salt = body.subarray(0, 16);
  const idlen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idlen);
  const cipher = body.subarray(21 + idlen);
  const prkKey = hmac(auth, uaEcdh.computeSecret(asPublic));
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaEcdh.getPublicKey(), asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const d = createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(cipher.subarray(cipher.length - 16));
  const plain = Buffer.concat([d.update(cipher.subarray(0, cipher.length - 16)), d.final()]);
  expect(plain[plain.length - 1]).toBe(2); // Ende-Markierung des letzten Datensatzes
  return plain.subarray(0, plain.length - 1).toString('utf8');
}

describe('Web Push (RFC 8291 / 8292)', () => {
  it('stimmt mit dem Testvektor aus RFC 8291, Anhang A überein', () => {
    const as = createECDH('prime256v1');
    as.setPrivateKey(fromB64url('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'));
    const body = encrypt('When I grow up, I want to be a watermelon', {
      p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
      auth: 'BTBZMqHH6r4Tts7J_aSIgg',
    }, { salt: fromB64url('DGv6ra1nlYgDCS1FRnbzlw'), ecdh: as });
    expect(b64url(body)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    );
  });

  it('lässt sich vom Empfänger entschlüsseln', () => {
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const auth = randomBytes(16);
    const body = encrypt(JSON.stringify({ title: 'Zahnarzt 🦷' }), { p256dh: b64url(ua.getPublicKey()), auth: b64url(auth) });
    expect(JSON.parse(decrypt(body, ua, auth)).title).toBe('Zahnarzt 🦷');
  });

  it('signiert das VAPID-Token gültig', () => {
    const vapid = loadVapid(join(mkdtempSync(join(tmpdir(), 'vapid-')), 'vapid.json'));
    const header = vapidHeader('https://fcm.googleapis.com/fcm/send/abc', vapid, 'mailto:test@example.org');
    const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
    const [h, c, sig] = jwt.split('.');
    expect(JSON.parse(fromB64url(c))).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'mailto:test@example.org' });
    const raw = fromB64url(k);
    const pub = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64url(raw.subarray(1, 33)), y: b64url(raw.subarray(33)) }, format: 'jwk' });
    expect(verify('sha256', Buffer.from(`${h}.${c}`), { key: pub, dsaEncoding: 'ieee-p1363' }, fromB64url(sig))).toBe(true);
  });
});

describe('Erinnerungen', () => {
  const tz = 'Europe/Berlin';
  const ev = (p) => ({ id: 'e', title: 'Schwimmen', date: '2026-10-19', time: '17:00', duration: 60, owner: 'Person A', allDay: false, repeat: 'none', reminder: '15', ...p });
  const at = (date, time) => wallToUtc(date, time, tz);

  it('findet fällige Erinnerungen – auch bei Serien über die Zeitumstellung', () => {
    const state = { events: [ev({ repeat: 'weekly', exDates: ['2026-11-02'] })] };
    // 26.10. (nach Umstellung auf Winterzeit): Erinnerung um 16:45 Ortszeit
    const due = dueReminders(state, at('2026-10-26', '16:44'), at('2026-10-26', '16:45'), tz);
    expect(due.map((r) => r.key)).toEqual(['e|2026-10-26|15']);
    expect(dueReminders(state, at('2026-11-02', '16:40'), at('2026-11-02', '16:50'), tz)).toEqual([]); // Ausnahme
    expect(dueReminders(state, at('2026-10-26', '16:46'), at('2026-10-26', '17:30'), tz)).toEqual([]);
  });

  it('erinnert bei „1 Tag vorher“ und ganztägigen Terminen am Vortag um 8 Uhr', () => {
    const state = { events: [ev({ id: 'f', title: 'Elternabend', date: '2026-11-04', time: '19:00', reminder: '1440' }), ev({ id: 'g', title: 'Oma Geburtstag', date: '2026-11-05', allDay: true, reminder: '1440', owner: 'Beide' })] };
    const keys = dueReminders(state, at('2026-11-03', '07:00'), at('2026-11-04', '09:00'), tz).map((r) => r.key);
    expect(keys).toEqual(['f|2026-11-04|1440', 'g|2026-11-05|1440']);
    const msg = reminderMessage(dueReminders(state, at('2026-11-03', '18:59'), at('2026-11-03', '19:00'), tz)[0], { personA: 'Vera' });
    expect(msg).toMatchObject({ title: 'Morgen: Elternabend', body: '19:00 Uhr · Vera' });
  });
});

describe('Kalender-Feed', () => {
  it('lässt sich mit dem eigenen iCal-Leser wieder einlesen (inkl. Serie, Ausnahme, Alarm)', () => {
    const state = {
      settings: { personA: 'Vera' },
      events: [
        { id: 'a', title: 'Yoga; mit Freundin, entspannt', date: '2026-10-20', time: '18:30', duration: 60, owner: 'Person A', category: 'Ich', allDay: false, repeat: 'weekly', exDates: ['2026-11-03'], reminder: '60' },
        { id: 'b', title: 'Oma Geburtstag', date: '2026-11-05', time: '00:00', duration: 60, owner: 'Beide', category: 'Familie', allDay: true, repeat: 'yearly', reminder: 'none' },
        { id: 'c', title: 'Ein sehr langer Titel mit Umlauten äöüß, der garantiert über fünfundsiebzig Bytes hinausgeht', date: '2026-10-22', time: '23:30', duration: 90, owner: 'Beide', allDay: false, repeat: 'none', reminder: 'none' },
      ],
    };
    const ics = buildFeed(state, { tz: 'Europe/Berlin' });
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    const occ = expandIcs(ics, '2026-10-20', '2026-11-10').map((o) => `${o.date} ${o.allDay ? 'ganztags' : o.time} ${o.title}`);
    expect(occ).toEqual([
      '2026-10-20 18:30 Yoga; mit Freundin, entspannt',
      '2026-10-22 23:30 Ein sehr langer Titel mit Umlauten äöüß, der garantiert über fünfundsiebzig Bytes hinausgeht',
      '2026-10-27 18:30 Yoga; mit Freundin, entspannt',
      '2026-11-05 ganztags Oma Geburtstag',
      '2026-11-10 18:30 Yoga; mit Freundin, entspannt',
    ]);
  });
});

describe('Heimserver: Abos, Feed und Push', () => {
  let server, base, cookie, icsServer, icsUrl;
  const pushed = [];
  const ua = createECDH('prime256v1');
  ua.generateKeys();
  const auth = randomBytes(16);

  beforeAll(async () => {
    icsServer = createServer((req, res) => {
      if (req.url === '/weiter') return res.writeHead(302, { Location: '/kita.ics' }).end();
      if (req.url === '/kein.ics') return res.end('<html>Login</html>');
      res.writeHead(200, { 'Content-Type': 'text/calendar' }).end('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:k\r\nSUMMARY:Kita-Fest\r\nDTSTART;VALUE=DATE:20261107\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n');
    });
    await new Promise((ok) => icsServer.listen(0, '127.0.0.1', ok));
    icsUrl = `http://127.0.0.1:${icsServer.address().port}`;
    const pushFetch = async (url, init) => {
      pushed.push({ url, headers: init.headers, body: Buffer.from(init.body) });
      return new Response(null, { status: url.includes('abgelaufen') ? 410 : 201 });
    };
    server = createPlannerServer({ dataDir: mkdtempSync(join(tmpdir(), 'wir-s2-')), password: 'pw', scheduler: false, icsAllowLoopback: true, pushFetch, tz: 'Europe/Berlin' });
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${server.address().port}`;
    const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"password":"pw"}' });
    cookie = r.headers.get('set-cookie').split(';')[0];
  });
  afterAll(async () => {
    await new Promise((ok) => server.close(ok));
    await new Promise((ok) => icsServer.close(ok));
  });

  const api = (path, init = {}) => fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(init.headers || {}) } });

  it('ruft Kalender-Abos stellvertretend ab, folgt Weiterleitungen und prüft den Inhalt', async () => {
    expect(await (await api(`/api/ics?url=${encodeURIComponent(`${icsUrl}/weiter`)}`)).text()).toContain('Kita-Fest');
    expect((await api(`/api/ics?url=${encodeURIComponent(`${icsUrl}/kein.ics`)}`)).status).toBe(502);
    expect((await api('/api/ics?url=ftp%3A%2F%2Fx')).status).toBe(400);
    expect((await fetch(`${base}/api/ics?url=x`)).status).toBe(401);
  });

  it('sperrt den Server selbst als Abo-Ziel, wenn nicht ausdrücklich erlaubt', async () => {
    const strict = createPlannerServer({ dataDir: mkdtempSync(join(tmpdir(), 'wir-s3-')), password: 'pw', scheduler: false });
    await new Promise((ok) => strict.listen(0, '127.0.0.1', ok));
    const b = `http://127.0.0.1:${strict.address().port}`;
    const c = (await fetch(`${b}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"password":"pw"}' })).headers.get('set-cookie').split(';')[0];
    for (const target of [`${icsUrl}/kita.ics`, 'http://169.254.169.254/latest', 'http://[::1]/x']) {
      const r = await fetch(`${b}/api/ics?url=${encodeURIComponent(target)}`, { headers: { Cookie: c } });
      expect(r.status, target).toBe(400);
    }
    await new Promise((ok) => strict.close(ok));
  });

  it('stellt den Plan als Feed mit geheimer Adresse bereit', async () => {
    await api('/api/state', { method: 'PUT', body: JSON.stringify({ revision: 0, state: { events: [{ id: 'z', title: 'Zahnarzt', date: '2026-11-04', time: '14:30', duration: 45, owner: 'Person A', allDay: false, repeat: 'none', reminder: '15' }], shopping: [], settings: { personA: 'Vera' } } }) });
    const { path } = await (await api('/api/feed')).json();
    const feed = await fetch(base + path);
    expect(feed.headers.get('content-type')).toContain('text/calendar');
    expect(await feed.text()).toContain('SUMMARY:Zahnarzt');
    expect((await fetch(`${base}/api/feed/falsch.ics`)).status).toBe(404);
    const rotated = await (await api('/api/feed/rotate', { method: 'POST', body: '{}' })).json();
    expect(rotated.path).not.toBe(path);
    expect((await fetch(base + path)).status).toBe(404);
  });

  it('verschickt fällige Erinnerungen verschlüsselt an passende Geräte – genau einmal', async () => {
    const { publicKey } = await (await api('/api/push/key')).json();
    expect(fromB64url(publicKey)).toHaveLength(65);
    const keys = { p256dh: b64url(ua.getPublicKey()), auth: b64url(auth) };
    expect((await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: { endpoint: 'https://push.example/vera', keys }, owner: 'Person A', label: 'Veras Handy' }) })).status).toBe(200);
    await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: { endpoint: 'https://push.example/valentin', keys }, owner: 'Person B' }) });
    await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: { endpoint: 'https://push.example/abgelaufen', keys }, owner: 'Alle' }) });
    expect((await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: { endpoint: 'http://unsicher', keys } }) })).status).toBe(400);

    const due = wallToUtc('2026-11-04', '14:15', 'Europe/Berlin');
    await server.wir.runReminders(due - 60_000);
    pushed.length = 0;
    const sent = await server.wir.runReminders(due + 1000);
    expect(sent).toHaveLength(1);
    expect(pushed.map((p) => p.url).sort()).toEqual(['https://push.example/abgelaufen', 'https://push.example/vera']);
    const p = pushed.find((x) => x.url.endsWith('vera'));
    expect(p.headers['Content-Encoding']).toBe('aes128gcm');
    expect(p.headers.Authorization).toMatch(/^vapid t=.+, k=/);
    expect(JSON.parse(decrypt(p.body, ua, auth))).toMatchObject({ title: 'In 15 Min.: Zahnarzt', body: '14:30 Uhr · Vera' });

    pushed.length = 0;
    await server.wir.runReminders(due + 30_000);
    expect(pushed).toHaveLength(0); // nicht doppelt
    // Abgelaufenes Abo wurde entfernt
    expect((await (await api('/api/push/key')).json()).devices).toBe(2);
  });

  it('schickt eine Test-Nachricht nur an das anfragende Gerät', async () => {
    pushed.length = 0;
    const r = await api('/api/push/test', { method: 'POST', body: JSON.stringify({ endpoint: 'https://push.example/valentin' }) });
    expect(r.status).toBe(200);
    expect(pushed.map((x) => x.url)).toEqual(['https://push.example/valentin']);
  });
});
