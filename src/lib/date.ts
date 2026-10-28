import type { ISODate, Time } from '../store/types';

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;

export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Mittag als Uhrzeit, damit Sommerzeitwechsel keine Tage verschieben. */
export const parse = (s: ISODate) => new Date(`${s}T12:00:00`);
export const today = (): ISODate => iso(new Date());
export const addDays = (s: ISODate, n: number): ISODate => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const addMonths = (s: ISODate, n: number): ISODate => {
  const d = parse(s);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return iso(d);
};
/** 0 = Montag … 6 = Sonntag */
export const weekdayIndex = (s: ISODate) => (parse(s).getDay() + 6) % 7;
export const monday = (s: ISODate) => addDays(s, -weekdayIndex(s));
export const monthStart = (s: ISODate) => `${s.slice(0, 7)}-01`;
export const isWeekend = (s: ISODate) => weekdayIndex(s) >= 5;
export const daysBetween = (a: ISODate, b: ISODate) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
export const range = (from: ISODate, count: number) => Array.from({ length: count }, (_, i) => addDays(from, i));
export const weekOf = (s: ISODate) => range(monday(s), 7);

/** Die 6×7 Tage eines Monatsrasters, beginnend am Montag. */
export const monthGrid = (s: ISODate) => range(monday(monthStart(s)), 42);

export const toMinutes = (t: Time) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const fromMinutes = (n: number): Time => {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(n)));
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`;
};
export const nowTime = (): Time => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const de = 'de-DE';
export const fmt = {
  short: (s: ISODate) => parse(s).toLocaleDateString(de, { day: 'numeric', month: 'short' }),
  long: (s: ISODate) => parse(s).toLocaleDateString(de, { weekday: 'long', day: 'numeric', month: 'long' }),
  dayShort: (s: ISODate) => parse(s).toLocaleDateString(de, { weekday: 'short', day: 'numeric', month: 'short' }),
  month: (s: ISODate) => parse(s).toLocaleDateString(de, { month: 'long', year: 'numeric' }),
  weekday: (s: ISODate) => WEEKDAYS[weekdayIndex(s)],
  weekdayLong: (s: ISODate) => WEEKDAYS_LONG[weekdayIndex(s)],
  /** Kalenderwoche nach ISO 8601 */
  kw: (s: ISODate) => {
    const d = parse(s);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const jan4 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  },
  relative: (s: ISODate, ref: ISODate = today()) => {
    const n = daysBetween(ref, s);
    if (n === 0) return 'Heute';
    if (n === 1) return 'Morgen';
    if (n === -1) return 'Gestern';
    if (n > 1 && n < 7) return WEEKDAYS_LONG[weekdayIndex(s)];
    return fmt.dayShort(s);
  },
  duration: (min: number) => (min < 60 ? `${min} Min.` : `${Math.floor(min / 60)} Std.${min % 60 ? ` ${min % 60} Min.` : ''}`),
};
