import { useEffect, useState } from 'react';
import { CATEGORY_STYLE } from '../../data/templates';
import { useDnd } from '../../dnd/state';
import { fmt, fromMinutes, toMinutes } from '../../lib/date';
import { useStore } from '../../store/store';
import { CATEGORIES, OWNERS, type CalendarEvent, type Repeat } from '../../store/types';
import { Chips } from '../../ui/Segmented';
import { Sheet } from '../../ui/Sheet';
import { useOwnerName } from './hooks';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const REMINDERS: { value: CalendarEvent['reminder']; label: string }[] = [
  { value: 'none', label: 'Keine' },
  { value: '15', label: '🔔 15 Min. vorher' },
  { value: '60', label: '🔔 1 Std. vorher' },
  { value: '1440', label: '🔔 1 Tag vorher' },
];

const REPEATS: { value: Repeat; label: string }[] = [
  { value: 'none', label: 'Einmalig' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
];

const blank = (p: Partial<CalendarEvent> = {}): Omit<CalendarEvent, 'id'> => ({
  title: '', date: p.date ?? useStore.getState().cursor, time: p.time ?? '18:00', duration: 60, category: 'Wir', owner: 'Beide',
  allDay: false, repeat: 'none', reminder: 'none', notes: '', ...p,
});

/** Termin anlegen/bearbeiten. Alles per Chip antippbar – Tastatur nur für den Titel nötig. */
export function EventSheet() {
  const editing = useStore((s) => s.editing);
  const setUi = useStore((s) => s.setUi);
  const { addEvent, updateEvent, deleteEvent } = useStore.getState();
  const name = useOwnerName();
  const [f, setF] = useState(blank());

  useEffect(() => {
    if (editing) setF(editing.event ? { ...editing.event } : blank(editing.draft));
  }, [editing]);

  const close = () => setUi({ editing: null });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const ev = { ...f, title: f.title.trim() || 'Termin' };
    if (editing?.event) updateEvent(editing.event.id, ev);
    else addEvent(ev);
    close();
  };
  const step = (n: number) => set('time', fromMinutes(Math.max(0, Math.min(23 * 60 + 45, toMinutes(f.time) + n))));

  return (
    <Sheet
      open={!!editing}
      onClose={close}
      title={editing?.event ? 'Termin bearbeiten' : 'Neuer Termin'}
      footer={
        <>
          <button className="btn primary" onClick={save}>
            Speichern
          </button>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <span className="grow" />
          {editing?.event && (
            <button
              className="btn danger"
              onClick={() => {
                deleteEvent(editing.event!.id);
                close();
              }}
            >
              Löschen
            </button>
          )}
        </>
      }
    >
      <label className="field">
        <span>Titel</span>
        <input className="input" value={f.title} placeholder="z. B. Spaziergang am See" onChange={(e) => set('title', e.target.value)} autoFocus={!editing?.event} />
      </label>
      <div className="field">
        <span>Kategorie</span>
        <Chips value={f.category} onChange={(c) => set('category', c)} options={CATEGORIES.map((c) => ({ value: c, label: `${CATEGORY_STYLE[c].emoji} ${c}` }))} />
      </div>
      <div className="field">
        <span>Wer</span>
        <Chips value={f.owner} onChange={(o) => set('owner', o)} options={OWNERS.map((o) => ({ value: o, label: name(o) }))} />
      </div>
      <div className="row wrap" style={{ gap: 16 }}>
        <label className="field grow">
          <span>Datum · {fmt.long(f.date)}</span>
          <input className="input" type="date" value={f.date} onChange={(e) => e.target.value && set('date', e.target.value)} />
        </label>
        <div className="field">
          <span>Uhrzeit</span>
          <div className="row">
            <button type="button" className="btn icon" onClick={() => step(-15)} disabled={f.allDay} aria-label="15 Minuten früher">
              −
            </button>
            <input className="input" style={{ width: 120 }} type="time" step={900} value={f.time} disabled={f.allDay} onChange={(e) => set('time', e.target.value)} />
            <button type="button" className="btn icon" onClick={() => step(15)} disabled={f.allDay} aria-label="15 Minuten später">
              +
            </button>
          </div>
        </div>
      </div>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={f.allDay} onClick={() => set('allDay', !f.allDay)}>
          Ganztags
        </button>
      </div>
      {!f.allDay && (
        <div className="field">
          <span>Dauer</span>
          <Chips value={f.duration} onChange={(d) => set('duration', d)} options={DURATIONS.map((d) => ({ value: d, label: fmt.duration(d) }))} />
        </div>
      )}
      <div className="field">
        <span>Wiederholung</span>
        <Chips value={f.repeat} onChange={(r) => set('repeat', r)} options={REPEATS} />
      </div>
      <div className="field">
        <span>Erinnerung{f.allDay ? ' (ganztägig: bezogen auf 8 Uhr)' : ''}</span>
        <Chips value={f.reminder} onChange={(r) => set('reminder', r)} options={REMINDERS} />
      </div>
      <label className="field">
        <span>Notiz</span>
        <textarea className="input" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Keine medizinischen Details – das Display ist für alle sichtbar." />
      </label>
    </Sheet>
  );
}

/** Rückfrage, wenn ein Serientermin verschoben wird. */
export function SeriesDialog() {
  const move = useDnd((s) => s.seriesMove);
  const moveEvent = useStore((s) => s.moveEvent);
  const close = () => useDnd.setState({ seriesMove: null });
  const run = (scope: 'one' | 'all') => {
    if (move) moveEvent(move.id, move.from, move.to, move.time, scope);
    close();
  };
  return (
    <Sheet open={!!move} onClose={close} title="Serientermin verschieben">
      <p>Soll nur dieser eine Termin verschoben werden oder die ganze Serie?</p>
      <div className="row wrap">
        <button className="btn primary" onClick={() => run('one')}>
          Nur diesen Termin
        </button>
        <button className="btn" onClick={() => run('all')}>
          Ganze Serie
        </button>
        <button className="btn ghost" onClick={close}>
          Abbrechen
        </button>
      </div>
    </Sheet>
  );
}
