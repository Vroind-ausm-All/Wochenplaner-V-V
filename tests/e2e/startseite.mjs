// Startseite zum Mitmachen: Schnell-Eintrag je Spalte, Umverteilen per Antippen/Ziehen,
// wechselnde Routinen, Kind-Spalte, Wochenkompass und die Tablet-Anbindung (Fully Kiosk, nachgebildet).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.env.E2E_BASE || 'http://localhost:4173/';
const results = [];
const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const errors = [];

const browser = await chromium.launch();
const c = await browser.newContext({ viewport: { width: 1080, height: 1920 }, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
await c.route('https://api.open-meteo.com/**', (r) => r.abort());
await c.route('https://api.brightsky.dev/**', (r) => r.abort());
// Fully Kiosk Browser nachbilden: Aufrufe der JavaScript-Schnittstelle mitschreiben.
await c.addInitScript(() => {
  window.__fully = [];
  window.fully = {
    turnScreenOn: () => window.__fully.push('on'),
    turnScreenOff: (keep) => window.__fully.push(`off:${keep}`),
    setScreenBrightness: (v) => window.__fully.push(`hell:${v}`),
    bind: (ev) => window.__fully.push(`bind:${ev}`),
  };
});
const p = await c.newPage();
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(base);
await p.evaluate(() => localStorage.clear());

// Startdaten: Namen, eine wechselnde Wochen-Routine (heute ist Woche 2 → Person B dran), eine feste Aufgabe.
await p.evaluate(() => {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Ab 20:30 Uhr zeigt die Startseite schon den nächsten Tag – die Testdaten folgen dem.
  const t = new Date();
  if (t.getHours() * 60 + t.getMinutes() >= 20 * 60 + 30) t.setDate(t.getDate() + 1);
  const last = new Date(t);
  last.setDate(t.getDate() - 7);
  const data = {
    events: [], shopping: [], inventory: [], meals: {}, documents: [], baby: [], checks: [], checkins: {}, favoriteAffirmations: [], favoriteRecipes: [], dismissed: {}, calendars: [],
    tasks: [
      { id: 'muell', title: 'Müll rausbringen', owner: 'Person A', due: iso(last), repeat: 'weekly', rotate: true, doneDates: [], notes: '' },
      { id: 'arzt', title: 'Kinderarzt anrufen', owner: 'Person A', due: iso(t), repeat: 'none', doneDates: [], notes: '' },
    ],
    settings: { personA: 'Vera', personB: 'Valentin' },
  };
  localStorage.setItem('wir-wochenplaner-v1', JSON.stringify(data));
});
await p.reload();
await p.waitForTimeout(900);
const data = () => p.evaluate(() => JSON.parse(localStorage.getItem('wir-wochenplaner-v1')));
const col = (name) => p.locator(`.who__col[aria-label="Übernimmt: ${name}"]`);

// 1) Wechselnde Routine landet heute bei Valentin
ok('Wechsel-Routine bei der richtigen Person', (await col('Valentin').innerText()).includes('Müll rausbringen'));

// 2) Schnell-Eintrag über „+“ in Valentins Spalte
await p.locator('button[aria-label="Neu für Valentin"]').click();
await p.locator('input[placeholder="z. B. Kinderarzt anrufen"]').fill('Paket abholen');
await p.locator('[role=dialog] button', { hasText: 'Eintragen' }).click();
await p.waitForTimeout(400);
const paket = (await data()).tasks.find((t) => t.title === 'Paket abholen');
ok('„+“ legt Aufgabe für die Spalte an', paket?.owner === 'Person B', JSON.stringify(paket && { owner: paket.owner }));
ok('Neue Aufgabe erscheint in der Spalte', (await col('Valentin').innerText()).includes('Paket abholen'));

// 3) Termin über „+“ (Gemeinsam) mit Uhrzeit
await p.locator('button[aria-label="Neu für Gemeinsam"]').click();
await p.locator('[role=dialog] .segmented button', { hasText: 'Termin' }).click();
await p.locator('input[placeholder="z. B. Elternabend"]').fill('Elternabend');
await p.locator('[role=dialog] input[type=time]').fill('19:30');
await p.locator('[role=dialog] button', { hasText: 'Eintragen' }).click();
await p.waitForTimeout(400);
const abend = (await data()).events.find((e) => e.title === 'Elternabend');
ok('„+“ legt gemeinsamen Termin an', abend?.owner === 'Beide' && abend?.time === '19:30', JSON.stringify(abend && { owner: abend.owner, time: abend.time }));

// 4) Umverteilen per Antippen: Aufgabe auswählen, dann andere Spalte antippen
await p.locator('.who__task', { hasText: 'Kinderarzt anrufen' }).click({ position: { x: 120, y: 20 } });
ok('Antippen wählt die Aufgabe aus', await p.locator('.pick-banner').isVisible());
await col('Valentin').locator('.who__head').click();
await p.waitForTimeout(400);
ok('Aufgabe an Valentin übergeben', (await data()).tasks.find((t) => t.id === 'arzt').owner === 'Person B');
ok('Hinweis zur Übergabe', (await p.locator('.toast').innerText()).includes('Valentin'));

// 5) Einzelnes Vorkommen einer Routine übernehmen – die Regel bleibt
await p.locator('.who__task', { hasText: 'Müll rausbringen' }).click({ position: { x: 120, y: 20 } });
await col('Vera').locator('.who__head').click();
await p.waitForTimeout(400);
const muell = (await data()).tasks.find((t) => t.id === 'muell');
ok('Routine: nur heute übernommen', muell.rotate === true && Object.values(muell.ownerOn || {})[0] === 'Person A', JSON.stringify(muell.ownerOn));

// 6) Abhaken in der Spalte wählt nichts aus
await col('Valentin').locator('.who__task input[type=checkbox]').first().check();
await p.waitForTimeout(300);
ok('Abhaken ohne Auswahl', !(await p.locator('.pick-banner').isVisible()) && (await data()).tasks.some((t) => (t.doneDates || []).length));

// 7) Kind-Spalte nach Eintrag eines Namens
await p.locator('.rail__btn', { hasText: 'Einstellungen' }).click();
await p.locator('input[placeholder="leer lassen = keine eigene Spalte"]').fill('Mia');
await p.locator('.rail__btn', { hasText: 'Heute' }).click();
await p.waitForTimeout(600);
ok('Kind-Spalte erscheint', await col('Mia').isVisible());

// 8) Wochenkompass
await p.locator('.home__week .linklike, .compass-prompt').first().click();
await p.waitForTimeout(500);
const compass = p.locator('[role=dialog]', { hasText: 'Wochenkompass' });
ok('Wochenkompass öffnet', (await compass.textContent()).includes('Wer hat was getragen'));
await compass.locator('button', { hasText: 'Fertig' }).click();

// 9) Tablet-Anbindung: Helligkeit, Aufwachen, echtes Abschalten
const calls = () => p.evaluate(() => window.__fully);
ok('Fully: Ereignisse angemeldet', (await calls()).includes('bind:screenOn'));
await p.locator('button[aria-label="Tag/Nacht umschalten"]').click();
await p.waitForTimeout(300);
ok('Fully: nachts gedimmt', (await calls()).includes('hell:25'));
await p.locator('button[aria-label="Bildschirm dunkel"]').click();
await p.waitForTimeout(300);
ok('Fully: Bildschirm wirklich aus', (await calls()).includes('off:true'));
await p.evaluate(() => window.dispatchEvent(new Event('wir:wake')));
await p.waitForTimeout(900);
ok('Fully: Aufwecken schaltet ein', (await calls()).includes('on'), JSON.stringify(await calls()));
ok('Schwarze Fläche verschwindet', (await p.locator('.sleep.is-black').count()) === 0);

console.log(results.join('\n'));
console.log('PAGE ERRORS', errors);
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
