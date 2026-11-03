// Browser-Gesamttests: startet die gebaute App (vite preview) und führt alle Abläufe nacheinander aus.
// Voraussetzung: `npm run build`. Aufruf: `npm run test:e2e` (einzeln: `node tests/e2e/run.mjs startseite`).
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../..', import.meta.url));
const only = process.argv[2];
const scripts = readdirSync(here)
  .filter((f) => /\.(c|m)js$/.test(f) && f !== 'run.mjs')
  .filter((f) => !only || f.startsWith(only))
  .sort();

// vite direkt starten (nicht über npx), damit sich der Prozess am Ende sicher beenden lässt.
const preview = spawn(process.execPath, [`${root}/node_modules/vite/bin/vite.js`, 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore' });
const stop = () => preview.kill();
process.on('exit', stop);

// Warten, bis die Vorschau antwortet.
for (let i = 0; ; i++) {
  try {
    if ((await fetch('http://localhost:4173/')).ok) break;
  } catch {
    /* noch nicht bereit */
  }
  if (i > 60) throw new Error('vite preview startet nicht – vorher „npm run build“ ausführen?');
  await new Promise((r) => setTimeout(r, 500));
}

// Testskripte rechnen in derselben Zeitzone wie der Browser (Europe/Berlin) – sonst kippt das Datum um Mitternacht.
let failed = 0;
for (const f of scripts) {
  console.log(`\n▸ ${f}`);
  const code = await new Promise((done) => spawn(process.execPath, [`${here}/${f}`], { cwd: root, stdio: 'inherit', env: { ...process.env, TZ: 'Europe/Berlin', E2E_BASE: 'http://localhost:4173/' } }).on('exit', done));
  if (code !== 0) {
    failed++;
    console.log(`✗ ${f} (Exit ${code})`);
  }
}
stop();
console.log(failed ? `\n${failed} von ${scripts.length} Abläufen fehlgeschlagen` : `\nAlle ${scripts.length} Abläufe bestanden`);
process.exit(failed ? 1 : 0);
