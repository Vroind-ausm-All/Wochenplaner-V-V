import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPlannerServer } from '../../server/server.mjs';

const OUT = (process.env.E2E_SHOTS || tmpdir()) + '/';
const results = [];
const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tomorrow = new Date(Date.now() + 864e5);
const t = `${tomorrow.getFullYear()}${pad(tomorrow.getMonth() + 1)}${pad(tomorrow.getDate())}`;
// Ferien: Montag bis Freitag der Woche von morgen – so hängt der Test nicht vom Datum ab.
const mon = new Date(tomorrow);
mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
const sat = new Date(mon);
sat.setDate(mon.getDate() + 5);
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

// Lokaler „Kita-/Dienstkalender“
const ics = createServer((req, res) => res.writeHead(200, { 'Content-Type': 'text/calendar' }).end([
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'UID:dienst', 'SUMMARY:Spätdienst', `DTSTART;TZID=Europe/Berlin:${t}T140000`, `DTEND;TZID=Europe/Berlin:${t}T220000`, 'LOCATION:Klinikum', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:ferien', 'SUMMARY:Herbstferien', `DTSTART;VALUE=DATE:${ymd(mon)}`, `DTEND;VALUE=DATE:${ymd(sat)}`, 'END:VEVENT',
  'END:VCALENDAR'].join('\r\n')));
await new Promise((r) => ics.listen(8795, '127.0.0.1', r));

const server = createPlannerServer({ dataDir: mkdtempSync(join(tmpdir(), 'wir-e2e2-')), password: 'pw', distDir: fileURLToPath(new URL('../../dist', import.meta.url)), icsAllowLoopback: true });
await new Promise((r) => server.listen(8796, '127.0.0.1', r));
const base = 'http://127.0.0.1:8796/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
await ctx.route('https://api.open-meteo.com/**', (r) => r.abort());
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(base);
const sheet = p.locator('[role=dialog]', { hasText: 'Familienplan verbinden' });
await sheet.locator('input[type=password]').fill('pw');
await sheet.locator('button', { hasText: 'Verbinden' }).click();
await sheet.waitFor({ state: 'hidden' });
const nav = (l) => p.locator('.rail__btn', { hasText: l }).click();

// Bundesland + Abo in den Einstellungen
await nav('Einstellungen');
await p.locator('select').first().selectOption('BY');
await p.locator('input[placeholder^="Name, z. B."]').fill('Dienstplan Vera');
await p.locator('input[placeholder^="Kalender-Adresse"]').fill('webcal://127.0.0.1:8795/dienst.ics'.replace('webcal://', 'http://'));
await p.locator('button', { hasText: '+ Abonnieren' }).click();
await p.locator('.cal-sub', { hasText: 'Dienstplan Vera' }).locator('text=/\\d+ Termine/').waitFor({ timeout: 8000 });
ok('Abo geladen', true, await p.locator('.cal-sub').innerText().then((s) => s.split('\n').slice(0, 3).join(' | ')));
await p.locator('h3', { hasText: 'Kalender & Feiertage' }).scrollIntoViewIfNeeded();
await p.screenshot({ path: OUT + 's2-settings-calendars.png' });
const feedUrl = await p.locator('.feed-url').innerText();
ok('Feed-Adresse angezeigt', /\/api\/feed\/.+\.ics$/.test(feedUrl), feedUrl);

