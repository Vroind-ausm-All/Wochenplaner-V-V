import { describe, expect, it } from 'vitest';
import { seed } from '../../store/defaults';
import type { CalendarEvent } from '../../store/types';
import { analyze, freeSlots } from './engine';

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: Math.random().toString(), title: 'Termin', date: '2026-10-27', time: '18:00', duration: 60, category: 'Arbeit', owner: 'Person A', allDay: false, repeat: 'none', reminder: 'none', ...p,
});

describe('freie Zeitfenster', () => {
  it('lässt Puffer nach Terminen', () => {
    const slots = freeSlots([{ ...ev({}), on: '2026-10-27' }], '2026-10-27', ['17:00', '22:00']);
    expect(slots).toEqual([[17 * 60, 18 * 60], [19 * 60 + 15, 22 * 60]]);
  });
});

describe('WIR-Begleiter', () => {
  const base = () => {
    const d = seed();
    d.events = [];
    return d;
  };
  it('schlägt Check-in, Date Night und Wir-Zeit in freien Fenstern vor', () => {
    const r = analyze({ data: base(), today: '2026-10-27', now: '08:00' });
    const kinds = r.suggestions.map((s) => s.kind);
    expect(kinds).toContain('checkin');
    expect(kinds).toContain('date');
    expect(kinds).toContain('wir');
    expect(r.suggestions.every((s) => s.date >= '2026-10-27' && s.date <= '2026-11-01')).toBe(true);
    // Keine zwei Vorschläge am selben Tag
    expect(new Set(r.suggestions.map((s) => s.date)).size).toBe(r.suggestions.length);
  });
  it('feiert, wenn das Wir-Ziel erreicht ist', () => {
    const d = base();
    d.events = [ev({ category: 'Wir', owner: 'Beide', duration: 240, date: '2026-10-26', title: 'Date Night' })];
    const r = analyze({ data: d, today: '2026-10-27', now: '12:00' });
    expect(r.mood).toBe('celebrate');
    expect(r.daysSinceDate).toBe(1);
  });
  it('reagiert auf niedrige Energie beider Personen', () => {
    const d = base();
    d.checkins['2026-10-27'] = { a: 1, b: 1 };
    const r = analyze({ data: d, today: '2026-10-27', now: '17:00' });
    expect(r.mood).toBe('concerned');
    expect(r.suggestions[0].kind).toBe('rest');
  });
  it('verwirft keine Vorschläge doppelt', () => {
    const d = base();
    d.dismissed['checkin-2026-10-26'] = '2026-10-27';
    expect(analyze({ data: d, today: '2026-10-27', now: '08:00' }).suggestions.map((s) => s.kind)).not.toContain('checkin');
  });
});

describe('WIR-Begleiter mit Abo-Kalendern und Feiertagen', () => {
  const ext = (on: string, time: string, duration: number, busy = true) => ({
    id: `ext:${on}:${time}`, on, date: on, title: 'Dienst', time, duration, allDay: false, category: 'Termin' as const, owner: 'Person A' as const,
    repeat: 'none' as const, reminder: 'none' as const, external: { kind: 'ics' as const, calendarId: 'c', calendarName: 'Arbeit', hue: 200, busy },
  });
  it('plant nicht in belegte Abo-Termine hinein', () => {
    const d = seed();
    d.events = [];
    // Jeden Abend der Woche bis 21:30 belegt – nur „nicht belegt“ markierte Abos bleiben frei.
    const external = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].map((day) => ext(day, '17:00', 270));
    const r = analyze({ data: d, today: '2026-10-27', now: '08:00', external });
    expect(r.suggestions.every((s) => s.date >= '2026-10-31')).toBe(true);
    const free = analyze({ data: d, today: '2026-10-27', now: '08:00', external: external.map((e) => ({ ...e, external: { ...e.external, busy: false } })) });
    expect(free.suggestions.some((s) => s.date < '2026-10-31')).toBe(true);
  });
  it('nutzt Feiertage wie Wochenenden und erwähnt sie', () => {
    const d = seed();
    d.events = [];
    const holiday = { ...ext('2026-10-29', '00:00', 1440, false), title: 'Reformationstag', allDay: true, external: { kind: 'holiday' as const, calendarId: 'feiertage', calendarName: 'Feiertag', hue: 0, busy: false, official: true } };
    const r = analyze({ data: d, today: '2026-10-27', now: '08:00', external: [holiday] });
    expect(r.messages.join(' ')).toContain('Reformationstag');
    expect(r.suggestions.find((s) => s.date === '2026-10-29' && s.time < '18:00')).toBeTruthy();
  });
});

describe('WIR-Begleiter bei Wetterwarnungen', () => {
  it('schlägt bei Warnung keine Ideen für draußen vor und sagt warum', () => {
    const d = seed();
    d.events = [];
    const weather = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map((date) => ({ date, code: 0, max: 18, min: 8, rain: 0, sunrise: '07:00', sunset: '17:00' }));
    const start = new Date('2026-10-26T00:00:00').getTime();
    const alerts = [{ event: 'STURMBÖEN', severity: 'severe', onset: start, expires: start + 7 * 864e5 }];
    const r = analyze({ data: d, today: '2026-10-27', now: '08:00', weather, alerts });
    const wir = r.suggestions.find((s) => s.kind === 'wir');
    expect(wir?.idea?.place).not.toBe('draußen');
    expect(r.messages.join(' ')).toContain('Sturmböen');
    expect(r.mood).toBe('concerned');
    const calm = analyze({ data: d, today: '2026-10-27', now: '08:00', weather });
    expect(calm.suggestions.find((s) => s.kind === 'wir')?.idea?.place).not.toBe('drinnen');
  });
});
