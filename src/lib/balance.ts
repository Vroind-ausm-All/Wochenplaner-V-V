import type { Category, ISODate, Owner, PlannerData } from '../store/types';
import { addDays } from './date';
import { occurrences, taskOccurrences } from './recurrence';

/** Kategorien, die Organisationsarbeit für die Familie bedeuten (nicht: Wir, Ich, Arbeit). */
export const CARE_CATEGORIES: Category[] = ['Familie', 'Baby', 'Haushalt', 'Termin', 'Frist'];

export interface Share {
  /** Aufgaben in dieser Woche */
  tasks: number;
  /** davon erledigt */
  done: number;
  /** Familien-, Haushalts- und Kindertermine */
  events: number;
}

export type Balance = Record<'Person A' | 'Person B' | 'Beide', Share>;

/**
 * Wer trägt diese Woche was? Zählt Aufgaben (mit Wechsel-Regel und Einzel-Übernahmen) und
 * Organisations-Termine je Person. Keine Wertung – nur sichtbar machen.
 */
export function weekBalance(data: Pick<PlannerData, 'tasks' | 'events'>, week: ISODate): Balance {
  const end = addDays(week, 6);
  const empty = (): Share => ({ tasks: 0, done: 0, events: 0 });
  const out: Balance = { 'Person A': empty(), 'Person B': empty(), Beide: empty() };
  const slot = (o: Owner) => (o === 'Person A' || o === 'Person B' || o === 'Beide' ? out[o] : null);
  for (const t of taskOccurrences(data.tasks, week, end)) {
    const s = slot(t.owner);
    if (!s) continue;
    s.tasks++;
    if (t.isDone) s.done++;
  }
  for (const e of occurrences(data.events, week, end)) {
    const s = CARE_CATEGORIES.includes(e.category) ? slot(e.owner) : null;
    if (s) s.events++;
  }
  return out;
}

/** Deutliches Ungleichgewicht? Liefert die Person mit mehr Last, sonst null. */
export function heavierSide(b: Balance): 'Person A' | 'Person B' | null {
  const a = b['Person A'].tasks + b['Person A'].events;
  const c = b['Person B'].tasks + b['Person B'].events;
  if (Math.abs(a - c) < 3 || Math.max(a, c) < 1.5 * Math.max(1, Math.min(a, c))) return null;
  return a > c ? 'Person A' : 'Person B';
}
