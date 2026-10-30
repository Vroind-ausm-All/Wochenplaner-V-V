import type { CalendarEvent, ExternalMeta, ISODate, Repeat, Task } from '../store/types';
import { addDays, parse, toMinutes } from './date';

/** Gleiche Regeln wie im alten Board, damit Serien identisch erscheinen. */
export function matches(start: ISODate, target: ISODate, repeat: Repeat): boolean {
  if (target < start) return false;
  if (target === start) return true;
  const a = parse(start);
  const b = parse(target);
  switch (repeat) {
    case 'daily':
      return true;
    case 'weekly':
      return a.getDay() === b.getDay();
    case 'monthly':
      return a.getDate() === b.getDate();
    case 'yearly':
      return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
    default:
      return false;
  }
}

export const occurs = (e: CalendarEvent, on: ISODate) => matches(e.date, on, e.repeat || 'none') && !(e.exDates || []).includes(on);

export interface Occurrence extends CalendarEvent {
  on: ISODate;
  /** gesetzt bei Abo-Terminen und Feiertagen (nur lesend) */
  external?: ExternalMeta;
}

/** Sortierung eines Tages: ganztägig zuerst, dann nach Uhrzeit. */
export const byDayAndTime = (a: Occurrence, b: Occurrence) => a.on.localeCompare(b.on) || byTime(a, b);

const byTime = (a: CalendarEvent, b: CalendarEvent) =>
  Number(!a.allDay) - Number(!b.allDay) || toMinutes(a.time || '00:00') - toMinutes(b.time || '00:00');

export function eventsOn(events: CalendarEvent[], on: ISODate): Occurrence[] {
  return events.filter((e) => occurs(e, on)).map((e) => ({ ...e, on })).sort(byTime);
}

/** Alle Vorkommen im Bereich [from, to] (inklusive). */
export function occurrences(events: CalendarEvent[], from: ISODate, to: ISODate): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(...eventsOn(events, d));
  return out;
}

export interface TaskOccurrence extends Task {
  on: ISODate;
  isDone: boolean;
}

export function taskOccurrences(tasks: Task[], from: ISODate, to: ISODate): TaskOccurrence[] {
  const out: TaskOccurrence[] = [];
  for (let d = from; d <= to; d = addDays(d, 1))
    for (const t of tasks)
      if (matches(t.due, d, t.repeat)) out.push({ ...t, on: d, isDone: (t.doneDates || []).includes(d) });
  return out;
}

/** Laufen zwei Termine zeitlich übereinander? */
export function overlaps(a: { time: string; duration: number }, b: { time: string; duration: number }) {
  const as = toMinutes(a.time), bs = toMinutes(b.time);
  return as < bs + b.duration && bs < as + a.duration;
}

/**
 * Verteilt überlappende Termine eines Tages auf Spuren (für die Zeitraster-Ansicht).
 * Liefert für jeden Termin Spur und Spurenanzahl seiner Überlappungsgruppe.
 */
export function layoutLanes<T extends { id: string; time: string; duration: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || b.duration - a.duration);
  const result = new Map<string, { lane: number; lanes: number }>();
  let group: T[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const flush = () => {
    for (const g of group) result.get(g.id)!.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    const s = toMinutes(it.time), e = s + Math.max(15, it.duration);
    if (s >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    result.set(it.id, { lane, lanes: 1 });
    group.push(it);
    groupEnd = Math.max(groupEnd, e);
  }
  flush();
  return result;
}
