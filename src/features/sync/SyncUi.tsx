import { useEffect, useState } from 'react';
import { install, useInstall } from '../../app/install';
import { useClockStore } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { connect, disconnect, downloadPreSyncBackup, useSync } from '../../store/sync';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';

function ago(ts: number | null, now: number) {
  if (!ts) return 'noch nie';
  const min = Math.round((now - ts) / 60_000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  return h < 24 ? `vor ${h} Std.` : new Date(ts).toLocaleDateString('de-DE');
}

/** Kurzer Status für die Navigation. */
export function SyncBadge() {
  const s = useSync();
  useClockStore((c) => c.now); // minütlich neu zeichnen
  if (!s.available) return <span>Nur auf diesem Gerät</span>;
  if (!s.connected) return <span className="sync-badge"><Icon name="lock" size={14} /> Anmeldung nötig</span>;
  if (!s.online) return <span className="sync-badge" title={s.error ?? ''}><Icon name="cloud-off" size={14} /> Offline{s.pending ? ' · wird nachgeholt' : ''}</span>;
  if (s.pending) return <span className="sync-badge"><Icon name="sync" size={14} /> Wird abgeglichen …</span>;
  return <span className="sync-badge" title={`Zuletzt ${ago(s.lastSync, Date.now())}`}><Icon name="cloud" size={14} /> Alle Geräte aktuell</span>;
}

function LoginForm({ onDone }: { onDone?: () => void }) {
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const notify = useStore((s) => s.notify);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await connect(pass);
          notify('Verbunden – alle Geräte teilen jetzt denselben Plan');
          onDone?.();
        } catch (x) {
          setErr((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        <span>Haushalts-Passwort</span>
        <input className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
      </label>
      {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
      <div className="row">
        <button className="btn primary" disabled={busy || !pass}>
          {busy ? 'Verbinde …' : 'Verbinden'}
        </button>
      </div>
    </form>
  );
}

/** Erscheint einmal pro Sitzung, wenn ein Heimserver gefunden, das Gerät aber nicht angemeldet ist. */
export function ServerLoginSheet() {
  const { available, needsLogin } = useSync();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('wir-login-later') === '1');
  const later = () => {
    sessionStorage.setItem('wir-login-later', '1');
    setDismissed(true);
  };
  return (
    <Sheet open={available && needsLogin && !dismissed} onClose={later} title="Familienplan verbinden">
      <p>Dieses Gerät hat euren Heimserver gefunden. Nach der Anmeldung sehen Handy, Tablet und Bilderrahmen denselben Plan – Änderungen erscheinen sofort überall.</p>
      <LoginForm onDone={later} />
      <button className="btn ghost" onClick={later}>
        Später – erst einmal nur auf diesem Gerät
      </button>
    </Sheet>
  );
}

/** Abschnitt in den Einstellungen. */
export function SyncPanel() {
  const s = useSync();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="card stack">
      <h3>Alle Geräte verbinden</h3>
      {!s.available && (
        <>
          <p>Lokaler Modus – die Daten bleiben auf diesem Gerät.</p>
          <p className="small muted">
            Damit Handy und Bilderrahmen denselben Plan sehen, startet den Heimserver (Anleitung: <code>docs/HEIMSERVER.md</code>) und öffnet die App über dessen Adresse.
          </p>
        </>
      )}
      {s.available && !s.connected && <LoginForm />}
      {s.connected && (
        <>
          <p>
            <b>{s.online ? (s.pending ? 'Wird abgeglichen …' : 'Verbunden – alle Geräte sind aktuell.') : 'Gerade keine Verbindung – Änderungen werden gesammelt und automatisch nachgeholt.'}</b>
          </p>
          <p className="small muted">
            Zuletzt abgeglichen: {ago(s.lastSync, now)} · Stand Nr. {s.revision}
          </p>
          <p className="small">
            Weitere Geräte im WLAN öffnen einfach <code>{location.origin}</code> und melden sich mit dem Haushalts-Passwort an.
          </p>
          <div className="row wrap">
            <a className="btn" href="/api/backup">
              <Icon name="download" size={16} /> Serverstand sichern
            </a>
            <button className="btn ghost" onClick={() => void disconnect()}>
              Dieses Gerät abmelden
            </button>
          </div>
        </>
      )}
      {s.error && s.connected && <p className="small" style={{ color: 'var(--danger)' }}>{s.error}</p>}
      {s.hasPreSyncBackup && (
        <p className="small muted">
          Der Stand dieses Geräts vor der ersten Verbindung wurde gesichert.{' '}
          <button className="linklike" onClick={downloadPreSyncBackup}>
            Herunterladen
          </button>
        </p>
      )}
      <p className="small muted">Bei gleichzeitigen Änderungen werden beide Stände eintragsweise zusammengeführt. Alle mit dem Haushalts-Passwort sehen alle Einträge.</p>
    </section>
  );
}

/** Hinweis „Als App installieren“ – mit Knopf, wo der Browser es anbietet, sonst mit Anleitung. */
export function InstallCard() {
  const { prompt, installed } = useInstall();
  if (installed) return null;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const secure = window.isSecureContext;
  return (
    <section className="card stack">
      <h3>Als App auf den Startbildschirm</h3>
      {prompt ? (
        <div className="row wrap">
          <button className="btn primary" onClick={() => void install()}>
            <Icon name="download" size={16} /> App installieren
          </button>
          <span className="small muted">Startet dann wie eine normale App und funktioniert auch ohne Netz.</span>
        </div>
      ) : ios ? (
        <p className="small">In Safari unten auf <b>Teilen</b> tippen, dann <b>„Zum Home-Bildschirm“</b>.</p>
      ) : (
        <p className="small">Im Browser-Menü <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b> wählen.</p>
      )}
      {!secure && (
        <p className="small muted">
          Offline-Start und Installation erlauben Browser nur über HTTPS. Im Heimnetz ohne HTTPS funktioniert die App normal, startet aber nicht ohne Netz – Lösung mit Tailscale siehe <code>docs/HEIMSERVER.md</code>.
        </p>
      )}
    </section>
  );
}
