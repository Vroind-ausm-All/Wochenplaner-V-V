import { findRecipe } from '../data/recipes';
import type { InventoryItem, ISODate, MealPlan, ShoppingItem } from '../store/types';
import { addDays } from './date';
import { uid } from './id';

const SKIP = new Set(['wasser', 'salz']);

export interface Demand {
  name: string;
  unit: string;
  amount: number;
  recipes: string[];
}

/** Gesamtbedarf aller geplanten Mahlzeiten der 7 Tage ab `from`. */
export function weeklyDemand(meals: MealPlan, from: ISODate): Demand[] {
  const demand = new Map<string, Demand>();
  for (let d = 0; d < 7; d++) {
    const day = meals[addDays(from, d)] || {};
    for (const meal of Object.values(day)) {
      if (!meal) continue;
      const r = findRecipe(meal);
      if (!r) continue;
      const factor = Math.max(1, Math.min(8, Number(meal.portions) || 2)) / 2;
      const list = [...r.ingredients.filter((x) => !x.optional), ...(meal.meat && r.meat ? [r.meat] : [])];
      for (const z of list) {
        if (SKIP.has(z.name.toLocaleLowerCase('de'))) continue;
        const key = `${z.name.toLocaleLowerCase('de')}|${z.unit}`;
        const cur = demand.get(key) ?? { name: z.name, unit: z.unit, amount: 0, recipes: [] };
        cur.amount += z.amount * factor;
        if (!cur.recipes.includes(r.name)) cur.recipes.push(r.name);
        demand.set(key, cur);
      }
    }
  }
  return [...demand.values()];
}

/**
 * Ersetzt automatisch erzeugte Einkaufsposten durch den aktuellen Wochenbedarf.
 * Lebensmittel aus dem Vorrat werden nur angerechnet, wenn sie als glutenfrei geprüft markiert sind.
 */
export function regenerateShopping(shopping: ShoppingItem[], inventory: InventoryItem[], meals: MealPlan, from: ISODate): ShoppingItem[] {
  const manual = shopping.filter((x) => x.origin !== 'meal-plan');
  const previous = new Map(shopping.filter((x) => x.origin === 'meal-plan').map((x) => [x.name.toLocaleLowerCase('de'), x]));
  const generated: ShoppingItem[] = [];
  for (const z of weeklyDemand(meals, from)) {
    const stock = inventory
      .filter((x) => x.name.toLocaleLowerCase('de') === z.name.toLocaleLowerCase('de') && x.unit.toLowerCase() === z.unit.toLowerCase())
      .filter((x) => x.gfStatus === 'verified' || x.category !== 'Lebensmittel')
      .reduce((a, x) => a + (Number(x.qty) || 0), 0);
    const remaining = Math.max(0, z.amount - stock);
    if (remaining <= 0) continue;
    const qty = `${Number(remaining.toFixed(1)).toLocaleString('de-DE')} ${z.unit}`;
    const prev = previous.get(z.name.toLocaleLowerCase('de'));
    generated.push({
      id: prev?.id ?? uid(),
      name: z.name,
      qty,
      category: 'Lebensmittel',
      // Abgehakt bleibt abgehakt, solange sich die Menge nicht ändert.
      done: !!prev && prev.done && prev.qty === qty,
      origin: 'meal-plan',
    });
  }
  return [...manual, ...generated];
}
