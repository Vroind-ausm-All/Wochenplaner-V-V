// Zeitzonen und Wiederholungen auf dem Server (gleiche Regeln wie src/lib/recurrence.ts).

export const serverZone = () => process.env.WIR_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';

const fmtCache = new Map();
function offsetMinutes(tz, utcMs) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs) / 60000);
}

/** Wandzeit „2026-11-03“ + „19:00“ in Zeitzone tz → Zeitpunkt (ms). */
export function wallToUtc(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = (time || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - offsetMinutes(tz, guess) * 60000;
  t = guess - offsetMinutes(tz, t) * 60000;
  return t;
}

/** Zeitpunkt → lokales Datum in tz. */
export function utcToDate(ms, tz) {
  const shifted = new Date(ms + offsetMinutes(tz, ms) * 60000);
  return shifted.toISOString().slice(0, 10);
}

export const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function matches(start, target, repeat) {
  if (target < start) return false;
  if (target === start) return true;
  const a = new Date(`${start}T12:00:00Z`), b = new Date(`${target}T12:00:00Z`);
  switch (repeat) {
    case 'daily': return true;
    case 'weekly': return a.getUTCDay() === b.getUTCDay();
    case 'monthly': return a.getUTCDate() === b.getUTCDate();
    case 'yearly': return a.getUTCDate() === b.getUTCDate() && a.getUTCMonth() === b.getUTCMonth();
    default: return false;
  }
}

export const occursOn = (e, day) => matches(e.date, day, e.repeat || 'none') && !(e.exDates || []).includes(day);
