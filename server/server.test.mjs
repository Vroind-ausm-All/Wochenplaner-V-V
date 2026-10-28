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
