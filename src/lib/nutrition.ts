import { estimate } from '../data/nutrients';
import type { Nutrients, Recipe } from '../data/recipes/types';

const cache = new Map<string, { base: Nutrients; meat?: Nutrients; complete: boolean }>();

/** Nährwerte je Portion: gespeichert (altes Board) oder aus der Nährwerttabelle geschätzt. */
export function recipeNutrition(r: Recipe, withMeat = false): { values: Nutrients; complete: boolean } | null {
  let entry = cache.get(r.id);
  if (!entry) {
    if (r.nutrition) entry = { base: r.nutrition.base, meat: r.nutrition.meat, complete: true };
    else {
      const base = estimate(r.ingredients.filter((x) => !x.optional), 2);
      const m = r.meat ? estimate([r.meat], 2) : null;
      entry = { base: base.nutrients, meat: m?.nutrients, complete: base.missing.length === 0 && (!m || m.missing.length === 0) };
    }
    cache.set(r.id, entry);
  }
  if (!entry.base.kcal) return null;
  const values = { ...entry.base };
  if (withMeat && r.meat && entry.meat) for (const k of Object.keys(values) as (keyof Nutrients)[]) values[k] += entry.meat[k];
  return { values, complete: entry.complete };
}

/** Schätzbereich wie im alten Board: ±22 % Energie, ±25 % Makros. */
export function band(value: number, key: keyof Nutrients): string {
  const margin = key === 'kcal' ? 0.22 : 0.25;
  const round = (n: number) => (key === 'kcal' ? Math.round(n / 10) * 10 : Math.round(n));
  return `${round(value * (1 - margin)).toLocaleString('de-DE')}–${round(value * (1 + margin)).toLocaleString('de-DE')}`;
}
