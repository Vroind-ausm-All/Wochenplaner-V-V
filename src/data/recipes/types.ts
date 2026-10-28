export interface Ingredient {
  name: string;
  amount: number;
  unit: string; // g, ml, Stück, Zehen, EL, TL, Bund, Prise
  /** optionale Zutat, wird nicht automatisch eingekauft */
  optional?: boolean;
}

export interface MeatOption extends Ingredient {
  instruction: string;
}

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  sat: number;
}

export type RecipeGroup = 'Klassiker' | 'Schnell' | 'Modern' | 'Besonders' | 'Airfryer' | 'Fastfood' | 'Grundrezept';

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  group: RecipeGroup;
  minutes: number;
  description: string;
  symbol: string;
  /** Mengen für 2 Personen */
  ingredients: Ingredient[];
  steps: string[];
  meat?: MeatOption;
  /** Hinweise zu glutenfreien Ersatzprodukten / Kreuzkontakt */
  swaps?: string[];
  technique?: string;
  /** Verweise auf Grundrezepte zum Selbermachen (IDs aus basics) */
  homemade?: string[];
  /** Nährwerte je Portion; fehlt der Wert, wird er aus der Nährwerttabelle geschätzt */
  nutrition?: { base: Nutrients; meat?: Nutrients };
  /** Für Grundrezepte: Ergibt-Angabe statt Portionen */
  yields?: string;
}

export interface Cuisine {
  id: string;
  name: string;
  flag: string;
  tagline: string;
  /** Wie leicht lässt sich die Küche glutenfrei kochen? 1 = viel Ersatz nötig, 3 = von Natur aus meist glutenfrei */
  gfEase: 1 | 2 | 3;
  gfNote: string;
  /** typische Fallen */
  watchOut: string[];
  hue: number;
}
