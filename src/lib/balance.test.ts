import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Task } from '../store/types';
import { heavierSide, weekBalance } from './balance';
import { occurrenceIndex, taskOccurrences, taskOwnerOn } from './recurrence';

const task = (p: Partial<Task>): Task => ({ id: Math.random().toString(36), title: 'x', owner: 'Person A', due: '2026-11-02', repeat: 'none', doneDates: [], notes: '', ...p });
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({ id: Math.random().toString(36), title: 'x', date: '2026-11-03', time: '10:00', duration: 60, category: 'Familie', owner: 'Person B', allDay: false, repeat: 'none', reminder: 'none', ...p });

describe('Wechselnde Zuständigkeit', () => {
  it('zählt Vorkommen je Wiederholung', () => {
    expect(occurrenceIndex('2026-11-02', '2026-11-16', 'weekly')).toBe(2);
    expect(occurrenceIndex('2026-11-02', '2026-11-05', 'daily')).toBe(3);
    expect(occurrenceIndex('2026-01-31', '2026-03-31', 'monthly')).toBe(2);
  });

  it('wechselt wöchentlich zwischen A und B', () => {
    const t = task({ title: 'Müll', repeat: 'weekly', rotate: true });
    expect(['2026-11-02', '2026-11-09', '2026-11-16'].map((d) => taskOwnerOn(t, d))).toEqual(['Person A', 'Person B', 'Person A']);
    expect(taskOccurrences([t], '2026-11-09', '2026-11-09')[0].owner).toBe('Person B');
  });

  it('Einzel-Übernahme gilt vor der Wechsel-Regel', () => {
    const t = task({ repeat: 'weekly', rotate: true, ownerOn: { '2026-11-09': 'Person A' } });
    expect(taskOwnerOn(t, '2026-11-09')).toBe('Person A');
    expect(taskOwnerOn(t, '2026-11-16')).toBe('Person A');
  });

  it('ohne Wechsel bleibt die feste Person; „Beide“ wechselt nie', () => {
    expect(taskOwnerOn(task({ repeat: 'weekly' }), '2026-11-09')).toBe('Person A');
    expect(taskOwnerOn(task({ repeat: 'weekly', rotate: true, owner: 'Beide' }), '2026-11-09')).toBe('Beide');
  });
});

describe('Wer trägt was', () => {
  const week = '2026-11-02';
  it('zählt Aufgaben, Erledigtes und Organisations-Termine je Person', () => {
    const b = weekBalance(
      {
        tasks: [task({ repeat: 'daily', doneDates: ['2026-11-02', '2026-11-03'] }), task({ owner: 'Person B', due: '2026-11-04' }), task({ owner: 'Kind', due: '2026-11-04' })],
        events: [ev({}), ev({ category: 'Arbeit' }), ev({ category: 'Wir', owner: 'Beide' }), ev({ category: 'Haushalt', owner: 'Beide' })],
      },
      week,
    );
    expect(b['Person A']).toEqual({ tasks: 7, done: 2, events: 0 });
    expect(b['Person B']).toEqual({ tasks: 1, done: 0, events: 1 });
    expect(b.Beide).toEqual({ tasks: 0, done: 0, events: 1 });
  });

  it('meldet nur deutliche Unterschiede', () => {
    const s = (tasks: number) => ({ tasks, done: 0, events: 0 });
    expect(heavierSide({ 'Person A': s(7), 'Person B': s(2), Beide: s(0) })).toBe('Person A');
    expect(heavierSide({ 'Person A': s(4), 'Person B': s(3), Beide: s(0) })).toBeNull();
    expect(heavierSide({ 'Person A': s(1), 'Person B': s(3), Beide: s(0) })).toBeNull();
  });
});
