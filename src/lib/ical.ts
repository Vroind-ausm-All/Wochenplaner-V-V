import type { ISODate, Time } from '../store/types';
import { pad } from './date';

/**
 * Schlanker iCalendar-Leser (RFC 5545) für Kalender-Abos: Google, iCloud, Outlook, Schulferien, Müllabfuhr …
 * Unterstützt ganztägige und zeitgebundene Termine, Zeitzonen (TZID), Dauer, Wiederholungen
 * (DAILY/WEEKLY/MONTHLY/YEARLY mit INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH),
 * Ausnahmen (EXDATE), geänderte Einzeltermine (RECURRENCE-ID) und abgesagte Termine.
 */

export interface IcsOccurrence {
  uid: string;
  title: string;
  date: ISODate; // lokales Datum dieses Geräts
  time: Time; // lokale Uhrzeit, bei ganztägig '00:00'
  duration: number; // Minuten
  allDay: boolean;
  location?: string;
  description?: string;
  /** Bei mehrtägigen Ganztagsterminen: Tag x von y */
  span?: { day: number; of: number };
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

interface Stamp {
  /** Wandzeit, wie im Kalender angegeben */
  y: number; m: number; d: number; h: number; min: number;
  allDay: boolean;
  utc: boolean;
  tz?: string;
}

interface RawEvent {
  uid: string;
  summary: string;
  location?: string;
  description?: string;
  start: Stamp;
  end?: Stamp;
  duration?: number;
  rrule?: Record<string, string>;
  exdates: Stamp[];
  recurrenceId?: Stamp;
  cancelled: boolean;
}

// ---------------------------------------------------------------------------------------------
// Zerlegen

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n').filter(Boolean);
}

function parseLine(line: string): Prop | null {
  // Doppelpunkt außerhalb von Anführungszeichen trennt Name/Parameter vom Wert.
  let quoted = false, idx = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;
  const [name, ...rawParams] = line.slice(0, idx).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(idx + 1) };
}

const unescape = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();

/** Outlook/Exchange schreibt Windows-Zeitzonennamen. Die häufigsten auf IANA abbilden. */
const WINDOWS_TZ: Record<string, string> = {
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Romance Standard Time': 'Europe/Paris',
  'GMT Standard Time': 'Europe/London',
  UTC: 'UTC',
};

function zone(tz: string | undefined): string | undefined {
  if (!tz) return undefined;
  const clean = tz.replace(/^\//, '');
  const mapped = WINDOWS_TZ[clean] ?? clean;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: mapped });
    return mapped;
  } catch {
    // Exotische Namen wie „/freeassociation.sourceforge.net/Europe/Berlin“
    const m = clean.match(/[A-Za-z]+\/[A-Za-z_]+$/);
    return m ? zone(m[0]) : undefined;
  }
}

function parseStamp(p: Prop): Stamp | null {
  const v = p.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const allDay = p.params.VALUE === 'DATE' || !m[4];
  return {
    y: +m[1], m: +m[2], d: +m[3], h: allDay ? 0 : +m[4], min: allDay ? 0 : +m[5],
    allDay, utc: !!m[7], tz: m[7] ? undefined : zone(p.params.TZID),
  };
}

/** ISO-8601-Dauer (P1D, PT1H30M, P1W) in Minuten. */
function parseDuration(v: string): number | undefined {
  const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return undefined;
  return (+(m[2] || 0) * 7 + +(m[3] || 0)) * 1440 + +(m[4] || 0) * 60 + +(m[5] || 0);
}

export function parseIcs(text: string): RawEvent[] {
  const events: RawEvent[] = [];
  let cur: RawEvent | null = null;
  let depth = 0; // verschachtelte Komponenten (VALARM) überspringen
  for (const line of unfold(text)) {
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === 'BEGIN') {
      if (p.value.toUpperCase() === 'VEVENT' && !cur) cur = { uid: '', summary: '', start: null as unknown as Stamp, exdates: [], cancelled: false };
      else if (cur) depth++;
      continue;
    }
    if (p.name === 'END') {
      if (cur && depth > 0) depth--;
      else if (cur && p.value.toUpperCase() === 'VEVENT') {
        if (cur.start) events.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur || depth > 0) continue;
    switch (p.name) {
      case 'UID': cur.uid = p.value.trim(); break;
      case 'SUMMARY': cur.summary = unescape(p.value); break;
      case 'LOCATION': cur.location = unescape(p.value) || undefined; break;
      case 'DESCRIPTION': cur.description = unescape(p.value).slice(0, 500) || undefined; break;
      case 'DTSTART': cur.start = parseStamp(p) as Stamp; break;
      case 'DTEND': cur.end = parseStamp(p) ?? undefined; break;
      case 'DURATION': cur.duration = parseDuration(p.value.trim()); break;
      case 'STATUS': cur.cancelled = p.value.trim().toUpperCase() === 'CANCELLED'; break;
      case 'RECURRENCE-ID': cur.recurrenceId = parseStamp(p) ?? undefined; break;
      case 'RRULE':
        cur.rrule = Object.fromEntries(p.value.split(';').map((kv) => kv.split('=')).filter((kv) => kv.length === 2).map(([k, v]) => [k.toUpperCase(), v]));
        break;
      case 'EXDATE':
        for (const v of p.value.split(',')) {
          const s = parseStamp({ ...p, value: v });
          if (s) cur.exdates.push(s);
        }
        break;
    }
  }
  return events;
}

