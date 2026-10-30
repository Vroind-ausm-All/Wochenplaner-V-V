import { useRef, useState } from 'react';
import { searchPlace } from '../../lib/weather';
import { isValidBackup } from '../../store/migrate';
import { seed } from '../../store/defaults';
import { updateDevice, useDevice } from '../../store/device';
import { useStore } from '../../store/store';
import type { Location } from '../../store/types';
import { Chips } from '../../ui/Segmented';
import { CalendarSettings } from '../external/CalendarSettings';
import { PhotoSettings } from '../photos/PhotoSettings';
import { FeedCard, ReminderSettings } from '../reminders/ReminderSettings';
import { InstallCard, SyncPanel } from '../sync/SyncUi';
import { Icon } from '../../ui/Icon';

export function SettingsPage() {
  const s = useStore((x) => x.data.settings);
  const dev = useDevice();
  const { updateSettings, replaceAll, notify } = useStore.getState();
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState<Location[]>([]);
  const file = useRef<HTMLInputElement>(null);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlaces(q.trim() ? await searchPlace(q.trim()).catch(() => []) : []);
  };
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => updateSettings({ location: { name: 'Mein Standort', latitude: Number(p.coords.latitude.toFixed(3)), longitude: Number(p.coords.longitude.toFixed(3)) } }),
      () => notify('Standort nicht verfügbar'),
    );
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(useStore.getState().data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wir-wochenplaner-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f: File) => {
    try {
      const v = JSON.parse(await f.text());
      if (!isValidBackup(v)) throw new Error();
      if (confirm('Aktuelle Daten durch die Sicherung ersetzen? (Rückgängig ist möglich)')) {
        replaceAll(v);
        notify('Sicherung importiert', true);
      }
    } catch {
      notify('Diese Datei ist keine gültige Sicherung');
    }
  };

  return (
    <div className="shop">
      <h2>Einstellungen</h2>

      <section className="card stack">
        <h3>Wir zwei</h3>
        <div className="row wrap">
          <label className="field grow">
            <span>Name Person A</span>
            <input className="input" value={s.personA} onChange={(e) => updateSettings({ personA: e.target.value })} />
          </label>
          <label className="field grow">
            <span>Name Person B</span>
            <input className="input" value={s.personB} onChange={(e) => updateSettings({ personB: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="card stack">
        <h3>Wetter-Ort</h3>
        <p className="small muted">Aktuell: {s.location?.name ?? 'Berlin (Standard)'} · Daten von Open-Meteo, ohne Konto und ohne Tracking.</p>
        <form className="row wrap" onSubmit={find}>
          <input className="input grow" placeholder="Ort suchen, z. B. Leipzig" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn">Suchen</button>
          <button type="button" className="btn" onClick={locate}>
            <Icon name="pin" size={16} /> Standort verwenden
          </button>
        </form>
        <div className="chips">
          {places.map((p) => (
            <button key={`${p.latitude},${p.longitude}`} className="chip" onClick={() => { updateSettings({ location: p }); setPlaces([]); setQ(''); }}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <CalendarSettings />
      <ReminderSettings />
      <PhotoSettings />

      <section className="card stack">
        <h3>Essen</h3>
        <div className="field">
          <span>Standard-Portionen</span>
          <Chips value={s.defaultPortions} onChange={(v) => updateSettings({ defaultPortions: v })} options={[1, 2, 3, 4].map((v) => ({ value: v, label: String(v) }))} />
        </div>
        <div className="chips">
          <button className="chip" aria-pressed={s.lunchOnWeekdays} onClick={() => updateSettings({ lunchOnWeekdays: !s.lunchOnWeekdays })}>
            Mittagessen auch werktags planen
          </button>
        </div>
      </section>

      <section className="card stack">
        <h3>Display & Kiosk – nur dieses Gerät</h3>
        <div className="field">
          <span>Abdunkeln nach Inaktivität</span>
          <Chips value={dev.dimAfterMinutes} onChange={(v) => updateDevice({ dimAfterMinutes: v })} options={[0, 2, 5, 10, 30].map((v) => ({ value: v, label: v ? `${v} Min.` : 'Aus' }))} />
        </div>
        <div className="chips">
          <button className="chip" aria-pressed={dev.nightMode} onClick={() => updateDevice({ nightMode: !dev.nightMode })}>
            Nachtmodus automatisch
          </button>
        </div>
        {dev.nightMode && (
          <div className="row wrap">
            <label className="field">
              <span>Von</span>
              <input className="input" type="time" value={dev.nightFrom} onChange={(e) => updateDevice({ nightFrom: e.target.value })} />
            </label>
            <label className="field">
              <span>Bis</span>
              <input className="input" type="time" value={dev.nightTo} onChange={(e) => updateDevice({ nightTo: e.target.value })} />
            </label>
          </div>
        )}
        <p className="small muted">
          Das Abdunkeln in der Web-App schaltet nicht die Hintergrundbeleuchtung ab. Für echtes Standby: Android-Kioskmodus (z. B. Fully Kiosk) oder Monitor mit eigenem Sleep-Signal. Netzteil zugänglich und belüftet lassen – keine Netzteile in geschlossenen Wandhohlräumen.
        </p>
      </section>

      <SyncPanel />
      <FeedCard />
      <InstallCard />

      <section className="card stack">
        <h3>Datensicherung</h3>
        <div className="row wrap">
          <button className="btn" onClick={exportJson}><Icon name="download" size={16} /> JSON exportieren</button>
          <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> JSON importieren</button>
          <button className="btn danger" onClick={() => confirm('Alle Daten auf Beispieldaten zurücksetzen?') && (replaceAll(seed()), notify('Zurückgesetzt', true))}>
            Zurücksetzen
          </button>
        </div>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        <p className="small muted">Sicherungen des alten WIR-Boards lassen sich direkt importieren.</p>
      </section>
    </div>
  );
}
