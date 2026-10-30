import { describe, expect, it } from 'vitest';
import { easter, holidays, holidaysBetween } from './holidays';

const names = (y: number, s: Parameters<typeof holidays>[1]) => Object.fromEntries(holidays(y, s, false).map((h) => [h.name, h.date]));

describe('Feiertage', () => {
  it('berechnet Ostern korrekt', () => {
    expect(easter(2026)).toBe('2026-04-05');
    expect(easter(2027)).toBe('2027-03-28');
    expect(easter(2030)).toBe('2030-04-21');
  });
  it('kennt bundesweite und bewegliche Feiertage 2026', () => {
    const h = names(2026, 'BE');
    expect(h['Karfreitag']).toBe('2026-04-03');
    expect(h['Christi Himmelfahrt']).toBe('2026-05-14');
    expect(h['Pfingstmontag']).toBe('2026-05-25');
    expect(h['Internationaler Frauentag']).toBe('2026-03-08');
    expect(h['Fronleichnam']).toBeUndefined();
  });
  it('unterscheidet nach Bundesland', () => {
    expect(names(2026, 'BY')['Fronleichnam']).toBe('2026-06-04');
    expect(names(2026, 'BY')['Allerheiligen']).toBe('2026-11-01');
    expect(names(2026, 'SN')['Buß- und Bettag']).toBe('2026-11-18');
    expect(names(2027, 'SN')['Buß- und Bettag']).toBe('2027-11-17');
    expect(names(2026, 'TH')['Weltkindertag']).toBe('2026-09-20');
    expect(names(2026, 'NI')['Reformationstag']).toBe('2026-10-31');
    expect(holidays(2026, 'NW', false)).toHaveLength(11);
    expect(holidays(2026, null, false)).toHaveLength(9);
  });
  it('ergänzt besondere Tage wie Valentinstag und Muttertag', () => {
    const special = holidays(2026, 'HH').filter((h) => !h.official).map((h) => `${h.name} ${h.date}`);
    expect(special).toEqual(['Valentinstag 2026-02-14', 'Muttertag 2026-05-10', 'Heiligabend 2026-12-24', 'Silvester 2026-12-31']);
  });
  it('liefert Zeiträume über den Jahreswechsel', () => {
    expect(holidaysBetween('2026-12-20', '2027-01-07', 'BW').map((h) => h.name)).toEqual(['Heiligabend', '1. Weihnachtstag', '2. Weihnachtstag', 'Silvester', 'Neujahr', 'Heilige Drei Könige']);
  });
});
