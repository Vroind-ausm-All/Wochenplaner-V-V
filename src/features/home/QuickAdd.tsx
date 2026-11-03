import { useEffect, useState } from 'react';
import { fmt, fromMinutes, toMinutes } from '../../lib/date';
import { uid } from '../../lib/id';
import { useNow, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import type { Category, ISODate, Owner } from '../../store/types';
import { Icon, OwnerMark } from '../../ui/Icon';
import { Chips, Segmented } from '../../ui/Segmented';
import { Sheet } from '../../ui/Sheet';
import { useOwnerName } from '../calendar/hooks';

export interface QuickAddTarget {
  owner: Owner;
  date: ISODate;
}

const DURATIONS = [30, 60, 90, 120];
/** Passende Kategorie, wenn man schnell einträgt – im großen Formular lässt sie sich ändern. */
const categoryFor = (o: Owner): Category => (o === 'Beide' ? 'Familie' : o === 'Kind' ? 'Familie' : 'Termin');

/** Schnell-Eintrag direkt aus einer Spalte: Person und Tag sind schon gesetzt. */
export function QuickAdd({ target, onClose }: { target: QuickAddTarget | null; onClose: () => void }) {
  const name = useOwnerName();
  const today = useToday();
  const now = useNow();
  const { mutate, addEvent, setUi } = useStore.getState();
  const [kind, setKind] = useState<'task' | 'event'>('task');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (!target) return;
    setTitle('');
    setKind('task');
    // Nächste volle Stunde vorschlagen (heute) bzw. 18 Uhr (andere Tage).
    setTime(target.date === today ? fromMinutes(Math.min(22 * 60, Math.ceil((toMinutes(now) + 1) / 60) * 60)) : '18:00');
  }, [target, today, now]);

  if (!target) return <Sheet open={false} onClose={onClose} title="" children={null} />;
  const who = target.owner === 'Beide' ? 'euch beide' : name(target.owner);
  const draft = () => ({ title: title.trim() || 'Termin', date: target.date, time, duration, category: categoryFor(target.owner), owner: target.owner, allDay: false, repeat: 'none' as const, reminder: 'none' as const });

  const save = () => {
    if (kind === 'task')
      mutate((d) => void d.tasks.push({ id: uid(), title: title.trim() || 'Aufgabe', owner: target.owner, due: target.date, repeat: 'none', doneDates: [], notes: '' }), `Aufgabe für ${who} eingetragen`);
    else addEvent(draft(), `Termin für ${who} eingetragen`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Neu für ${who}`}
      footer={
        <>
          <button className="btn primary" onClick={save}>
            <Icon name="check" size={18} /> Eintragen
          </button>
          {kind === 'event' && (
            <button
              className="btn"
              onClick={() => {
                setUi({ editing: { kind: 'event', draft: draft() } });
                onClose();
              }}
            >
              Mehr Optionen
            </button>
          )}
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>
            Abbrechen
          </button>
        </>
      }
    >
      <p className="row small muted">
        <OwnerMark owner={target.owner} size={12} /> {target.owner === 'Beide' ? 'Gemeinsam' : name(target.owner)} · {fmt.long(target.date)}
      </p>
      <Segmented
        value={kind}
        onChange={setKind}
        label="Art"
        options={[
          { value: 'task', label: 'Aufgabe', icon: 'tasks' },
          { value: 'event', label: 'Termin', icon: 'calendar' },
        ]}
      />
      <label className="field">
        <span>{kind === 'task' ? 'Was ist zu tun?' : 'Was steht an?'}</span>
        <input
          className="input"
          autoFocus
          value={title}
          placeholder={kind === 'task' ? 'z. B. Kinderarzt anrufen' : 'z. B. Elternabend'}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </label>
      {kind === 'event' && (
        <div className="row wrap" style={{ gap: 24, alignItems: 'flex-end' }}>
          <label className="field">
            <span>Uhrzeit</span>
            <input className="input" type="time" value={time} step={900} onChange={(e) => setTime(e.target.value)} style={{ width: 140 }} />
          </label>
          <div className="field">
            <span>Dauer</span>
            <Chips value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: fmt.duration(d) }))} />
          </div>
        </div>
      )}
    </Sheet>
  );
}
