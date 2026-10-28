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

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * @param {{ dataDir: string, password: string, distDir?: string, log?: (msg: string) => void }} opts
 */
export function createPlannerServer({ dataDir, password, distDir, log = () => {} }) {
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

  function broadcast() {
    const msg = `event: update\ndata: ${JSON.stringify({ revision: store.revision })}\n\n`;
    for (const res of clients) res.write(msg);
  }

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
        if (size > MAX_BODY) {
          fail(Object.assign(new Error('zu groß'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          fail(Object.assign(new Error('ungültiges JSON'), { status: 400 }));
        }
      });
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

    if (!authed(req)) return send(res, 401, { error: 'Bitte anmelden' });

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
  server.on('close', () => clients.forEach((c) => c.end()));
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
