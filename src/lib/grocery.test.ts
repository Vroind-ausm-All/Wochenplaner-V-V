import { describe, expect, it } from 'vitest';
import { regenerateShopping, weeklyDemand } from './grocery';

describe('Einkaufsliste aus dem Essensplan', () => {
  const meals = {
    '2026-10-26': { Abend: { name: 'Risotto ai funghi', recipeId: 'risotto-ai-funghi', portions: 4, meat: true } },
    '2026-10-28': { Abend: { name: 'Paella de verduras', portions: 2, meat: false } },
  };
  it('skaliert Portionen und fasst gleiche Zutaten zusammen', () => {
    const d = weeklyDemand(meals, '2026-10-26');
    expect(d.find((x) => x.name === 'Risottoreis')?.amount).toBe(160 * 2 + 160);
    expect(d.find((x) => x.name === 'Hähnchenbrust')?.amount).toBe(500);
    expect(d.find((x) => x.name === 'Wasser')).toBeUndefined();
  });
  it('rechnet nur geprüft glutenfreie Vorräte an und behält manuelle Posten', () => {
    const list = regenerateShopping(
      [{ id: 'm', name: 'Kaffee', qty: '1', category: 'Lebensmittel', done: false }],
      [
        { id: 'i1', name: 'Risottoreis', qty: 500, min: 0, unit: 'g', category: 'Lebensmittel', gfStatus: 'verified' },
        { id: 'i2', name: 'Parmesan', qty: 500, min: 0, unit: 'g', category: 'Lebensmittel', gfStatus: 'unverified' },
      ],
      meals,
      '2026-10-26',
    );
    expect(list.find((x) => x.id === 'm')).toBeTruthy();
    expect(list.find((x) => x.name === 'Risottoreis')).toBeUndefined();
    expect(list.find((x) => x.name === 'Parmesan')?.qty).toBe('80 g');
  });
});
