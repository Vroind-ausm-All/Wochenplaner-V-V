import { useEffect, useRef } from 'react';
import { updateDevice, useDevice } from '../../store/device';
import { useStore } from '../../store/store';
import { useSync } from '../../store/sync';
import { Chips } from '../../ui/Segmented';
import { addPhotos, loadPhotos, removePhoto, usePhotos } from './photoStore';
import './screensaver.css';

/** Fotos hochladen und den Bildschirmschoner dieses Geräts einstellen. */
export function PhotoSettings() {
  const device = useDevice();
  const { photos, uploading, error, loading } = usePhotos();
  const connected = useSync((s) => s.connected);
  const notify = useStore((s) => s.notify);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => void loadPhotos(), [connected]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const r = await addPhotos(files);
    notify(r.failed ? `${r.added} Fotos hinzugefügt, ${r.failed} fehlgeschlagen` : `${r.added} ${r.added === 1 ? 'Foto' : 'Fotos'} hinzugefügt`);
    if (input.current) input.current.value = '';
  };

  return (
    <section className="card stack">
      <h3>Fotos & Bildschirmschoner</h3>
      <p className="small muted">
        {connected
          ? 'Fotos liegen auf dem Heimserver – vom Handy hochladen, der Bilderrahmen zeigt sie automatisch.'
          : 'Ohne Heimserver bleiben Fotos nur auf diesem Gerät.'}{' '}
        Sie werden vor dem Hochladen verkleinert (max. 2048 px).
      </p>
      <div className="row wrap">
        <button className="btn primary" onClick={() => input.current?.click()} disabled={uploading > 0}>
          {uploading ? `Lade hoch … (${uploading})` : '📷 Fotos hinzufügen'}
        </button>
        <button className="btn" onClick={() => window.dispatchEvent(new Event('wir:screensaver'))}>
          ▶ Vorschau
        </button>
        <span className="small muted">{loading ? 'lädt …' : `${photos.length} Fotos`}</span>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} data-testid="photo-input" />
      {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.slice(0, 60).map((p) => (
            <div key={p.id} className="photo-thumb">
              <img src={p.url} alt="" loading="lazy" />
              <button className="photo-thumb__del" aria-label="Foto löschen" onClick={() => confirm('Dieses Foto löschen?') && void removePhoto(p)}>
                ✕
              </button>
            </div>
          ))}
          {photos.length > 60 && <div className="photo-thumb photo-thumb--more">+{photos.length - 60}</div>}
        </div>
      )}

      <div className="field">
        <span>Bildschirmschoner auf diesem Gerät</span>
        <Chips value={device.screensaverAfter} onChange={(v) => updateDevice({ screensaverAfter: v })} options={[0, 2, 5, 10, 30].map((v) => ({ value: v, label: v ? `nach ${v} Min.` : 'Aus' }))} />
      </div>
      <div className="field">
        <span>Jedes Foto zeigen für</span>
        <Chips value={device.slideSeconds} onChange={(v) => updateDevice({ slideSeconds: v })} options={[8, 15, 30, 60].map((v) => ({ value: v, label: `${v} Sek.` }))} />
      </div>
      <div className="chips">
        <button className="chip" aria-pressed={device.screensaverInfo} onClick={() => updateDevice({ screensaverInfo: !device.screensaverInfo })}>
          🕒 Uhr, Wetter & nächste Termine
        </button>
        <button className="chip" aria-pressed={device.screensaverNightBlack} onClick={() => updateDevice({ screensaverNightBlack: !device.screensaverNightBlack })}>
          🌙 Nachts schwarz statt Fotos
        </button>
      </div>
      <p className="small muted">Erinnerungen beenden den Bildschirmschoner automatisch. Ohne Fotos erscheint ein ruhiger Bildschirm mit dem Gedanken des Tages.</p>
    </section>
  );
}
