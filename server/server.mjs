// WIR. Heimserver – liefert die App aus und hält den gemeinsamen Datenstand für alle Geräte im Haushalt.
// Bewusst ohne Abhängigkeiten: läuft mit Node.js ≥ 20 auf Raspberry Pi, Mini-PC oder NAS.
//
// Protokoll (kompatibel zum Familienserver des alten Boards):
//   GET  /api/status   → { ok, app, authenticated, revision }        (öffentlich)
//   POST /api/login    → { password } setzt ein Sitzungs-Cookie
//   POST /api/logout
//   GET  /api/state    → { state, revision }
//   PUT  /api/state    ← { state, revision }  → { revision } oder 409 { state, revision }
//   GET  /api/events   → Server-Sent Events „update“ bei jeder Änderung
//   GET  /api/backup   → aktueller Stand als JSON-Datei
//   GET  /api/ics?url= → Kalender-Abo stellvertretend abrufen (Google, iCloud & Co. sperren Browserzugriffe)
//   GET  /api/feed     → { path } Adresse des eigenen Kalender-Feeds;  POST /api/feed/rotate → neue Adresse
//   GET  /api/feed/<token>.ics → euer Plan als iCal (ohne Anmeldung, nur mit geheimem Token)
//   GET  /api/push/key, POST /api/push/subscribe | unsubscribe | test → Erinnerungen als Push-Nachricht
//   GET  /api/photos, POST /api/photos (Bild als Rohdaten), GET|DELETE /api/photos/<id> → Fotos für den Bildschirmschoner
//   GET  /api/alerts?lat=&lon= → amtliche Wetterwarnungen (DWD über Bright Sky), falls der Browser sie nicht direkt abrufen kann

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFeed } from './feed.mjs';
import { createIcsFetcher } from './ics.mjs';
import { createPhotoStore, MAX_PHOTO_BYTES } from './photos.mjs';
import { loadVapid, sendPush } from './push.mjs';
import { dueReminders, forSubscriber, reminderMessage } from './reminders.mjs';
import { serverZone } from './time.mjs';

const MAX_BODY = 5 * 1024 * 1024;
const SESSION_DAYS = 400; // Höchstdauer, die Browser für Cookies akzeptieren
const KEEP_BACKUPS = 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 10;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

const sha = (s) => createHash('sha256').update(String(s)).digest();
const today = () => new Date().toISOString().slice(0, 10);

const REMINDER_TICK_MS = 30_000;

/**
 * @param {{ dataDir: string, password: string, distDir?: string, log?: (msg: string) => void,
 *   scheduler?: boolean, icsAllowLoopback?: boolean, pushFetch?: typeof fetch, tz?: string, pushContact?: string }} opts
 */
