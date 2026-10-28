import legacyJson from './legacy.json';
import afrikanisch from './afrikanisch';
import basics from './basics';
import griechisch from './griechisch';
import indisch from './indisch';
import italienisch from './italienisch';
import mexikanisch from './mexikanisch';
import spanisch from './spanisch';
import type { Recipe } from './types';

/**
 * Einige Gerichte des alten Boards passen in die neuen Küchenwelten besser.
 * Der Name bleibt gleich, damit bestehende Essenspläne weiter gefunden werden.
 */
const MOVED: Record<string, string> = {
  'glutenfreie-pasta-mit-spinat': 'Italienisch',
  'tomaten-mozzarella-polenta': 'Italienisch',
  'burrito-bowl-mit-bohnen': 'Mexikanisch',
  'indisches-palak-paneer-mit-basmatireis': 'Indisch',
  'susskartoffel-linsen-dal': 'Indisch',
};

const legacy = (legacyJson as Recipe[]).map((r) => (MOVED[r.id] ? { ...r, cuisine: MOVED[r.id] } : r));

/** Alle planbaren Gerichte (ohne Grundrezepte). */
export const RECIPES: Recipe[] = [...legacy, ...italienisch, ...mexikanisch, ...griechisch, ...indisch, ...spanisch, ...afrikanisch];
/** Grundrezepte zum Selbermachen (Teige, Brühe, Mehlmischung …). */
export const BASICS: Recipe[] = basics;

const byId = new Map([...RECIPES, ...BASICS].map((r) => [r.id, r]));
const byName = new Map([...RECIPES, ...BASICS].map((r) => [r.name.toLocaleLowerCase('de'), r]));

export const recipeById = (id: string | undefined) => (id ? byId.get(id) : undefined);
/** Das alte Board speichert Mahlzeiten über den Namen. */
export const recipeByName = (name: string | undefined) => (name ? byName.get(name.toLocaleLowerCase('de')) : undefined);
export const findRecipe = (meal: { recipeId?: string; name: string }) => recipeById(meal.recipeId) ?? recipeByName(meal.name);

export const isVegetarian = (r: Recipe) =>
  !r.ingredients.some((x) => /lachs|fisch|thunfisch|fleisch|hähnchen|schinken|garnelen|speck|wurst|rind|lamm|chorizo|pancetta|ente|merguez/i.test(x.name));

export type { Recipe } from './types';
