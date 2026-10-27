import { useState } from 'react';
import { addDays, fmt } from '../../lib/date';
import { uid } from '../../lib/id';
import { taskOccurrences } from '../../lib/recurrence';
import { useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { OWNERS, type ISODate, type Repeat, type Task } from '../../store/types';
import { Chips } from '../../ui/Segmented';
import { Sheet } from '../../ui/Sheet';
import { useOwnerName } from '../calendar/hooks';

const REPEAT: { value: Repeat; label: string }[] = [
  { value: 'none', label: 'Einmalig' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
];

const toggle = (id: string, on: ISODate, done: boolean) =>
  useStore.getState().mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return;
    t.doneDates = done ? [...new Set([...(t.doneDates || []), on])] : (t.doneDates || []).filter((x) => x !== on);
  });

function TaskRow({ t, onEdit }: { t: ReturnType<typeof taskOccurrences>[number]; onEdit?: () => void }) {
  const name = useOwnerName();
  return (
    <label className={`shop__item task ${t.isDone ? 'is-done' : ''}`}>
      <input type="checkbox" checked={t.isDone} onChange={(e) => toggle(t.id, t.on, e.target.checked)} />
      <span className="grow">
        <b>{t.title}</b>
        <span className="small muted">
          {' '}
          · {name(t.owner)}
          {t.repeat !== 'none' ? ' · ↻' : ''}
        </span>
      </span>
      {onEdit && (
        <button type="button" className="btn sm ghost" onClick={(e) => { e.preventDefault(); onEdit(); }}>
          ✎
        </button>
      )}
    </label>
  );
}

/** Aufgaben eines Tages (für Tagesansicht und Startseite). */
export function DayTasks({ day }: { day: ISODate }) {
  const tasks = useStore((s) => s.data.tasks);
  const list = taskOccurrences(tasks, day, day);
  if (!list.length) return null;
  return (
    <section className="stack">
      <div className="eyebrow">Aufgaben</div>
      {list.map((t) => (
        <TaskRow key={t.id} t={t} />
      ))}
    </section>
  );
}

export function TasksPage() {
  const tasks = useStore((s) => s.data.tasks);
  const today = useToday();
  const [edit, setEdit] = useState<Partial<Task> | null>(null);
  const occ = taskOccurrences(tasks, addDays(today, -3), addDays(today, 21));
  const days = [...new Set(occ.map((t) => t.on))];
  return (
    <div className="shop">
      <header className="row">
        <h2 className="grow">Aufgaben & Routinen</h2>
        <button className="btn primary" onClick={() => setEdit({})}>
          + Aufgabe
        </button>
      </header>
      <p className="small muted">Wiederholungen entstehen automatisch aus der Regel. Abhaken gilt nur für den jeweiligen Tag.</p>
      {days.map((d) => (
        <section key={d} className="stack">
          <div className="eyebrow">{fmt.relative(d, today)} · {fmt.short(d)}</div>
          {occ.filter((t) => t.on === d).map((t) => (
            <TaskRow key={t.id + d} t={t} onEdit={() => setEdit(tasks.find((x) => x.id === t.id)!)} />
          ))}
        </section>
      ))}
      {!occ.length && <div className="empty">Keine Aufgaben in den nächsten drei Wochen.</div>}
      <TaskSheet task={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function TaskSheet({ task, onClose }: { task: Partial<Task> | null; onClose: () => void }) {
  const name = useOwnerName();
  const mutate = useStore((s) => s.mutate);
  const today = useToday();
  const [f, setF] = useState<Partial<Task>>({});
  const [key, setKey] = useState<Partial<Task> | null>(null);
  if (task !== key) {
    setKey(task);
    setF({ title: '', owner: 'Beide', due: today, repeat: 'none', notes: '', ...task });
  }
  const save = () => {
    mutate((d) => {
      if (f.id) Object.assign(d.tasks.find((x) => x.id === f.id)!, f);
      else d.tasks.push({ id: uid(), doneDates: [], notes: '', title: 'Aufgabe', owner: 'Beide', due: today, repeat: 'none', ...f } as Task);
    }, 'Aufgabe gespeichert');
    onClose();
  };
  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title={f.id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
      footer={
        <>
          <button className="btn primary" onClick={save}>Speichern</button>
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <span className="grow" />
          {f.id && (
            <button className="btn danger" onClick={() => { mutate((d) => void (d.tasks = d.tasks.filter((x) => x.id !== f.id)), 'Aufgabe gelöscht'); onClose(); }}>
              Löschen
            </button>
          )}
        </>
      }
    >
      <label className="field">
        <span>Aufgabe</span>
        <input className="input" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </label>
      <label className="field">
        <span>Erstmals fällig</span>
        <input className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
      </label>
      <div className="field">
        <span>Verantwortung</span>
        <Chips value={f.owner ?? 'Beide'} onChange={(o) => setF({ ...f, owner: o })} options={OWNERS.map((o) => ({ value: o, label: name(o) }))} />
      </div>
      <div className="field">
        <span>Wiederholung</span>
        <Chips value={f.repeat ?? 'none'} onChange={(r) => setF({ ...f, repeat: r })} options={REPEAT} />
      </div>
    </Sheet>
  );
}