// ---------------------------------------------------------------------------------------------
// Zeit: Wandzeit in einer Zeitzone → Zeitpunkt → lokale Wandzeit dieses Geräts

const offsetCache = new Map<string, Intl.DateTimeFormat>();
function tzOffsetMinutes(tz: string, utcMs: number): number {
  let f = offsetCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    offsetCache.set(tz, f);
  }
  const parts = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - utcMs) / 60000);
}

function instant(y: number, m: number, d: number, h: number, min: number, s: Stamp): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  if (s.utc) return guess;
  if (!s.tz) return new Date(y, m - 1, d, h, min).getTime(); // „schwebende“ Zeit = Gerätezeit
  let t = guess - tzOffsetMinutes(s.tz, guess) * 60000;
  t = guess - tzOffsetMinutes(s.tz, t) * 60000; // Sommerzeit-Grenzen
  return t;
}

const localParts = (ms: number) => {
  const d = new Date(ms);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

// ---------------------------------------------------------------------------------------------
// Wiederholungen (auf Kalendertagen im UTC-Raster – frei von Sommerzeit-Effekten)

const DAY = 864e5;
const dayNum = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / DAY;
const fromDayNum = (n: number) => {
  const d = new Date(n * DAY);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() };
};
const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function byDayMatches(spec: string, y: number, m: number, d: number, wd: number, monthly: boolean) {
  return spec.split(',').some((entry) => {
    const mm = entry.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
    if (!mm || WD[wd] !== mm[2]) return false;
    if (!mm[1] || !monthly) return true;
    const n = +mm[1];
    return n > 0 ? Math.ceil(d / 7) === n : Math.ceil((daysInMonth(y, m) - d + 1) / 7) === -n;
  });
}

function ruleMatches(rule: Record<string, string>, start: Stamp, n: number, startN: number): boolean {
  const { y, m, d, wd } = fromDayNum(n);
  const interval = Math.max(1, +(rule.INTERVAL || 1));
  if (rule.BYMONTH && !rule.BYMONTH.split(',').map(Number).includes(m)) return false;
  switch ((rule.FREQ || '').toUpperCase()) {
    case 'DAILY':
      return (n - startN) % interval === 0 && (!rule.BYDAY || byDayMatches(rule.BYDAY, y, m, d, wd, false));
    case 'WEEKLY': {
      const monday = (x: number) => x - ((fromDayNum(x).wd + 6) % 7);
      if (((monday(n) - monday(startN)) / 7) % interval !== 0) return false;
      return rule.BYDAY ? byDayMatches(rule.BYDAY, y, m, d, wd, false) : wd === fromDayNum(startN).wd;
    }
    case 'MONTHLY': {
      if (((y - start.y) * 12 + (m - start.m)) % interval !== 0) return false;
      if (rule.BYDAY) return byDayMatches(rule.BYDAY, y, m, d, wd, true);
      const days = (rule.BYMONTHDAY || String(start.d)).split(',').map(Number);
      return days.some((x) => (x > 0 ? x === d : daysInMonth(y, m) + x + 1 === d));
    }
    case 'YEARLY': {
      if ((y - start.y) % interval !== 0) return false;
      if (!rule.BYMONTH && m !== start.m) return false;
      if (rule.BYDAY) return byDayMatches(rule.BYDAY, y, m, d, wd, true);
      const days = (rule.BYMONTHDAY || String(start.d)).split(',').map(Number);
      return days.some((x) => (x > 0 ? x === d : daysInMonth(y, m) + x + 1 === d));
    }
    default:
      return n === startN;
  }
}

// ---------------------------------------------------------------------------------------------
// Ausklappen in konkrete Termine

const stampKey = (s: Stamp) => `${s.y}-${pad(s.m)}-${pad(s.d)}${s.allDay ? '' : `T${pad(s.h)}${pad(s.min)}`}`;

