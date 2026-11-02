import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPlannerServer } from './server.mjs';

const state = (title = 'Spaziergang') => ({ events: [{ id: 'e1', title }], shopping: [] });

let server, base, dataDir, cookie;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'wir-daten-'));
  const dist = mkdtempSync(join(tmpdir(), 'wir-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>WIR</title>');
  writeFileSync(join(dist, 'assets', 'app-123.js'), 'console.log(1)');
  server = createPlannerServer({ dataDir, password: 'geheim', distDir: dist });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((ok) => server.close(ok)));

const api = (path, init = {}) =>
  fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(init.headers || {}) } });

describe('Heimserver', () => {
  it('liefert App und Status ohne Anmeldung, Daten nur mit', async () => {
    expect((await fetch(`${base}/kalender/woche`)).status).toBe(200); // App-Route → index.html
    const asset = await fetch(`${base}/assets/app-123.js`);
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${base}/assets/..%2f..%2f..%2fetc%2fpasswd`)).status).toBe(403); // Pfad-Ausbruch
    const s = await (await api('/api/status')).json();
    expect(s).toMatchObject({ ok: true, app: 'wir-wochenplaner', authenticated: false, revision: 0 });
    expect((await api('/api/state')).status).toBe(401);
  });

  it('meldet mit Passwort an und lehnt falsche ab', async () => {
    expect((await api('/api/login', { method: 'POST', body: JSON.stringify({ password: 'falsch' }) })).status).toBe(401);
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: 'geheim' }) });
    expect(r.status).toBe(200);
    cookie = r.headers.get('set-cookie').split(';')[0];
    expect(r.headers.get('set-cookie')).toContain('HttpOnly');
    expect((await (await api('/api/status')).json()).authenticated).toBe(true);
  });

  it('speichert nur mit aktueller Revision und meldet sonst 409 mit Serverstand', async () => {
    expect(await (await api('/api/state')).json()).toEqual({ state: null, revision: 0 });
    let r = await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: state(), revision: 0 }) });
    expect(await r.json()).toEqual({ revision: 1 });
    r = await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: state('veraltet'), revision: 0 }) });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ state: state(), revision: 1 });
    expect((await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: { foo: 1 }, revision: 1 }) })).status).toBe(400);
    expect((await api('/api/state', { method: 'PUT', body: 'x', headers: { 'Content-Type': 'text/plain' } })).status).toBe(415);
  });

  it('benachrichtigt verbundene Geräte per Server-Sent Events', async () => {
    const ctrl = new AbortController();
    const res = await fetch(`${base}/api/events`, { headers: { Cookie: cookie }, signal: ctrl.signal });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const read = async (until) => {
      while (!text.includes(until)) text += decoder.decode((await reader.read()).value);
    };
    await read('event: hello');
    await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: state('Kino'), revision: 1 }) });
    await read('event: update');
    expect(text).toContain('"revision":2');
    ctrl.abort();
  });

  it('schreibt den Stand dauerhaft und legt eine Tagessicherung an', () => {
    const saved = JSON.parse(readFileSync(join(dataDir, 'state.json'), 'utf8'));
    expect(saved.revision).toBe(2);
    expect(saved.state.events[0].title).toBe('Kino');
    expect(readdirSync(join(dataDir, 'backups')).length).toBe(1);
  });

  it('übersteht einen Neustart samt Sitzung', async () => {
    const again = createPlannerServer({ dataDir, password: 'geheim' });
    await new Promise((ok) => again.listen(0, '127.0.0.1', ok));
    const r = await fetch(`http://127.0.0.1:${again.address().port}/api/state`, { headers: { Cookie: cookie } });
    expect((await r.json()).revision).toBe(2);
    await new Promise((ok) => again.close(ok));
  });

  it('bremst wiederholte Fehlversuche', async () => {
    let last;
    for (let i = 0; i < 11; i++) last = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"password":"x"}' });
    expect(last.status).toBe(429);
  });
});

describe('Zweitsicherung', () => {
  it('legt die Tagessicherung zusätzlich im zweiten Ordner ab und speichert auch ohne ihn weiter', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wir-zweit-'));
    const copy = join(dir, 'usb', 'wir-sicherung');
    const srv = createPlannerServer({ dataDir: join(dir, 'daten'), password: 'geheim', scheduler: false, backupCopyDir: copy });
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
    const url = `http://127.0.0.1:${srv.address().port}`;
    const login = await fetch(`${url}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'geheim' }) });
    const c = login.headers.get('set-cookie').split(';')[0];
    const put = (revision, title) =>
      fetch(`${url}/api/state`, { method: 'PUT', headers: { Cookie: c, 'Content-Type': 'application/json' }, body: JSON.stringify({ state: state(title), revision }) });
    expect((await put(0, 'Eins')).status).toBe(200);
    expect((await put(1, 'Zwei')).status).toBe(200);
    expect(readdirSync(copy)).toEqual(readdirSync(join(dir, 'daten', 'backups')));
    expect(readdirSync(copy).length).toBe(1);
    // Ziel nicht beschreibbar (Datei statt Ordner) → Speichern klappt trotzdem.
    const broken = createPlannerServer({ dataDir: join(dir, 'daten2'), password: 'geheim', scheduler: false, backupCopyDir: join(dir, 'datei') });
    writeFileSync(join(dir, 'datei'), 'kein Ordner');
    await new Promise((ok) => broken.listen(0, '127.0.0.1', ok));
    const u2 = `http://127.0.0.1:${broken.address().port}`;
    const l2 = await fetch(`${u2}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'geheim' }) });
    const c2 = l2.headers.get('set-cookie').split(';')[0];
    const p2 = (revision) => fetch(`${u2}/api/state`, { method: 'PUT', headers: { Cookie: c2, 'Content-Type': 'application/json' }, body: JSON.stringify({ state: state(), revision }) });
    expect((await p2(0)).status).toBe(200);
    expect((await p2(1)).status).toBe(200);
    await new Promise((ok) => srv.close(ok));
    await new Promise((ok) => broken.close(ok));
  });
});