// Monat November: Feiertag (Allerheiligen, BY)
await nav('Kalender');
await p.locator('.segmented button', { hasText: 'Monat' }).click();
for (let i = 0, diff = 10 - new Date().getMonth(); i < Math.abs(diff); i++) {
  await p.locator(`.cal__bar button[aria-label="${diff > 0 ? 'Weiter' : 'Zurück'}"]`).click();
  await p.waitForTimeout(250);
}
await p.waitForTimeout(400);
ok('Feiertag sichtbar (Allerheiligen)', (await p.locator('.ext-chip.is-holiday', { hasText: 'Allerheiligen' }).count()) > 0);
// Woche von morgen: Abo-Termin + Ferien
await p.locator('.cal__bar button', { hasText: 'Heute' }).click();
await p.locator('.segmented button', { hasText: 'Woche' }).click();
if (tomorrow.getDay() === 1) await p.locator('button[aria-label="Weiter"]').click();
await p.waitForTimeout(600);
ok('Ferien als Ganztag sichtbar', (await p.locator('.ext-chip', { hasText: 'Herbstferien' }).count()) >= 3);
const block = p.locator('.ext-block', { hasText: 'Spätdienst' });
ok('Abo-Termin im Zeitraster', (await block.count()) === 1);
await p.screenshot({ path: OUT + 's2-week.png' });
await block.click();
const detail = p.locator('[role=dialog]', { hasText: 'Spätdienst' });
ok('Detailansicht mit Ort', (await detail.innerText()).includes('Klinikum'));
await detail.locator('button', { hasText: 'In eigenen Plan kopieren' }).click();
await p.waitForTimeout(400);
const own = await p.evaluate(() => JSON.parse(localStorage.getItem('wir-wochenplaner-v1')).events.find((e) => e.title === 'Spätdienst'));
ok('In eigenen Plan kopiert', !!own && own.time === '14:00' && own.duration === 480, JSON.stringify(own && { date: own.date, time: own.time }));
// Begleiter schlägt morgen Abend nichts vor (belegt)
await nav('Wir-Zeit');
await p.waitForTimeout(500);
const suggestions = await p.locator('.sugg-row:not(.sugg-row--meal)').allInnerTexts();
const meals = await p.locator('.sugg-row--meal').allInnerTexts();
ok('Begleiter erkennt vollen Tag → schnelles Essen', meals.some((m) => m.includes('Morgen')), JSON.stringify(meals.map((m) => m.split('\n').slice(1, 3).join(' ~ '))));
ok('Begleiter plant nicht in den Dienst', !suggestions.some((s) => /Morgen · (1[4-9]|2[01]):/.test(s)), JSON.stringify(suggestions.map((s) => s.split('\n').slice(0, 3).join(' ~ '))));

// Erinnerung: Termin in 15 Min. anlegen, sodass sie sofort fällig ist
while (new Date().getSeconds() < 2 || new Date().getSeconds() > 9) await wait(250);
await p.evaluate(() => {
  const pad = (n) => String(n).padStart(2, '0');
  const start = new Date(Date.now() + 15 * 60000);
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`, time = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const d = JSON.parse(localStorage.getItem('wir-wochenplaner-v1'));
  d.events.push({ id: 'rem1', title: 'Zahnarzt', date, time, duration: 45, category: 'Termin', owner: 'Person A', allDay: false, repeat: 'none', reminder: '15' });
  localStorage.setItem('wir-wochenplaner-v1', JSON.stringify(d));
  const m = JSON.parse(localStorage.getItem('wir-sync-v1')); m.pending = true; localStorage.setItem('wir-sync-v1', JSON.stringify(m));
});
await p.reload();
const rem = p.locator('.reminder', { hasText: 'Zahnarzt' });
await rem.waitFor({ timeout: 20000 }).catch(() => {});
ok('Erinnerung eingeblendet', (await rem.count()) === 1, (await rem.innerText().catch(() => '')).replace(/\n/g, ' | '));
await p.screenshot({ path: OUT + 's2-reminder.png' });
await rem.locator('button', { hasText: 'In 10 Min.' }).click({ timeout: 3000 }).catch(() => {});
await p.waitForTimeout(500);
ok('„In 10 Min.“ stellt zurück', (await rem.count()) === 0 && (await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('wir-reminders-snoozed') || '{}')).length)) === 1);
await p.reload(); await p.waitForTimeout(1500);
ok('Nach Neuladen nicht doppelt', (await p.locator('.reminder').count()) === 0);

// Feed enthält den Termin mit Alarm (Server hat den Stand per Sync)
await p.waitForTimeout(800);
const feed = await (await fetch(feedUrl)).text();
ok('Feed enthält Termin mit Alarm', feed.includes('SUMMARY:Zahnarzt') && feed.includes('TRIGGER:-PT15M'));

// Erinnerungs-Einstellungen
await nav('Einstellungen');
await p.locator('h3', { hasText: 'Erinnerungen – dieses Gerät' }).scrollIntoViewIfNeeded();
ok('Push-Knopf angeboten', (await p.locator('button', { hasText: 'Mitteilungen einschalten' }).count()) === 1);
await p.screenshot({ path: OUT + 's2-settings-reminders.png' });

console.log(results.join('\n'));
console.log('PAGE ERRORS', errors);
await browser.close();
server.close(); ics.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
