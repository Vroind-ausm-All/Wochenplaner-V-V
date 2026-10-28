import { useEffect, useState } from 'react';
import { updateDevice, useDevice } from '../../store/device';
import { useStore } from '../../store/store';
import { useSync } from '../../store/sync';
import { Chips } from '../../ui/Segmented';
import { disablePush, enablePush, setReminderFor, testPush, usePush } from './push';

/** Erinnerungen: auf diesem Bildschirm und als Push aufs Handy. */
export function ReminderSettings() {
  const device = useDevice();
  const push = usePush();
  const connected = useSync((s) => s.connected);
  const { personA, personB } = useStore((s) => s.data.settings);
  const notify = useStore((s) => s.notify);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;

  return (
    <section className="card stack">
      <h3>Erinnerungen – dieses Gerät</h3>
      <p className="small muted">Pro Termin wählbar: 15 Minuten, 1 Stunde oder 1 Tag vorher (im Terminformular).</p>
      <div className="field">
        <span>Erinnerungen für</span>
        <Chips
          value={device.reminderFor}
          onChange={(v) => void setReminderFor(v)}
          options={[
            { value: 'Alle', label: 'Alle' },
            { value: 'Person A', label: personA },
            { value: 'Person B', label: personB },
          ]}
        />
      </div>
      <div className="chips">
        <button className="chip" aria-pressed={device.remindersOnScreen} onClick={() => updateDevice({ remindersOnScreen: !device.remindersOnScreen })}>
          🖼 Auf diesem Bildschirm einblenden
        </button>
        <button className="chip" aria-pressed={device.reminderSound} onClick={() => updateDevice({ reminderSound: !device.reminderSound })}>
          🔉 Mit sanftem Ton
        </button>
      </div>

      <h3 style={{ marginTop: 6 }}>Push-Mitteilungen aufs Handy</h3>
      {!connected ? (
        <p className="small muted">Push-Mitteilungen verschickt der Heimserver – bitte zuerst oben „Alle Geräte verbinden“.</p>
      ) : !push.supported ? (
        <p className="small muted">
          {!window.isSecureContext
            ? 'Browser erlauben Push nur über HTTPS. Mit Tailscale (siehe docs/HEIMSERVER.md) bekommt euer Heimserver eine HTTPS-Adresse.'
            : ios && !standalone
              ? 'Auf iPhone/iPad funktionieren Mitteilungen nur, wenn die App auf dem Home-Bildschirm installiert ist (Teilen → Zum Home-Bildschirm) – dann hier erneut öffnen.'
              : 'Dieser Browser unterstützt keine Push-Mitteilungen.'}
        </p>
      ) : push.subscribed ? (
        <div className="row wrap">
          <span>✓ Dieses Gerät bekommt Mitteilungen – auch wenn die App geschlossen ist.</span>
          <button className="btn sm" onClick={() => testPush().then(() => notify('Test-Mitteilung verschickt'), (e) => notify((e as Error).message))}>
            Test senden
          </button>
          <button className="btn sm ghost" disabled={push.busy} onClick={() => void disablePush()}>
            Ausschalten
          </button>
        </div>
      ) : (
        <div className="row wrap">
          <button className="btn primary" disabled={push.busy} onClick={() => void enablePush()}>
            {push.busy ? 'Wird eingerichtet …' : '🔔 Mitteilungen einschalten'}
          </button>
          <span className="small muted">Der Browser fragt einmal um Erlaubnis.</span>
        </div>
      )}
      {push.error && <p className="small" style={{ color: 'var(--danger)' }}>{push.error}</p>}
    </section>
  );
}

/** Euer Plan als Kalender-Abo für die Kalender-App des Handys. */
export function FeedCard() {
  const connected = useSync((s) => s.connected);
  const notify = useStore((s) => s.notify);
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    if (!connected) return;
    fetch('/api/feed').then((r) => (r.ok ? r.json() : null)).then((j) => setPath(j?.path ?? null), () => undefined);
  }, [connected]);
  if (!connected || !path) return null;
  const https = `${location.origin}${path}`;
  const webcal = https.replace(/^https?:/, 'webcal:');
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => notify('Adresse kopiert'), () => notify(t));

  return (
    <section className="card stack">
      <h3>Euer Plan in der Kalender-App</h3>
      <p className="small">Abonniert diese Adresse in der Kalender-App eures Handys – dann erscheinen alle Termine dort, inklusive Erinnerungen. Aktualisierung etwa alle 30 Minuten, nur lesend.</p>
      <code className="feed-url">{https}</code>
      <div className="row wrap">
        <a className="btn primary" href={webcal}>
          📅 In Kalender-App öffnen
        </a>
        <button className="btn" onClick={() => copy(https)}>
          Adresse kopieren
        </button>
        <button
          className="btn ghost"
          onClick={() =>
            confirm('Neue Adresse erzeugen? Bestehende Abos funktionieren dann nicht mehr.') &&
            fetch('/api/feed/rotate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
              .then((r) => r.json())
              .then((j) => setPath(j.path))
          }
        >
          Neue Adresse
        </button>
      </div>
      <ul className="help-list small">
        <li><b>iPhone/iPad:</b> „In Kalender-App öffnen“ antippen → Abonnieren.</li>
        <li><b>Android:</b> die kostenlose App <i>ICSx⁵</i> installieren und die Adresse dort einfügen – Termine erscheinen dann im Google-Kalender des Handys.</li>
        <li><b>Google Kalender im Web</b> kann Adressen aus dem Heimnetz nicht abrufen (Google lädt von außen).</li>
        <li>Die Adresse enthält einen geheimen Schlüssel – nur innerhalb der Familie teilen.</li>
      </ul>
    </section>
  );
}
