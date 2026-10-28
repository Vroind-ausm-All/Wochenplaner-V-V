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
