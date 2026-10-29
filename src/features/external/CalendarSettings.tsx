import { useState } from 'react';
import { useClockStore } from '../../lib/useClock';
import { STATES } from '../../lib/holidays';
import { uid } from '../../lib/id';
import { useStore } from '../../store/store';
import { useSync } from '../../store/sync';
import { OWNERS, type ExternalCalendar, type Owner } from '../../store/types';
import { Chips } from '../../ui/Segmented';
import { useOwnerName } from '../calendar/hooks';
import { normalizeUrl, refreshCalendar, useExternalStore } from './useExternal';
import { Icon } from '../../ui/Icon';

const HUES = [210, 150, 30, 280, 340, 190];

function ago(ts: number) {
  const min = Math.round((Date.now() - ts) / 60000);
  return min < 1 ? 'gerade eben' : min < 60 ? `vor ${min} Min.` : `vor ${Math.round(min / 60)} Std.`;
}

export function CalendarSettings() {
  const s = useStore((x) => x.data.settings);
  const calendars = useStore((x) => x.data.calendars);
  const { mutate, updateSettings } = useStore.getState();
  const cache = useExternalStore((x) => x.cache);
  const loading = useExternalStore((x) => x.loading);
  const connected = useSync((x) => x.connected);
  const name = useOwnerName();
  useClockStore((c) => c.now);
  const [draft, setDraft] = useState({ name: '', url: '', owner: 'Beide' as Owner, hue: HUES[0], busy: true });

  const update = (id: string, p: Partial<ExternalCalendar>) => mutate((d) => void Object.assign(d.calendars.find((c) => c.id === id)!, p));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(draft.url);
    if (!/^https?:\/\/\S+$/i.test(url)) return useStore.getState().notify('Bitte eine Kalender-Adresse (https:// oder webcal://) einfügen');
    const cal: ExternalCalendar = { id: uid(), name: draft.name.trim() || 'Kalender', url, owner: draft.owner, hue: draft.hue, busy: draft.busy, visible: true };
    mutate((d) => void d.calendars.push(cal), `${cal.name} abonniert`);
    void refreshCalendar(cal, true);
    setDraft({ ...draft, name: '', url: '', hue: HUES[(HUES.indexOf(draft.hue) + 1) % HUES.length] });
  };

  return (
    <section className="card stack">
      <h3>Kalender & Feiertage</h3>
      <label className="field">
        <span>Bundesland für Feiertage</span>
        <select className="input" value={s.holidayState ?? ''} onChange={(e) => updateSettings({ holidayState: e.target.value || null })}>
          <option value="">Nur bundesweite Feiertage</option>
          {Object.entries(STATES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <div className="chips">
        <button className="chip" aria-pressed={s.specialDays} onClick={() => updateSettings({ specialDays: !s.specialDays })}>
          Valentinstag, Muttertag, Heiligabend & Silvester zeigen
        </button>
      </div>
      <p className="small muted">Feiertage werden auf dem Gerät berechnet – ohne Internet. Der Begleiter plant sie wie Wochenenden.</p>

      <h3 style={{ marginTop: 8 }}>Abonnierte Kalender</h3>
      {!connected && <p className="small muted">Ohne Heimserver lassen sich viele Kalender (Google, iCloud, Outlook) nicht direkt abrufen – mit verbundenem Server klappt es zuverlässig.</p>}
      {calendars.map((c) => {
        const entry = cache[c.id];
        return (
          <div key={c.id} className="cal-sub" style={{ '--h': c.hue } as React.CSSProperties}>
            <div className="row">
              <span className="ext-dot" />
              <b className="grow ellipsis">{c.name}</b>
              <button className="btn sm" onClick={() => void refreshCalendar(c, true)} disabled={loading[c.id]} aria-label="Jetzt aktualisieren">
                <Icon name="refresh" size={16} className={loading[c.id] ? 'is-spinning' : ''} />
              </button>
              <button className="btn sm ghost" onClick={() => confirm(`„${c.name}“ entfernen?`) && mutate((d) => void (d.calendars = d.calendars.filter((x) => x.id !== c.id)), 'Abo entfernt')} aria-label="Entfernen">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="small muted ellipsis">{c.url.replace(/^https?:\/\//, '')}</div>
            <div className="small">
              {entry?.error ? <span style={{ color: 'var(--danger)' }}><Icon name="alert" size={14} /> {entry.error}</span> : entry ? `${entry.items.length} Termine · aktualisiert ${ago(entry.fetchedAt)}` : loading[c.id] ? 'wird geladen …' : 'noch nicht geladen'}
            </div>
            <div className="chips">
              <button className="chip" aria-pressed={c.visible} onClick={() => update(c.id, { visible: !c.visible })}>
                Anzeigen
              </button>
              <button className="chip" aria-pressed={c.busy} onClick={() => update(c.id, { busy: !c.busy })} title="Termine daraus gelten für den Begleiter als belegt">
                Zählt als belegt
              </button>
              {OWNERS.map((o) => (
                <button key={o} className="chip" aria-pressed={c.owner === o} onClick={() => update(c.id, { owner: o })}>
                  {name(o)}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <form className="stack cal-add" onSubmit={add}>
        <div className="row wrap">
          <input className="input" style={{ maxWidth: 220 }} placeholder="Name, z. B. Schulferien" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input grow" style={{ minWidth: 220 }} placeholder="Kalender-Adresse (https://… oder webcal://…)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        </div>
        <div className="row wrap">
          <Chips value={draft.owner} onChange={(o) => setDraft({ ...draft, owner: o })} options={OWNERS.map((o) => ({ value: o, label: name(o) }))} />
          <div className="chips">
            {HUES.map((h) => (
              <button key={h} type="button" className="chip hue-chip" aria-pressed={draft.hue === h} style={{ '--h': h } as React.CSSProperties} onClick={() => setDraft({ ...draft, hue: h })} aria-label={`Farbe ${h}`}>
                <span className="ext-dot" />
              </button>
            ))}
          </div>
          <button type="button" className="chip" aria-pressed={draft.busy} onClick={() => setDraft({ ...draft, busy: !draft.busy })}>
            Zählt als belegt
          </button>
          <button className="btn primary">+ Abonnieren</button>
        </div>
      </form>

      <details className="small">
        <summary>Wo finde ich die Kalender-Adresse?</summary>
        <ul className="help-list">
          <li>
            <b>Google Kalender</b> (im Browser am Computer): Einstellungen → Kalender links auswählen → „Kalender integrieren“ → <i>Privatadresse im iCal-Format</i>. Diese Adresse nicht weitergeben.
          </li>
          <li>
            <b>iCloud</b>: Kalender-App → Kalender teilen → „Öffentlicher Kalender“ einschalten → Link kopieren (beginnt mit webcal://). Achtung: Wer den Link kennt, sieht die Termine.
          </li>
          <li>
            <b>Outlook.com / Microsoft 365</b>: Einstellungen → Kalender → Freigegebene Kalender → „Kalender veröffentlichen“ → ICS-Link.
          </li>
          <li>
            <b>Schulferien</b>: z. B. auf feiertage-deutschland.de oder schulferien.org den iCal-Link eures Bundeslandes kopieren. Haken „Zählt als belegt“ weglassen.
          </li>
          <li>
            <b>Müllabfuhr</b>: Die meisten Städte und Entsorger bieten den Abfuhrkalender als iCal-Abo an („Termine als iCal/ICS“).
          </li>
          <li>
            <b>Kita, Schule, Verein</b>: Wenn ein Kalender als „iCal“, „ICS“ oder „Kalender abonnieren“ angeboten wird, funktioniert er hier.
          </li>
        </ul>
      </details>
    </section>
  );
}
