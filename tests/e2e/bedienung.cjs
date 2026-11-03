const { chromium } = require('playwright');
const base = (process.env.E2E_BASE || 'http://localhost:4173/');
const OUT = (process.env.E2E_SHOTS || require('node:os').tmpdir()) + '/';
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`);

(async () => {
  const browser = await chromium.launch();
  const c = await browser.newContext({ viewport: { width: 1080, height: 1920 }, hasTouch: true, locale: 'de-DE' });
  await c.route('https://api.open-meteo.com/**', (r) => r.abort());
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(800);
  const data = () => p.evaluate(() => JSON.parse(localStorage.getItem('wir-wochenplaner-v1')));
  const nav = (label) => p.locator('.rail__btn', { hasText: label }).click();
  const today = await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });

  await nav('Kalender');
  await p.waitForTimeout(600);
  const before = (await data()).events.length;

  // 1) Maus-Drag: Baustein „Date Night“ auf Mittwoch 19:00 ziehen
  const tpl = p.locator('.tpl', { hasText: 'Date Night' }).first();
  const slot = p.locator(`[aria-label$=" 19:00 Uhr"]`).nth(2);
  await slot.scrollIntoViewIfNeeded();
  const a = await tpl.boundingBox(), b = await slot.boundingBox();
  await p.mouse.move(a.x + 20, a.y + 20);
  await p.mouse.down();
  await p.mouse.move(a.x + 40, a.y + 10, { steps: 4 });
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
  await p.waitForTimeout(150);
  await p.mouse.up();
  await p.waitForTimeout(400);
  let d = await data();
  const dn = d.events.find((e) => e.title === 'Date Night');
  ok('Maus-Drag Baustein → Slot', d.events.length === before + 1 && dn?.time === '19:00', JSON.stringify(dn && { date: dn.date, time: dn.time }));

  // 2) Click&Drop: „Sport“ antippen, dann Freitag 07:00 antippen
  await p.locator('.tpl', { hasText: 'Sport' }).first().click();
  ok('Banner bei Auswahl', await p.locator('.pick-banner').isVisible());
  const fri = p.locator(`[aria-label$=" 07:00 Uhr"]`).nth(4);
  await fri.scrollIntoViewIfNeeded();
  await fri.click();
  await p.waitForTimeout(300);
  d = await data();
  const sport = d.events.find((e) => e.title === 'Sport');
  ok('Click&Drop Baustein → Slot', sport?.time === '07:00', JSON.stringify(sport && { date: sport.date, owner: sport.owner }));

  // 3) Rückgängig über Toast
  await p.locator('.toast .btn', { hasText: 'Rückgängig' }).click();
  await p.waitForTimeout(200);
  ok('Rückgängig', !(await data()).events.some((e) => e.title === 'Sport'));

  // 4) Termin per Maus verschieben (Date Night → Donnerstag 20:00)
  const block = p.locator('.ev-block', { hasText: 'Date Night' });
  const target = p.locator(`[aria-label$=" 20:00 Uhr"]`).nth(3);
  const bb = await block.boundingBox(), tb = await target.boundingBox();
  await p.mouse.move(bb.x + 20, bb.y + 15);
  await p.mouse.down();
  await p.mouse.move(bb.x + 30, bb.y + 25, { steps: 3 });
  await p.mouse.move(tb.x + tb.width / 2, tb.y + 5, { steps: 20 });
  await p.mouse.up();
  await p.waitForTimeout(300);
  d = await data();
  const moved = d.events.find((e) => e.title === 'Date Night');
  ok('Termin verschieben', moved.time === '20:00' && moved.date !== dn.date, JSON.stringify({ from: dn.date, date: moved.date, time: moved.time }));

  // 5) Touch-Drag (lang drücken) über CDP: „Spaziergang“ auf Samstag 10:00
  const cdp = await c.newCDPSession(p);
  const sat = p.locator(`[aria-label$=" 10:00 Uhr"]`).nth(5);
  await sat.scrollIntoViewIfNeeded();
  await p.locator('.tpl', { hasText: 'Spaziergang' }).first().scrollIntoViewIfNeeded();
  const walk = await p.locator('.tpl', { hasText: 'Spaziergang' }).first().boundingBox();
  const sb = await sat.boundingBox();
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(walk.x + 20, walk.y + 20) });
  await p.waitForTimeout(350);
  for (let i = 1; i <= 15; i++) {
    const x = walk.x + 20 + ((sb.x + sb.width / 2 - walk.x - 20) * i) / 15, y = walk.y + 20 + ((sb.y + sb.height / 2 - walk.y - 20) * i) / 15;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x, y) });
    await p.waitForTimeout(16);
  }
  console.log('touch ghost', await p.locator('.drag-ghost').count(), 'over', await p.locator('.is-over').count(), 'picked', await p.locator('.pick-banner').count(), JSON.stringify(walk), JSON.stringify(sb));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(400);
  d = await data();
  const w = d.events.find((e) => e.title === 'Spaziergang' && e.time === '10:00');
  ok('Touch-Drag (Halten) Baustein → Slot', !!w, JSON.stringify(w && { date: w.date }));

  // 6) Serientermin verschieben fragt nach
  const ser = d.events.find((e) => e.repeat === 'weekly');
  if (ser) {
    await p.locator('.ev-block', { hasText: '17:00' }).first().click();
    await p.locator(`[aria-label$=" 18:00 Uhr"]`).nth(6).click();
    await p.waitForTimeout(300);
    const dialog = p.locator('[role=dialog]', { hasText: 'Serientermin' });
    ok('Serien-Rückfrage', await dialog.isVisible());
    await dialog.locator('button', { hasText: 'Nur diesen Termin' }).click();
    await p.waitForTimeout(300);
    d = await data();
    ok('Nur ein Vorkommen gelöst', d.events.filter((e) => e.title === ser.title).length === 2 && d.events.find((e) => e.id === ser.id).exDates.length === 1);
  }

  // 7) Monat: Baustein auf Tag ablegen (Click&Drop) nimmt Standardzeit
  await p.locator('.segmented button', { hasText: 'Monat' }).click();
  await p.waitForTimeout(400);
  await p.locator('.tpl', { hasText: 'Putzen' }).first().click();
  await p.locator('.month__cell').nth(20).click();
  await p.waitForTimeout(300);
  ok('Monat: Click&Drop auf Tag', (await data()).events.some((e) => e.title === 'Putzen' && e.time === '11:00'));

  // 8) Essen: Rezept antippen → Abend antippen; Einkaufsliste füllt sich
  await nav('Essen');
  await p.waitForTimeout(500);
  const shopBefore = (await data()).shopping.length;
  await p.locator('.dish-card__pick').nth(2).click();
  await p.locator('.mealweek .mealslot').filter({ hasText: 'Abend' }).nth(3).click();
  await p.waitForTimeout(300);
  d = await data();
  const plannedDays = Object.keys(d.meals).filter((k) => d.meals[k].Abend);
  ok('Click&Drop Rezept → Abend', plannedDays.length === 1, plannedDays.join(','));
  ok('Einkaufsliste aus Rezept', d.shopping.length > shopBefore, `${shopBefore} → ${d.shopping.length}`);

  // 9) Umgekehrt: erst leeren Platz antippen, dann Rezept
  await p.locator('.mealweek .mealslot:not(.is-filled)').first().click();
  ok('Ziel-Banner', await p.locator('.pick-banner', { hasText: 'jetzt Rezept antippen' }).isVisible());
  await p.locator('.dish-card__pick').nth(0).click();
  await p.waitForTimeout(300);
  d = await data();
  ok('Ziel zuerst, dann Rezept', Object.values(d.meals).filter((m) => m.Abend).length === 2);

  // 10) Mahlzeit per Maus auf anderen Tag ziehen
  const meal = p.locator('.mealweek .mealslot.is-filled .mealslot__pick').first();
  const free = p.locator('.mealweek .mealslot:not(.is-filled)').last();
  const mb = await meal.boundingBox(), fb = await free.boundingBox();
  await p.mouse.move(mb.x + 10, mb.y + 10); await p.mouse.down();
  await p.mouse.move(mb.x + 20, mb.y + 20, { steps: 3 });
  await p.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2, { steps: 15 });
  await p.mouse.up(); await p.waitForTimeout(300);
  d = await data();
  ok('Mahlzeit verschieben', Object.values(d.meals).filter((m) => m.Abend || m.Mittag).length === 2);

  // 11) Rezeptdetails, Grundrezept-Link
  await p.locator('.cuisine', { hasText: 'Italienisch' }).click();
  await p.locator('.dish-card', { hasText: 'Pasta alla Norma' }).locator('.dish-card__info').click();
  await p.waitForTimeout(300);
  await p.locator('[role=dialog] button', { hasText: 'Frischer Pastateig' }).click();
  await p.waitForTimeout(300);
  ok('Grundrezept öffnet', await p.locator('[role=dialog] h2', { hasText: 'Frischer Pastateig' }).isVisible());
  await p.keyboard.press('Escape');

  // 12) Begleiter: Vorschlag einplanen
  await nav('Wir-Zeit');
  await p.waitForTimeout(500);
  const n = (await data()).events.length;
  await p.locator('.sugg-row button', { hasText: 'Einplanen' }).first().click();
  await p.waitForTimeout(300);
  ok('Begleiter-Vorschlag einplanen', (await data()).events.length === n + 1 && (await data()).events.some((e) => e.origin === 'companion'));
  await p.screenshot({ path: OUT + 'i-companion.png' });

  // 13) Nachtmodus
  await p.locator('[aria-label="Tag/Nacht umschalten"]').click();
  await nav('Kalender'); await p.waitForTimeout(500);
  await p.locator('.segmented button', { hasText: 'Woche' }).click(); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + 'i-night-week.png' });

  console.log(results.join('\n'));
  console.log('PAGE ERRORS', errors);
  process.exitCode = results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0;
  await browser.close();
})();
