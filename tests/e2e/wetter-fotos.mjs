import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPlannerServer } from '../../server/server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const OUT = (process.env.E2E_SHOTS || tmpdir()) + '/';
const results = [];
const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (n) => iso(new Date(Date.now() + n * 864e5));
const RAIN = day(2);

function forecast() {
  const days = Array.from({ length: 10 }, (_, i) => day(i));
  return {
    current: { temperature_2m: 12, weather_code: 2, is_day: 1, wind_speed_10m: 30 },
    daily: { time: days, weather_code: days.map((d) => (d === RAIN ? 63 : 1)), temperature_2m_max: days.map(() => 14), temperature_2m_min: days.map(() => 6), precipitation_probability_max: days.map((d) => (d === RAIN ? 90 : 5)), sunrise: days.map((d) => `${d}T07:05`), sunset: days.map((d) => `${d}T16:35`) },
    hourly: (() => {
      const time = days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${pad(h)}:00`));
      const wet = (t) => t.startsWith(RAIN) && +t.slice(11, 13) >= 8 && +t.slice(11, 13) < 18;
      return { time, temperature_2m: time.map(() => 11), weather_code: time.map((t) => (wet(t) ? 63 : 1)), precipitation_probability: time.map((t) => (wet(t) ? 85 : 5)) };
    })(),
  };
}
const alerts = () => ({
  alerts: [{ id: 7, alert_id: 'dwd-1', status: 'actual', severity: 'moderate', event_de: 'STURMBÖEN', headline_de: 'Amtliche WARNUNG vor STURMBÖEN', description_de: 'Es treten Sturmböen um 75 km/h auf.', instruction_de: 'Achten Sie besonders auf herabstürzende Äste.', onset: new Date(Date.now() - 3600e3).toISOString(), expires: new Date(Date.now() + 5 * 3600e3).toISOString() }],
  location: { name: 'Berlin' },
});

const server = createPlannerServer({ dataDir: mkdtempSync(join(tmpdir(), 'wir-e2e3-')), password: 'pw', distDir: fileURLToPath(new URL('../../dist', import.meta.url)) });
await new Promise((r) => server.listen(8797, '127.0.0.1', r));
const browser = await chromium.launch();
const errors = [];
const mkCtx = async (viewport) => {
  const c = await browser.newContext({ viewport, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  await c.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: forecast() }));
  await c.route('https://api.brightsky.dev/**', (r) => r.fulfill({ json: alerts(), headers: { 'Access-Control-Allow-Origin': '*' } }));
  return c;
};
// Testfotos erzeugen
const gen = await browser.newPage({ viewport: { width: 900, height: 600 } });
const shots = [];
for (const [a, b] of [['#e2a66f', '#608369'], ['#6a7fb0', '#f5e6df']]) {
  await gen.setContent(`<div style="width:900px;height:600px;background:linear-gradient(135deg,${a},${b});display:grid;place-items:center;font:700 120px sans-serif;color:#fff">WIR</div>`);
  shots.push(await gen.screenshot({ type: 'jpeg', quality: 80 }));
}
await gen.close();

const ctx = await mkCtx({ width: 1080, height: 1920 });
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto('http://127.0.0.1:8797/');
const login = p.locator('[role=dialog]', { hasText: 'Familienplan verbinden' });
await login.locator('input[type=password]').fill('pw');
await login.locator('button', { hasText: 'Verbinden' }).click();
await login.waitFor({ state: 'hidden' });
await p.evaluate((date) => {
  const d = JSON.parse(localStorage.getItem('wir-wochenplaner-v1'));
  d.events.push({ id: 'walk', title: 'Spaziergang am See', date, time: '10:00', duration: 45, category: 'Wir', owner: 'Beide', allDay: false, repeat: 'none', reminder: 'none' });
  localStorage.setItem('wir-wochenplaner-v1', JSON.stringify(d));
  const m = JSON.parse(localStorage.getItem('wir-sync-v1')); m.pending = true; localStorage.setItem('wir-sync-v1', JSON.stringify(m));
  localStorage.removeItem('wir-weather-cache');
}, RAIN);
await p.reload();
await p.waitForTimeout(1500);

// Warnung
const banner = p.locator('.alert-banner', { hasText: 'Sturmböen' });
ok('Warnbanner sichtbar', (await banner.count()) === 1, (await banner.innerText().catch(() => '')).replace(/\n/g, ' '));
await p.screenshot({ path: OUT + 's3-home.png' });
await banner.click();
const sheet = p.locator('[role=dialog]', { hasText: 'Amtliche WARNUNG' });
ok('Warnung mit Verhaltenshinweis', (await sheet.innerText()).includes('herabstürzende Äste'));
await p.keyboard.press('Escape');

// Wetter-Check
const check = p.locator('.wx-check__item', { hasText: 'Spaziergang am See' });
ok('Wetter-Check meldet Regen', (await check.count()) === 1 && (await check.innerText()).includes('85 % Regen'), (await check.innerText().catch(() => '')).replace(/\n/g, ' | '));
const pin = await p.evaluate(() => 1);
const move = check.locator('button', { hasText: 'verschieben' });
const label = await move.innerText().catch(() => '');
await move.click();
await p.waitForTimeout(500);
const moved = await p.evaluate(() => JSON.parse(localStorage.getItem('wir-wochenplaner-v1')).events.find((e) => e.id === 'walk'));
ok('Spaziergang auf trockenen Zeitpunkt verschoben', !(moved.date === RAIN && moved.time === '10:00') && label.includes('verschieben'), `${label} → ${moved.date} ${moved.time}`);
ok('Hinweis verschwindet', (await p.locator('.wx-check__item', { hasText: 'Spaziergang am See' }).count()) === 0);

// Fotos hochladen
await p.locator('.rail__btn', { hasText: 'Einstellungen' }).click();
await p.locator('h3', { hasText: 'Fotos & Bildschirmschoner' }).scrollIntoViewIfNeeded();
await p.locator('[data-testid=photo-input]').setInputFiles(shots.map((b, i) => ({ name: `foto${i}.jpg`, mimeType: 'image/jpeg', buffer: b })));
await p.locator('text=2 Fotos').waitFor({ timeout: 10000 }).catch(() => {});
ok('Zwei Fotos hochgeladen', (await p.locator('.photo-thumb img').count()) === 2);
await p.screenshot({ path: OUT + 's3-photos.png' });
await p.locator('button', { hasText: 'Vorschau' }).click();
await p.waitForTimeout(2200);
ok('Bildschirmschoner zeigt Foto + Uhr', (await p.locator('.ss .ss__img').count()) >= 1 && (await p.locator('.ss__clock').count()) === 1);
await p.screenshot({ path: OUT + 's3-screensaver.png' });
await p.locator('.ss').dispatchEvent('pointerdown');
await p.waitForTimeout(1200);
ok('Antippen schließt ihn', (await p.locator('.ss').count()) === 0);

// Zweites Gerät sieht die Fotos (Hochkant) + automatischer Start nach Inaktivität
const ctx2 = await mkCtx({ width: 1920, height: 1080 });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push('2: ' + String(e)));
await p2.goto('http://127.0.0.1:8797/');
const l2 = p2.locator('[role=dialog]', { hasText: 'Familienplan verbinden' });
await l2.locator('input[type=password]').fill('pw');
await l2.locator('button', { hasText: 'Verbinden' }).click();
await l2.waitFor({ state: 'hidden' });
await p2.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('wir-device-v1') || '{}');
  localStorage.setItem('wir-device-v1', JSON.stringify({ ...d, screensaverAfter: 0.05, slideSeconds: 8 }));
});
await p2.reload();
await p2.locator('.ss .ss__img').first().waitFor({ timeout: 12000 }).catch(() => {});
ok('Bildschirmschoner startet automatisch mit Fotos vom anderen Gerät', (await p2.locator('.ss .ss__img').count()) >= 1);
await p2.screenshot({ path: OUT + 's3-screensaver-landscape.png' });
await p2.evaluate(() => window.dispatchEvent(new Event('wir:wake')));
await p2.waitForTimeout(1200);
ok('Erinnerung (wir:wake) beendet ihn', (await p2.locator('.ss').count()) === 0);

// Ohne Server: lokale Fotos
const ctx3 = await mkCtx({ width: 1080, height: 1920 });
const p3 = await ctx3.newPage();
p3.on('pageerror', (e) => errors.push('3: ' + String(e)));
await p3.goto((process.env.E2E_BASE || 'http://localhost:4173/'));
await p3.locator('.rail__btn', { hasText: 'Einstellungen' }).click();
await p3.locator('[data-testid=photo-input]').setInputFiles([{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: shots[0] }]);
await p3.locator('text=1 Fotos').waitFor({ timeout: 10000 }).catch(() => {});
ok('Lokal (ohne Server) gespeichert', (await p3.locator('.photo-thumb img').count()) === 1);
await p3.reload();
await p3.locator('.rail__btn', { hasText: 'Einstellungen' }).click();
await p3.waitForTimeout(800);
ok('Lokale Fotos bleiben nach Neuladen', (await p3.locator('.photo-thumb img').count()) === 1);

console.log(results.join('\n'));
console.log('PAGE ERRORS', errors);
await browser.close();
server.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
