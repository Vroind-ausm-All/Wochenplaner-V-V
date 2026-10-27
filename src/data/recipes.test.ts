import { describe, expect, it } from 'vitest';
import { CUISINES } from './cuisines';
import { BASICS, RECIPES, recipeById, recipeByName } from './recipes';
import { recipeNutrition } from '../lib/nutrition';

describe('Rezeptdaten', () => {
  it('hat eindeutige IDs', () => {
    const ids = [...RECIPES, ...BASICS].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('ordnet jedes Gericht einer bekannten Küche zu', () => {
    const known = new Set(CUISINES.map((c) => c.id));
    expect(RECIPES.filter((r) => !known.has(r.cuisine)).map((r) => r.name)).toEqual([]);
    for (const c of CUISINES) expect(RECIPES.filter((r) => r.cuisine === c.id).length, c.id).toBeGreaterThanOrEqual(5);
  });
  it('verlinkt nur existierende Grundrezepte', () => {
    const missing = [...RECIPES, ...BASICS].flatMap((r) => (r.homemade || []).filter((h) => !recipeById(h)));
    expect(missing).toEqual([]);
  });
  it('findet Mahlzeiten des alten Boards über den Namen', () => {
    expect(recipeByName('Kokos-Gemüsecurry mit Reis')?.id).toBe('kokos-gemusecurry-mit-reis');
  });
  it('kann für jedes Gericht vollständige Nährwerte schätzen', () => {
    const incomplete = RECIPES.filter((r) => !recipeNutrition(r, true)?.complete).map((r) => r.name);
    expect(incomplete).toEqual([]);
    for (const r of RECIPES) {
      const n = recipeNutrition(r)!.values;
      expect(n.kcal, r.name).toBeGreaterThan(200);
      expect(n.kcal, r.name).toBeLessThan(1400);
    }
  });
});
