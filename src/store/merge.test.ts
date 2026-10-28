import { describe, expect, it } from 'vitest';
import { seed } from './defaults';
import { equal, merge3 } from './merge';

const item = (id: string, p: object = {}) => ({ id, name: id, done: false, ...p });

describe('Drei-Wege-Abgleich', () => {
  it('übernimmt die Änderung der jeweils anderen Seite', () => {
    expect(merge3({ a: 1 }, { a: 1 }, { a: 2 })).toEqual({ a: 2 });
    expect(merge3({ a: 1 }, { a: 3 }, { a: 1 })).toEqual({ a: 3 });
  });

  it('führt Änderungen an verschiedenen Einträgen zusammen', () => {
    const base = [item('milch'), item('brot')];
    const handy = [item('milch', { done: true }), item('brot')];
    const tablet = [item('milch'), item('brot'), item('reis')];
    expect(merge3(base, handy, tablet)).toEqual([item('milch', { done: true }), item('brot'), item('reis')]);
  });

  it('führt Änderungen an verschiedenen Feldern desselben Eintrags zusammen', () => {
    const base = { id: 'e', title: 'Spaziergang', time: '18:00' };
    expect(merge3(base, { ...base, time: '19:00' }, { ...base, title: 'Abendspaziergang' })).toEqual({ id: 'e', title: 'Abendspaziergang', time: '19:00' });
  });

  it('gibt bei echtem Konflikt der lokalen Änderung den Vorrang', () => {
    const base = { id: 'e', time: '18:00' };
    expect(merge3(base, { id: 'e', time: '19:00' }, { id: 'e', time: '20:00' })).toEqual({ id: 'e', time: '19:00' });
  });

  it('löscht nur, wenn die andere Seite nichts geändert hat', () => {
    const base = [item('a'), item('b')];
    expect(merge3(base, [item('b')], [item('a'), item('b', { done: true })])).toEqual([item('b', { done: true })]);
    // a wurde lokal gelöscht, remote aber geändert → bleibt erhalten
    expect(merge3(base, [item('b')], [item('a', { done: true }), item('b')])).toEqual([item('a', { done: true }), item('b')]);
  });

  it('gleicht verschachtelte Essenspläne pro Tag und Mahlzeit ab', () => {
    const base: Record<string, Record<string, { name: string }>> = { '2026-10-28': { Abend: { name: 'Risotto' } } };
    const local = { '2026-10-28': { Abend: { name: 'Risotto' }, Mittag: { name: 'Suppe' } } };
    const remote = { '2026-10-28': { Abend: { name: 'Risotto' } }, '2026-10-29': { Abend: { name: 'Paella' } } };
    expect(merge3(base, local, remote)).toEqual({ '2026-10-28': { Abend: { name: 'Risotto' }, Mittag: { name: 'Suppe' } }, '2026-10-29': { Abend: { name: 'Paella' } } });
    // Abend lokal entfernt, remote unverändert → entfernt
    expect(merge3(base, { '2026-10-28': {} }, base)).toEqual({ '2026-10-28': {} });
  });

  it('behandelt Favoriten als Menge und die Checkliste positionsweise', () => {
    expect(merge3(['a', 'b'], ['a', 'b', 'c'], ['b', 'd']).sort()).toEqual(['b', 'c', 'd']);
    expect(merge3([false, false, false], [true, false, false], [false, false, true])).toEqual([true, false, true]);
  });

  it('funktioniert mit vollständigen Planerdaten', () => {
    const base = seed();
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.shopping[0].done = true;
    local.settings.personA = 'Vera';
    remote.events.push({ ...remote.events[0], id: 'neu', title: 'Kino' });
    remote.settings.personB = 'Valentin';
    const m = merge3(base, local, remote);
    expect(m.shopping[0].done).toBe(true);
    expect(m.events.map((e) => e.title)).toContain('Kino');
    expect([m.settings.personA, m.settings.personB]).toEqual(['Vera', 'Valentin']);
    expect(equal(merge3(base, base, base), base)).toBe(true);
  });
});
