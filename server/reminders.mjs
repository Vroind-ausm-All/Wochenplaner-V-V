// Fällige Erinnerungen berechnen. Ganztägige Termine beziehen sich auf 8:00 Uhr des Tages.
import { addDays, occursOn, utcToDate, wallToUtc } from './time.mjs';

export const OFFSETS = { 15: 15, 60: 60, 1440: 1440 };

/**
 * Alle Erinnerungen, deren Zeitpunkt im Intervall (fromMs, toMs] liegt.
 * Ergebnis: { key, at, event, on, minutesBefore }
 */
export function dueReminders(state, fromMs, toMs, tz) {
  const out = [];
  const firstDay = addDays(utcToDate(fromMs, tz), -1);
  const lastDay = addDays(utcToDate(toMs, tz), 2); // Erinnerung „1 Tag vorher“ reicht bis übermorgen
  for (const e of state?.events || []) {
    const before = OFFSETS[e.reminder];
    if (!before) continue;
    for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
      if (!occursOn(e, day)) continue;
      const start = wallToUtc(day, e.allDay ? '08:00' : e.time || '12:00', tz);
      const at = start - before * 60000;
      if (at > fromMs && at <= toMs) out.push({ key: `${e.id}|${day}|${before}`, at, start, event: e, on: day, minutesBefore: before });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Text der Benachrichtigung. */
export function reminderMessage(r, settings = {}) {
  const e = r.event;
  const who = e.owner === 'Person A' ? settings.personA : e.owner === 'Person B' ? settings.personB : null;
  const when = r.minutesBefore === 1440 ? 'Morgen' : r.minutesBefore === 60 ? 'In 1 Std.' : `In ${r.minutesBefore} Min.`;
  const time = e.allDay ? 'ganztags' : `${e.time} Uhr`;
  return {
    title: `${when}: ${e.title}`,
    body: [time, who].filter(Boolean).join(' · '),
    tag: r.key,
    url: './',
    owner: e.owner || 'Beide',
  };
}

/** Gilt eine Erinnerung für ein Abo? Abo-Person „Alle“ bekommt alles. */
export const forSubscriber = (eventOwner, subOwner) => subOwner === 'Alle' || eventOwner === 'Beide' || eventOwner === subOwner;
