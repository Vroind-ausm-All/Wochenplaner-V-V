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
