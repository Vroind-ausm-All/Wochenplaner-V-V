// Erzeugt die PNG-Icons für Android/iOS aus public/icon.svg (einmalig, Ergebnis liegt im Repo).
// Aufruf: node scripts/make-icons.cjs   (nutzt das vorinstallierte Playwright/Chromium)
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

(async () => {
  const svg = readFileSync(join(__dirname, '..', 'public', 'icon.svg'), 'utf8');
  const browser = await chromium.launch();
  for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [180, 'apple-touch-icon.png', 0]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<style>html,body{margin:0;background:#608369}svg{width:${size - pad * 2}px;height:${size - pad * 2}px;margin:${pad}px;display:block}</style>${svg}`);
    await page.screenshot({ path: join(__dirname, '..', 'public', name) });
    await page.close();
  }
  await browser.close();
})();
