import { describe, expect, it } from 'vitest';
import { LEGACY_KEY, loadLocal, normalize } from './migrate';

describe('Übernahme des alten Boards', () => {
  it('ergänzt fehlende Felder und behält Daten', () => {
    const d = normalize({ events: [{ id: 'x', title: 'Alt', date: '2026-01-01', time: '10:00' }], shopping: [], meals: { '2026-01-01': { Abend: { name: 'X', portions: 2, meat: false } } } });
    expect(d.events[0].duration).toBe(60);
    expect(d.settings.wirGoalMinutes).toBeGreaterThan(0);
    expect(d.meals['2026-01-01'].Abend?.name).toBe('X');
    expect(d.checkins).toEqual({});
  });
  it('liest beim ersten Start den alten Schlüssel', () => {
    const store = { getItem: (k: string) => (k === LEGACY_KEY ? JSON.stringify({ events: [], shopping: [{ id: 's', name: 'Milch', qty: '1', category: 'x', done: false }] }) : null) };
    const r = loadLocal(store);
    expect(r.migrated).toBe(true);
    expect(r.data.shopping[0].name).toBe('Milch');
  });
});
