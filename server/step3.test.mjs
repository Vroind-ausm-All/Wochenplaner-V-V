import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sniff } from './photos.mjs';
import { createPlannerServer } from './server.mjs';

// Kleinstes gültiges PNG (1×1 Pixel)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('Fotoablage und Warnungen am Heimserver', () => {
  let server, base, cookie;
  const alertCalls = [];
  beforeAll(async () => {
    const alertFetch = async (url) => {
      alertCalls.push(String(url));
      return new Response(JSON.stringify({ alerts: [{ id: 1, severity: 'moderate', event_de: 'STURMBÖEN' }], location: { name: 'Berlin' } }), { headers: { 'Content-Type': 'application/json' } });
    };
    server = createPlannerServer({ dataDir: mkdtempSync(join(tmpdir(), 'wir-s3-')), password: 'pw', scheduler: false, alertFetch });
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${server.address().port}`;
    cookie = (await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"password":"pw"}' })).headers.get('set-cookie').split(';')[0];
  });
  afterAll(() => new Promise((ok) => server.close(ok)));
  const api = (path, init = {}) => fetch(base + path, { ...init, headers: { Cookie: cookie, ...(init.headers || {}) } });

  it('erkennt Bildformate am Inhalt', () => {
    expect(sniff(PNG)).toEqual({ ext: 'png', type: 'image/png' });
    expect(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ ext: 'jpg', type: 'image/jpeg' });
    expect(sniff(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });

  it('nimmt Fotos an, listet und liefert sie aus und löscht sie wieder', async () => {
    const r = await api('/api/photos?w=1&h=1', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: PNG });
    expect(r.status).toBe(200);
    const p = await r.json();
    expect(p).toMatchObject({ ext: 'png', w: 1, h: 1, size: PNG.length });
    const list = await (await api('/api/photos')).json();
    expect(list.photos.map((x) => x.id)).toEqual([p.id]);
    const img = await api(`/api/photos/${p.id}`);
    expect(img.headers.get('content-type')).toBe('image/png');
    expect(img.headers.get('cache-control')).toContain('immutable');
    expect(Buffer.from(await img.arrayBuffer()).equals(PNG)).toBe(true);
    expect((await fetch(`${base}/api/photos/${p.id}`)).status).toBe(401); // nur mit Anmeldung
    expect((await api(`/api/photos/${p.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await api(`/api/photos/${p.id}`)).status).toBe(404);
  });

  it('lehnt Nicht-Bilder und falsche Typen ab', async () => {
    expect((await api('/api/photos', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: '<svg/>' })).status).toBe(415);
    expect((await api('/api/photos', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: PNG })).status).toBe(415);
    expect((await api('/api/photos', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: Buffer.alloc(9 * 1024 * 1024, 0xff) })).status).toBe(413);
  });

  it('meldet neue Fotos an verbundene Geräte', async () => {
    const ctrl = new AbortController();
    const res = await api('/api/events', { signal: ctrl.signal });
    const reader = res.body.getReader();
    let text = '';
    const read = async (until) => {
      while (!text.includes(until)) text += new TextDecoder().decode((await reader.read()).value);
    };
    await read('event: hello');
    await api('/api/photos', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: PNG });
    await read('event: photos');
    ctrl.abort();
  });

  it('reicht Wetterwarnungen durch und speichert sie kurz zwischen', async () => {
    const j = await (await api('/api/alerts?lat=52.52&lon=13.4')).json();
    expect(j.alerts[0].event_de).toBe('STURMBÖEN');
    await api('/api/alerts?lat=52.52&lon=13.4');
    expect(alertCalls).toEqual(['https://api.brightsky.dev/alerts?lat=52.52&lon=13.4']);
    expect((await api('/api/alerts?lat=x&lon=1')).status).toBe(400);
  });
});
