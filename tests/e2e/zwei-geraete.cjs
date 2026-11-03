const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const repo = require('node:path').resolve(__dirname, '../..');
const OUT = (process.env.E2E_SHOTS || require('node:os').tmpdir()) + '/';
const results = [];
const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const data = mkdtempSync(join(tmpdir(), 'wir-e2e-'));
  const srv = spawn('node', ['server/server.mjs'], { cwd: repo, env: { ...process.env, PORT: '8790', WIR_PASSWORD: 'unser-passwort', WIR_DATA: data } });
  srv.stdout.on('data', () => {}); srv.stderr.on('data', (d) => process.stderr.write(d));
  await wait(800);
  const base = 'http://127.0.0.1:8790/';
  const browser = await chromium.launch();
  const errors = [];
  const device = async (name, viewport, touch) => {
    const c = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch && viewport.width < 500, locale: 'de-DE' });
    await c.route('https://api.open-meteo.com/**', (r) => r.abort());
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(`${name}: ${e}`));
    await p.goto(base);
    return { c, p };
  };
  const shopping = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('wir-wochenplaner-v1')).shopping.map((x) => `${x.name}${x.done ? '✓' : ''}`).sort());
  const login = async (p) => {
    const sheet = p.locator('[role=dialog]', { hasText: 'Familienplan verbinden' });
    await sheet.waitFor({ timeout: 5000 });
    await sheet.locator('input[type=password]').fill('falsch');
    await sheet.locator('button', { hasText: 'Verbinden' }).click();
    await p.locator('text=Passwort stimmt nicht').waitFor({ timeout: 3000 });
    await sheet.locator('input[type=password]').fill('unser-passwort');
    await sheet.locator('button', { hasText: 'Verbinden' }).click();
    await sheet.waitFor({ state: 'hidden', timeout: 5000 });
  };
  const addItem = async (p, name) => {
    await p.locator('.rail__btn', { hasText: 'Einkauf' }).click();
    await p.locator('input[placeholder="Was fehlt?"]').fill(name);
    await p.locator('button', { hasText: '+ Hinzufügen' }).click();
  };

  // Tablet zuerst: leerer Server übernimmt dessen Stand
  const tab = await device('Tablet', { width: 1080, height: 1920 }, true);
  await tab.p.waitForTimeout(800);
  await login(tab.p);
  await tab.p.waitForTimeout(800);
  ok('Tablet verbunden', (await tab.p.locator('.rail__foot').innerText()).includes('aktuell'), await tab.p.locator('.rail__foot').innerText());
  await addItem(tab.p, 'Reismehl');
  await tab.p.waitForTimeout(800);

  // Handy: übernimmt gemeinsamen Stand
  const phone = await device('Handy', { width: 390, height: 844 }, true);
  await phone.p.waitForTimeout(800);
  await login(phone.p);
  await phone.p.waitForTimeout(800);
  ok('Handy übernimmt Stand vom Tablet', (await shopping(phone.p)).includes('Reismehl'), JSON.stringify(await shopping(phone.p)));
  ok('Gerätestand vor Verbindung gesichert', await phone.p.evaluate(() => !!localStorage.getItem('wir-vor-sync')));

  // Live: Tablet ändert → Handy sieht es ohne Neuladen
  await addItem(tab.p, 'Teffmehl');
  let t0 = Date.now(), seen = false;
  while (Date.now() - t0 < 4000 && !(seen = (await shopping(phone.p)).includes('Teffmehl'))) await wait(100);
  ok('Live-Aktualisierung Tablet → Handy', seen, `${Date.now() - t0} ms`);

  // Offline-Phase: beide ändern gleichzeitig
  await phone.c.setOffline(true);
  await phone.p.waitForTimeout(300);
  await phone.p.locator('.rail__btn', { hasText: 'Einkauf' }).click();
  await phone.p.locator('.shop__item', { hasText: 'Reismehl' }).locator('input[type=checkbox]').check();
  await addItem(phone.p, 'Maistortillas');
  await phone.p.waitForTimeout(500);
  ok('Handy zeigt Offline-Status', /Offline/.test(await phone.p.locator('.rail__foot').textContent()), await phone.p.locator('.rail__foot').textContent());
  await addItem(tab.p, 'Kichererbsen');
  await tab.p.waitForTimeout(500);
  await phone.c.setOffline(false);
  t0 = Date.now();
  const want = ['Kichererbsen', 'Maistortillas', 'Reismehl✓', 'Teffmehl'];
  const has = (l) => want.every((w) => l.includes(w));
  let a = [], b = [];
  while (Date.now() - t0 < 12000) {
    a = await shopping(tab.p); b = await shopping(phone.p);
    if (has(a) && has(b)) break;
    await wait(200);
  }
  ok('Offline-Änderungen beider Geräte zusammengeführt', has(a) && has(b), `Tablet ${JSON.stringify(a)} | Handy ${JSON.stringify(b)} | ${Date.now() - t0} ms`);

  // Gerätelokale Einstellungen bleiben lokal
  await tab.p.evaluate(() => localStorage.setItem('wir-device-v1', JSON.stringify({ dimAfterMinutes: 5, nightMode: true, nightFrom: '22:00', nightTo: '06:00' })));
  ok('Kiosk-Einstellungen nicht im gemeinsamen Stand', !(await phone.p.evaluate(() => localStorage.getItem('wir-device-v1') || '')).includes('"dimAfterMinutes":5'));

  // Service Worker & Offline-Start
  await tab.p.reload();
  await tab.p.waitForTimeout(1500);
  const sw = await tab.p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r && !!r.active));
  ok('Service Worker aktiv', sw);
  await tab.p.reload(); await tab.p.waitForTimeout(1500);
  const cached = await tab.p.evaluate(async () => (await (await caches.open('wir-app-v3')).keys()).map((r) => new URL(r.url).pathname));
  ok('App-Dateien im Offline-Speicher', cached.some((u) => u.startsWith('/assets/') && u.endsWith('.js')) && cached.some((u) => u.endsWith('.css')), JSON.stringify(cached));
  await tab.c.setOffline(true);
  await tab.p.reload().catch(() => {});
  await tab.p.waitForTimeout(1500);
  ok('App startet offline', (await tab.p.locator('.rail__btn').count()) > 0 && (await shopping(tab.p)).includes('Kichererbsen'));
  await tab.p.screenshot({ path: OUT + 'sync-tablet-offline.png' });
  await tab.c.setOffline(false);

  // Server-Neustart überstehen: Daten und Anmeldung bleiben
  srv.kill(); await wait(500);
  const srv2 = spawn('node', ['server/server.mjs'], { cwd: repo, env: { ...process.env, PORT: '8790', WIR_PASSWORD: 'unser-passwort', WIR_DATA: data } });
  await wait(1200);
  await phone.p.reload(); await phone.p.waitForTimeout(1500);
  ok('Nach Server-Neustart weiter angemeldet', (await phone.p.locator('[role=dialog]', { hasText: 'Familienplan verbinden' }).count()) === 0 && has(await shopping(phone.p)));
  await phone.p.locator('.rail__btn', { hasText: 'Einstellungen' }).click().catch(async () => { await phone.p.locator('.rail').evaluate((el) => el.scrollLeft = 2000); await phone.p.locator('.rail__btn', { hasText: 'Einstellungen' }).click(); });
  await phone.p.waitForTimeout(500);
  await phone.p.locator('h3', { hasText: 'Alle Geräte verbinden' }).scrollIntoViewIfNeeded();
  await phone.p.screenshot({ path: OUT + 'sync-phone-settings.png' });

  console.log(results.join('\n'));
  console.log('PAGE ERRORS', errors);
  process.exitCode = results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0;
  await browser.close();
  srv2.kill();
})().catch((e) => { console.error(e); process.exit(1); });