export function createPlannerServer({
  dataDir, password, distDir, log = () => {}, scheduler = true, icsAllowLoopback = false, pushFetch = fetch, alertFetch = fetch,
  tz = serverZone(), pushContact = process.env.WIR_PUSH_CONTACT || 'mailto:wir-wochenplaner@example.org',
}) {
  if (!password) throw new Error('Kein Haushalts-Passwort gesetzt (WIR_PASSWORD).');
  mkdirSync(join(dataDir, 'backups'), { recursive: true });

  const stateFile = join(dataDir, 'state.json');
  const secretFile = join(dataDir, 'secret');
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600 });
  const secret = readFileSync(secretFile, 'utf8').trim();
  const passwordHash = sha(password);

  /** @type {{ state: unknown, revision: number, updatedAt: string | null }} */
  let store = { state: null, revision: 0, updatedAt: null };
  if (existsSync(stateFile)) store = JSON.parse(readFileSync(stateFile, 'utf8'));

  const clients = new Set();
  const failures = new Map();
  const fetchIcs = createIcsFetcher({ allowLoopback: icsAllowLoopback });
  const alertCache = new Map();
  const photos = createPhotoStore(dataDir);

  // ---- Kalender-Feed: geheimes Token in der Adresse, weil Kalender-Apps keine Anmeldung können ----
  const tokenFile = join(dataDir, 'feed-token');
  const newToken = () => {
    const t = randomBytes(18).toString('base64url');
    writeFileSync(tokenFile, t, { mode: 0o600 });
    return t;
  };
  let feedToken = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : newToken();

  // ---- Push-Abos und Erinnerungen ----
  const vapid = loadVapid(join(dataDir, 'vapid.json'));
  const subsFile = join(dataDir, 'push.json');
  const sentFile = join(dataDir, 'push-sent.json');
  const readJsonFile = (f, fallback) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : fallback);
  /** @type {{ endpoint: string, keys: { p256dh: string, auth: string }, owner: string, label: string, created: string }[]} */
  let subs = readJsonFile(subsFile, []);
  /** @type {Record<string, number>} bereits verschickte Erinnerungen (Schlüssel → Zeitpunkt) */
  let sent = readJsonFile(sentFile, {});
  const saveSubs = () => writeFileSync(subsFile, JSON.stringify(subs, null, 1), { mode: 0o600 });
  let lastTick = Date.now();

  async function deliver(message, owner = 'Beide', only) {
    const targets = subs.filter((x) => (only ? x.endpoint === only : forSubscriber(owner, x.owner)));
    const results = await Promise.all(targets.map((x) => sendPush(x, message, vapid, pushContact, pushFetch)));
    const gone = new Set(targets.filter((_, i) => results[i] === 'gone').map((x) => x.endpoint));
    if (gone.size) {
      subs = subs.filter((x) => !gone.has(x.endpoint));
      saveSubs();
      log(`${gone.size} abgelaufene Push-Abos entfernt`);
    }
    return results;
  }

  /** Fällige Erinnerungen seit dem letzten Lauf verschicken (auch von Tests direkt aufrufbar). */
  async function runReminders(now = Date.now()) {
    const from = Math.max(lastTick, now - 10 * 60_000); // nach langer Pause keine alten Erinnerungen nachholen
    lastTick = now;
    const due = dueReminders(store.state, from, now, tz).filter((r) => !sent[r.key]);
    for (const r of due) {
      sent[r.key] = now;
      if (subs.length) await deliver(reminderMessage(r, store.state?.settings), r.event.owner || 'Beide');
    }
    if (due.length) {
      for (const [k, t] of Object.entries(sent)) if (now - t > 3 * 864e5) delete sent[k];
      writeFileSync(sentFile, JSON.stringify(sent));
    }
    return due;
  }
  const timer = scheduler ? setInterval(() => void runReminders().catch((e) => log(`Erinnerungen: ${e}`)), REMINDER_TICK_MS) : null;

  // ---- Sitzungen: signiertes Ablaufdatum, übersteht Neustarts ohne Sitzungsspeicher ----
  const sign = (v) => createHmac('sha256', secret).update(v).digest('base64url');
  const newSession = () => {
    const exp = String(Date.now() + SESSION_DAYS * 864e5);
    return `${exp}.${sign(exp)}`;
  };
  const validSession = (token) => {
    const [exp, sig] = String(token || '').split('.');
    if (!exp || !sig) return false;
    const expected = Buffer.from(sign(exp));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given) && Number(exp) > Date.now();
  };
  const cookies = (req) =>
    Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p.length === 2));
  const authed = (req) => validSession(cookies(req).wir_session);
  const secure = (req) => req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted;
  const sessionCookie = (req, value, maxAge) =>
    `wir_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`;

  // ---- Speichern: atomar + tägliche Sicherung ----
  function save(state) {
    if (existsSync(stateFile)) {
      const backup = join(dataDir, 'backups', `state-${today()}.json`);
      if (!existsSync(backup)) copyFileSync(stateFile, backup);
      const all = readdirSync(join(dataDir, 'backups')).filter((f) => f.startsWith('state-')).sort();
      for (const old of all.slice(0, Math.max(0, all.length - KEEP_BACKUPS))) rmSync(join(dataDir, 'backups', old));
    }
    store = { state, revision: store.revision + 1, updatedAt: new Date().toISOString() };
    const tmp = `${stateFile}.tmp`;
    writeFileSync(tmp, JSON.stringify(store));
    renameSync(tmp, stateFile);
  }

  function broadcastEvent(name, data) {
    const msg = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(msg);
  }
  const broadcast = () => broadcastEvent('update', { revision: store.revision });

  // ---- Hilfsfunktionen ----
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  const readJson = (req) =>
    new Promise((ok, fail) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size <= MAX_BODY) chunks.push(c);
      });
      req.on('end', () => {
        if (size > MAX_BODY) return fail(Object.assign(new Error('Datenstand zu groß'), { status: 413 }));
        try {
          ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          fail(Object.assign(new Error('ungültiges JSON'), { status: 400 }));
        }
      });
      req.on('error', fail);
    });
  /** Rohdaten lesen. Zu große Uploads werden zu Ende gelesen (verworfen), damit das Gerät „zu groß“ statt eines Verbindungsfehlers sieht. */
  const readRaw = (req, limit, message = 'Zu groß') =>
    new Promise((ok, fail) => {
      let size = 0;
      let tooBig = Number(req.headers['content-length'] || 0) > limit;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) tooBig = true;
        if (!tooBig) chunks.push(c);
      });
      req.on('end', () => (tooBig ? fail(Object.assign(new Error(message), { status: 413 })) : ok(Buffer.concat(chunks))));
      req.on('error', fail);
    });
  const isJson = (req) => (req.headers['content-type'] || '').includes('application/json');
  const validState = (s) => !!s && typeof s === 'object' && Array.isArray(s.events) && Array.isArray(s.shopping);
  const ip = (req) => req.socket.remoteAddress || '?';

  function tooManyFailures(req) {
    const f = failures.get(ip(req));
    if (!f || Date.now() - f.since > LOGIN_WINDOW_MS) return false;
    return f.count >= LOGIN_MAX_FAILS;
  }
  function noteFailure(req) {
    const f = failures.get(ip(req));
    if (!f || Date.now() - f.since > LOGIN_WINDOW_MS) failures.set(ip(req), { since: Date.now(), count: 1 });
    else f.count++;
  }

  async function api(req, res, path) {
    if (path === '/api/status' && req.method === 'GET')
      return send(res, 200, { ok: true, app: 'wir-wochenplaner', authenticated: authed(req), revision: store.revision });

    if (path === '/api/login' && req.method === 'POST') {
      if (!isJson(req)) return send(res, 415, { error: 'JSON erwartet' });
      if (tooManyFailures(req)) return send(res, 429, { error: 'Zu viele Versuche – bitte 15 Minuten warten.' });
      const body = await readJson(req);
      const given = sha(body.password ?? '');
      if (!timingSafeEqual(given, passwordHash)) {
        noteFailure(req);
        log(`Anmeldung fehlgeschlagen von ${ip(req)}`);
        return send(res, 401, { error: 'Falsches Passwort' });
      }
      failures.delete(ip(req));
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, newSession(), SESSION_DAYS * 86400) });
    }

    if (path === '/api/logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });

    const feed = path.match(/^\/api\/feed\/([A-Za-z0-9_-]+)\.ics$/);
    if (feed && req.method === 'GET') {
      const given = Buffer.from(feed[1]), expected = Buffer.from(feedToken);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return send(res, 404, { error: 'Unbekannt' });
      res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Disposition': 'inline; filename="wir-familienplan.ics"' });
      return res.end(buildFeed(store.state, { tz }));
    }

    if (!authed(req)) return send(res, 401, { error: 'Bitte anmelden' });

    if (path === '/api/ics' && req.method === 'GET') {
      const url = new URL(req.url, 'http://x').searchParams.get('url');
      if (!url) return send(res, 400, { error: 'Adresse fehlt' });
      const text = await fetchIcs(url);
      res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(text);
    }

    if (path === '/api/photos' && req.method === 'GET') return send(res, 200, { photos: photos.list() });
    if (path === '/api/photos' && req.method === 'POST') {
      if (!/^image\/(jpeg|png|webp)$/.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'Nur JPEG, PNG oder WebP' });
      const q = new URL(req.url, 'http://x').searchParams;
      const p = photos.add(await readRaw(req, MAX_PHOTO_BYTES, 'Foto zu groß (max. 8 MB)'), { w: Number(q.get('w')), h: Number(q.get('h')), caption: q.get('caption') || '' });
      broadcastEvent('photos', { count: photos.list().length });
      return send(res, 200, p);
    }
    const photo = path.match(/^\/api\/photos\/([A-Za-z0-9_-]+)$/);
    if (photo && req.method === 'GET') {
      const p = photos.get(photo[1]);
      if (!p) return send(res, 404, { error: 'Unbekannt' });
      res.writeHead(200, { 'Content-Type': p.type, 'Content-Length': p.size, 'Cache-Control': 'private, max-age=31536000, immutable' });
      return createReadStream(p.file).pipe(res);
    }
    if (photo && req.method === 'DELETE') {
      if (!photos.remove(photo[1])) return send(res, 404, { error: 'Unbekannt' });
      broadcastEvent('photos', { count: photos.list().length });
      return send(res, 200, { ok: true });
    }

    if (path === '/api/alerts' && req.method === 'GET') {
      // Warnungen des DWD über Bright Sky – feste Gegenstelle, nur Koordinaten werden durchgereicht.
      const q = new URL(req.url, 'http://x').searchParams;
      const lat = Number(q.get('lat')), lon = Number(q.get('lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return send(res, 400, { error: 'Koordinaten fehlen' });
      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      const hit = alertCache.get(key);
      if (hit && Date.now() - hit.at < 10 * 60_000) return send(res, 200, hit.json);
      try {
        const r = await alertFetch(`https://api.brightsky.dev/alerts?lat=${lat}&lon=${lon}`, { signal: AbortSignal.timeout(15_000) });
        if (!r.ok) return send(res, 502, { error: `Warndienst antwortet mit ${r.status}` });
        const json = await r.json();
        alertCache.set(key, { at: Date.now(), json });
        return send(res, 200, json);
      } catch {
        return send(res, 502, { error: 'Warndienst nicht erreichbar' });
      }
    }

    if (path === '/api/feed' && req.method === 'GET') return send(res, 200, { path: `/api/feed/${feedToken}.ics` });
    if (path === '/api/feed/rotate' && req.method === 'POST') {
      feedToken = newToken();
      return send(res, 200, { path: `/api/feed/${feedToken}.ics` });
    }

    if (path === '/api/push/key' && req.method === 'GET') return send(res, 200, { publicKey: vapid.publicKey, devices: subs.length });

    if (path.startsWith('/api/push/') && req.method === 'POST') {
      if (!isJson(req)) return send(res, 415, { error: 'JSON erwartet' });
      const body = await readJson(req);
      const sub = body.subscription;
      if (path === '/api/push/subscribe') {
        if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return send(res, 400, { error: 'Ungültiges Abo' });
        const owner = ['Alle', 'Person A', 'Person B'].includes(body.owner) ? body.owner : 'Alle';
        subs = [...subs.filter((x) => x.endpoint !== sub.endpoint), { endpoint: sub.endpoint, keys: sub.keys, owner, label: String(body.label || 'Gerät').slice(0, 60), created: new Date().toISOString() }];
        saveSubs();
        return send(res, 200, { ok: true, devices: subs.length });
      }
      if (path === '/api/push/unsubscribe') {
        subs = subs.filter((x) => x.endpoint !== body.endpoint);
        saveSubs();
        return send(res, 200, { ok: true });
      }
      if (path === '/api/push/test') {
        if (!subs.some((x) => x.endpoint === body.endpoint)) return send(res, 404, { error: 'Dieses Gerät ist nicht angemeldet' });
        const [result] = await deliver({ title: '🔔 Erinnerungen sind eingerichtet', body: 'So sehen Erinnerungen aus dem WIR. Wochenplaner aus.', tag: 'test', url: './' }, 'Beide', body.endpoint);
        return send(res, result === 'ok' ? 200 : 502, { result });
      }
    }

    if (path === '/api/state' && req.method === 'GET') return send(res, 200, { state: store.state, revision: store.revision });

    if (path === '/api/state' && req.method === 'PUT') {
      if (!isJson(req)) return send(res, 415, { error: 'JSON erwartet' });
      const body = await readJson(req);
      if (!validState(body.state)) return send(res, 400, { error: 'Ungültiger Datenstand' });
      // Nur wer den aktuellen Stand kennt, darf überschreiben – sonst erst abgleichen.
      if (Number(body.revision) !== store.revision) return send(res, 409, { state: store.state, revision: store.revision });
      save(body.state);
      broadcast();
      return send(res, 200, { revision: store.revision });
    }

    if (path === '/api/events' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(`retry: 3000\nevent: hello\ndata: ${JSON.stringify({ revision: store.revision })}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(ping);
        clients.delete(res);
      });
      return;
    }

    if (path === '/api/backup' && req.method === 'GET')
      return send(res, 200, store.state, { 'Content-Disposition': `attachment; filename="wir-wochenplaner-${today()}.json"` });

    return send(res, 404, { error: 'Unbekannt' });
  }

  function serveStatic(req, res, path) {
    if (!distDir || !existsSync(distDir)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('App noch nicht gebaut – bitte zuerst „npm run build“ ausführen.');
    }
    const root = resolve(distDir);
    let file = normalize(join(root, decodeURIComponent(path)));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end();
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html'); // App-Routen
    const name = file.slice(root.length);
    const cache = name.startsWith(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  }

  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    const path = new URL(req.url || '/', 'http://x').pathname;
    try {
      if (path.startsWith('/api/')) await api(req, res, path);
      else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res, path);
      else send(res, 405, { error: 'Nicht erlaubt' });
    } catch (e) {
      if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Serverfehler' });
      if (!e.status) log(`Fehler: ${e.stack || e}`);
    }
  });
  server.on('close', () => {
    clients.forEach((c) => c.end());
    if (timer) clearInterval(timer);
  });
  server.wir = { runReminders, vapidPublicKey: vapid.publicKey, feedPath: () => `/api/feed/${feedToken}.ics` };
  return server;
}

// ---- Start über die Kommandozeile ----
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = resolve(fileURLToPath(import.meta.url), '..', '..');
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || '0.0.0.0';
  const dataDir = resolve(process.env.WIR_DATA || join(repo, 'server-daten'));
  const distDir = resolve(process.env.WIR_DIST || join(repo, 'dist'));
  if (!process.env.WIR_PASSWORD) {
    console.error('Bitte ein Haushalts-Passwort setzen, z. B.:  WIR_PASSWORD="unser-passwort" npm run server');
    process.exit(1);
  }
  if (!existsSync(distDir)) console.warn(`Hinweis: ${distDir} fehlt – „npm run build“ ausführen, damit die App ausgeliefert wird.`);
  const server = createPlannerServer({ dataDir, password: process.env.WIR_PASSWORD, distDir, log: (m) => console.log(`[${new Date().toISOString()}] ${m}`) });
  server.listen(port, host, () => {
    console.log(`WIR. Heimserver läuft auf http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(`Daten: ${dataDir}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
