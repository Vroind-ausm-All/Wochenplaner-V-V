import type { CalendarEvent, ISODate } from '../store/types';
import { addDays, iso, toMinutes } from './date';
import { occurs } from './recurrence';

export const REMINDER_MINUTES: Record<string, number> = { 15: 15, 60: 60, 1440: 1440 };

export interface DueReminder {
  key: string;
  at: number;
  event: CalendarEvent;
  on: ISODate;
  minutesBefore: number;
}

/** Zeitpunkt eines Vorkommens auf diesem Gerät. Ganztägige Termine gelten ab 8:00 Uhr. */
export function startOf(e: CalendarEvent, on: ISODate) {
  const [y, m, d] = on.split('-').map(Number);
  const min = e.allDay ? 8 * 60 : toMinutes(e.time || '12:00');
  return new Date(y, m - 1, d, Math.floor(min / 60), min % 60).getTime();
}

/** Erinnerungen mit Zeitpunkt in (fromMs, toMs] – gleiche Regeln wie server/reminders.mjs. */
export function dueReminders(events: CalendarEvent[], fromMs: number, toMs: number): DueReminder[] {
  const out: DueReminder[] = [];
  const first = addDays(iso(new Date(fromMs)), -1);
  const last = addDays(iso(new Date(toMs)), 2);
  for (const e of events) {
    const before = REMINDER_MINUTES[e.reminder];
    if (!before) continue;
    for (let on = first; on <= last; on = addDays(on, 1)) {
      if (!occurs(e, on)) continue;
      const at = startOf(e, on) - before * 60000;
      if (at > fromMs && at <= toMs) out.push({ key: `${e.id}|${on}|${before}`, at, event: e, on, minutesBefore: before });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export const forWhom = (eventOwner: CalendarEvent['owner'], deviceFor: 'Alle' | 'Person A' | 'Person B') =>
  deviceFor === 'Alle' || eventOwner === 'Beide' || eventOwner === deviceFor;
