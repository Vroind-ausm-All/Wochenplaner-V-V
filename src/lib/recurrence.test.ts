import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../store/types';
import { eventsOn, layoutLanes, matches, occurrences } from './recurrence';
import { fmt, monday, monthGrid } from './date';

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: Math.random().toString(), title: 'T', date: '2026-10-26', time: '18:00', duration: 60, category: 'Wir', owner: 'Beide', allDay: false, repeat: 'none', reminder: 'none', ...p,
});

describe('Wiederholungen', () => {
  it('folgt den Regeln des alten Boards', () => {
    expect(matches('2026-10-26', '2026-11-02', 'weekly')).toBe(true);
    expect(matches('2026-10-26', '2026-11-03', 'weekly')).toBe(false);
    expect(matches('2026-01-31', '2026-03-31', 'monthly')).toBe(true);
    expect(matches('2026-02-14', '2027-02-14', 'yearly')).toBe(true);
    expect(matches('2026-10-26', '2026-10-25', 'daily')).toBe(false);
  });
  it('überspringt Ausnahmen und sortiert ganztägige zuerst', () => {
    const list = [ev({ id: 'a', repeat: 'daily', exDates: ['2026-10-27'] }), ev({ id: 'b', allDay: true, date: '2026-10-28' })];
    expect(eventsOn(list, '2026-10-27')).toHaveLength(0);
    expect(eventsOn(list, '2026-10-28').map((e) => e.id)).toEqual(['b', 'a']);
    expect(occurrences(list, '2026-10-26', '2026-11-01')).toHaveLength(7);
  });
});

describe('Spurenlayout', () => {
  it('verteilt Überlappungen auf Spuren', () => {
    const lanes = layoutLanes([ev({ id: 'a', time: '18:00', duration: 90 }), ev({ id: 'b', time: '18:30' }), ev({ id: 'c', time: '20:00' })]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 1 });
  });
});

describe('Datum', () => {
  it('rechnet Wochen und Raster', () => {
    expect(monday('2026-11-01')).toBe('2026-10-26');
    expect(monthGrid('2026-10-15')[0]).toBe('2026-09-28');
    expect(fmt.kw('2026-10-27')).toBe(44);
  });
});

describe('Erinnerungen (Client)', async () => {
  const { dueReminders, forWhom } = await import('./reminders');
  it('findet fällige Erinnerungen genau im Zeitfenster', () => {
    const e = ev({ id: 'r', date: '2026-10-28', time: '18:00', reminder: '15', repeat: 'daily' });
    const t = (d: string, h: number, m: number) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8), h, m).getTime();
    expect(dueReminders([e], t('2026-10-29', 17, 44), t('2026-10-29', 17, 45)).map((r) => r.key)).toEqual(['r|2026-10-29|15']);
    expect(dueReminders([e], t('2026-10-29', 17, 45), t('2026-10-29', 18, 30))).toEqual([]);
    const allDay = ev({ id: 'g', date: '2026-11-05', allDay: true, reminder: '1440' });
    expect(dueReminders([allDay], t('2026-11-04', 7, 0), t('2026-11-04', 8, 0)).map((r) => r.key)).toEqual(['g|2026-11-05|1440']);
  });
  it('filtert nach Person', () => {
    expect(forWhom('Person A', 'Person B')).toBe(false);
    expect(forWhom('Beide', 'Person B')).toBe(true);
    expect(forWhom('Person A', 'Alle')).toBe(true);
  });
});
