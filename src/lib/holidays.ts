import type { ISODate } from '../store/types';
import { addDays, pad } from './date';

/** Bundesländer nach amtlichem Kürzel. */
export const STATES = {
  BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland',
  SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
} as const;
export type State = keyof typeof STATES;

export interface Holiday {
  date: ISODate;
  name: string;
  /** gesetzlicher Feiertag (arbeitsfrei) oder nur besonderer Tag */
  official: boolean;
}

/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch, anonymer Algorithmus). */
export function easter(year: number): ISODate {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

const fixed = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const weekday = (s: ISODate) => new Date(`${s}T12:00:00Z`).getUTCDay(); // 0 = Sonntag

/**
 * Gesetzliche Feiertage eines Jahres für ein Bundesland – rein berechnet, ohne Internet.
 * Regional begrenzte Feiertage (z. B. Mariä Himmelfahrt in Teilen Bayerns, Fronleichnam in Teilen
 * Sachsens/Thüringens, Augsburger Friedensfest) sind nicht enthalten.
 */
export function holidays(year: number, state: State | null, special = true): Holiday[] {
  const e = easter(year);
  const is = (...s: State[]) => !!state && s.includes(state);
  const list: [ISODate, string, boolean][] = [
    [fixed(year, 1, 1), 'Neujahr', true],
    [fixed(year, 1, 6), 'Heilige Drei Könige', is('BW', 'BY', 'ST')],
    [fixed(year, 3, 8), 'Internationaler Frauentag', is('BE', 'MV')],
    [addDays(e, -2), 'Karfreitag', true],
    [e, 'Ostersonntag', is('BB')],
    [addDays(e, 1), 'Ostermontag', true],
    [fixed(year, 5, 1), 'Tag der Arbeit', true],
    [addDays(e, 39), 'Christi Himmelfahrt', true],
    [addDays(e, 49), 'Pfingstsonntag', is('BB')],
    [addDays(e, 50), 'Pfingstmontag', true],
    [addDays(e, 60), 'Fronleichnam', is('BW', 'BY', 'HE', 'NW', 'RP', 'SL')],
    [fixed(year, 8, 15), 'Mariä Himmelfahrt', is('SL')],
    [fixed(year, 9, 20), 'Weltkindertag', is('TH')],
    [fixed(year, 10, 3), 'Tag der Deutschen Einheit', true],
    [fixed(year, 10, 31), 'Reformationstag', is('BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH')],
    [fixed(year, 11, 1), 'Allerheiligen', is('BW', 'BY', 'NW', 'RP', 'SL')],
    [bussUndBettag(year), 'Buß- und Bettag', is('SN')],
    [fixed(year, 12, 25), '1. Weihnachtstag', true],
    [fixed(year, 12, 26), '2. Weihnachtstag', true],
  ];
  const out: Holiday[] = list.filter(([, , on]) => on).map(([date, name]) => ({ date, name, official: true }));
  if (special) {
    // Keine Feiertage, aber für Familie und Paar wichtige Tage.
    out.push(
      { date: fixed(year, 2, 14), name: 'Valentinstag', official: false },
      { date: muttertag(year), name: 'Muttertag', official: false },
      { date: fixed(year, 12, 24), name: 'Heiligabend', official: false },
      { date: fixed(year, 12, 31), name: 'Silvester', official: false },
    );
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Mittwoch vor dem 23. November. */
function bussUndBettag(year: number): ISODate {
  let d = fixed(year, 11, 22);
  while (weekday(d) !== 3) d = addDays(d, -1);
  return d;
}

/** Zweiter Sonntag im Mai. */
function muttertag(year: number): ISODate {
  let d = fixed(year, 5, 1);
  while (weekday(d) !== 0) d = addDays(d, 1);
  return addDays(d, 7);
}

export function holidaysBetween(from: ISODate, to: ISODate, state: State | null, special = true): Holiday[] {
  const years = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) years.push(y);
  return years.flatMap((y) => holidays(y, state, special)).filter((h) => h.date >= from && h.date <= to);
}