export function expandIcs(text: string, from: ISODate, to: ISODate, limit = 5000): IcsOccurrence[] {
  const raw = parseIcs(text);
  const overrides = new Map<string, RawEvent>();
  for (const e of raw) if (e.recurrenceId) overrides.set(`${e.uid}|${stampKey(e.recurrenceId)}`, e);

  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromN = dayNum(fy, fm, fd) - 1, toN = dayNum(ty, tm, td) + 1; // Zeitzonen-Puffer
  const out: IcsOccurrence[] = [];

  const emit = (e: RawEvent, y: number, m: number, d: number) => {
    const s = e.start;
    let duration = e.duration;
    if (duration === undefined && e.end) {
      duration = s.allDay
        ? (dayNum(e.end.y, e.end.m, e.end.d) - dayNum(s.y, s.m, s.d)) * 1440
        : Math.round((instant(e.end.y, e.end.m, e.end.d, e.end.h, e.end.min, e.end) - instant(s.y, s.m, s.d, s.h, s.min, s)) / 60000);
    }
    duration = Math.max(s.allDay ? 1440 : 0, duration ?? (s.allDay ? 1440 : 60));
    const base = { uid: e.uid, title: e.summary || '(ohne Titel)', location: e.location, description: e.description };
    if (s.allDay) {
      const days = Math.max(1, Math.round(duration / 1440));
      const startN = dayNum(y, m, d);
      for (let i = 0; i < days; i++) {
        const x = fromDayNum(startN + i);
        const date = `${x.y}-${pad(x.m)}-${pad(x.d)}`;
        if (date >= from && date <= to) out.push({ ...base, date, time: '00:00', duration: 1440, allDay: true, ...(days > 1 ? { span: { day: i + 1, of: days } } : {}) });
      }
    } else {
      const { date, time } = localParts(instant(y, m, d, s.h, s.min, s));
      if (date >= from && date <= to) out.push({ ...base, date, time, duration, allDay: false });
    }
  };

  for (const e of raw) {
    if (e.recurrenceId) continue; // als Ersatz für ein Vorkommen behandelt
    if (e.cancelled) continue;
    const s = e.start;
    const startN = dayNum(s.y, s.m, s.d);
    if (!e.rrule) {
      const spanDays = s.allDay ? Math.max(1, Math.round((e.duration ?? (e.end ? (dayNum(e.end.y, e.end.m, e.end.d) - startN) * 1440 : 1440)) / 1440)) : 1;
      if (startN + spanDays >= fromN && startN <= toN) emit(e, s.y, s.m, s.d);
      continue;
    }
    const rule = e.rrule;
    const count = rule.COUNT ? +rule.COUNT : Infinity;
    let untilN = Infinity;
    if (rule.UNTIL) {
      const u = parseStamp({ name: 'UNTIL', params: {}, value: rule.UNTIL });
      if (u) untilN = dayNum(u.y, u.m, u.d);
    }
    const ex = new Set(e.exdates.map((x) => `${x.y}-${pad(x.m)}-${pad(x.d)}`));
    let seen = 0;
    const last = Math.min(untilN, toN);
    // Ohne COUNT reicht es, kurz vor dem Fenster einzusteigen (Spannen ganztägiger Serien abdecken).
    let n = count === Infinity ? Math.max(startN, fromN - 31) : startN;
    if (count === Infinity && rule.FREQ === 'YEARLY') n = Math.max(startN, fromN - 366);
    for (; n <= last && seen < count; n++) {
      if (n !== startN && !ruleMatches(rule, s, n, startN)) continue;
      if (n < startN) continue;
      seen++;
      const { y, m, d } = fromDayNum(n);
      const key = `${y}-${pad(m)}-${pad(d)}`;
      if (ex.has(key)) continue;
      const over = overrides.get(`${e.uid}|${s.allDay ? key : `${key}T${pad(s.h)}${pad(s.min)}`}`);
      if (over) {
        if (!over.cancelled) emit({ ...over, rrule: undefined }, over.start.y, over.start.m, over.start.d);
      } else emit(e, y, m, d);
      if (out.length > limit) break;
    }
  }
  // Geänderte Einzeltermine ohne zugehörige Serie (manche Exporte enthalten nur die Ausnahme).
  const masters = new Set(raw.filter((e) => !e.recurrenceId).map((e) => e.uid));
  for (const o of overrides.values()) if (!masters.has(o.uid) && !o.cancelled) emit({ ...o, rrule: undefined }, o.start.y, o.start.m, o.start.d);
  return out.sort((a, b) => a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || a.time.localeCompare(b.time));
}
