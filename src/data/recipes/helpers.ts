import type { Ingredient, MeatOption, Recipe } from './types';

/** Kurzschreibweise für Zutaten: i('Reis', 160) oder i('Eier', 2, 'Stück') */
export const i = (name: string, amount: number, unit = 'g', optional?: boolean): Ingredient =>
  optional ? { name, amount, unit, optional } : { name, amount, unit };

export const meat = (name: string, amount: number, instruction: string, unit = 'g'): MeatOption => ({ name, amount, unit, instruction });

export const slug = (text: string) =>
  text
    .replace(/ß/g, 'ss')
    .replace(/&/g, 'und')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type Draft = Omit<Recipe, 'id' | 'cuisine'> & { id?: string };

/** Legt Rezepte einer Küche an und vergibt IDs aus dem Namen. */
export const cuisine = (name: string, recipes: Draft[]): Recipe[] =>
  recipes.map((r) => ({ ...r, id: r.id ?? slug(r.name), cuisine: name }));
