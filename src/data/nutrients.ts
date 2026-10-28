import type { Nutrients } from './recipes/types';

/**
 * Generische Durchschnittswerte je 100 g (Rohware bzw. abgetropft bei Konserven),
 * gerundet aus gängigen Nährwerttabellen. Für Schätzbereiche gedacht, nicht für Diätpläne.
 * Reihenfolge: kcal, Eiweiß, Kohlenhydrate, Fett, Zucker, Ballaststoffe, gesättigte Fettsäuren
 */
type Row = [number, number, number, number, number, number, number];

const T: Record<string, Row> = {
  Aubergine: [25, 1, 6, 0.2, 3.5, 3, 0],
  Augenbohnen: [116, 8, 21, 0.5, 3, 6.5, 0.1],
  Avocado: [160, 2, 9, 15, 0.7, 6.7, 2.1],
  Babyspinat: [23, 2.9, 3.6, 0.4, 0.4, 2.2, 0.1],
  Basilikum: [23, 3.2, 2.7, 0.6, 0.3, 1.6, 0],
  Basmatireis: [350, 8, 78, 0.6, 0.2, 1.3, 0.2],
  Blattsalat: [15, 1.4, 2.9, 0.2, 0.8, 1.3, 0],
  Blattspinat: [23, 2.9, 3.6, 0.4, 0.4, 2.2, 0.1],
  Blumenkohl: [25, 1.9, 5, 0.3, 1.9, 2, 0.1],
  'Bratwurst glutenfrei': [290, 13, 1, 26, 0.5, 0, 9.5],
  Butter: [741, 0.7, 0.6, 83, 0.6, 0, 52],
  Cashewkerne: [580, 18, 30, 44, 6, 3.3, 8],
  Champignons: [22, 3.1, 3.3, 0.3, 2, 1, 0],
  Cheddar: [400, 25, 1.3, 33, 0.5, 0, 21],
  Chili: [40, 1.9, 9, 0.4, 5, 1.5, 0],
  Chorizo: [455, 24, 2, 38, 1, 0, 14],
  Dill: [43, 3.5, 7, 1.1, 0, 2.1, 0],
  Eier: [137, 12, 0.7, 9.5, 0.7, 0, 3],
  Erbsen: [81, 5.4, 14, 0.4, 5.7, 5.1, 0.1],
  Erdnussmus: [600, 25, 16, 50, 6, 6, 9],
  Feta: [265, 14, 4, 21, 4, 0, 15],
  Frühlingszwiebeln: [32, 1.8, 7, 0.2, 2.3, 2.6, 0],
  Garnelen: [85, 20, 0, 0.5, 0, 0, 0.1],
  'Gemüsebrühe glutenfrei': [5, 0.2, 0.6, 0.2, 0.3, 0, 0],
  'Glutenfreies Brot': [250, 4, 45, 6, 3, 6, 0.8],
  'Griechischer Joghurt': [120, 4, 4, 10, 4, 0, 6.5],
  'Grüne Bohnen': [31, 1.8, 7, 0.2, 3.3, 2.7, 0],
  Grünkohl: [49, 4.3, 8.8, 0.9, 2.3, 4.2, 0.1],
  Halloumi: [320, 22, 2, 25, 1.5, 0, 17],
  Hokkaido: [40, 1.7, 9, 0.2, 4, 2, 0],
  Hähnchenbrust: [110, 23, 0, 1.5, 0, 0, 0.4],
  Hähnchenschenkel: [170, 18, 0, 11, 0, 0, 3],
  Ingwer: [80, 1.8, 18, 0.8, 1.7, 2, 0.2],
  Karotten: [41, 0.9, 10, 0.2, 4.7, 2.8, 0],
  Kartoffeln: [77, 2, 17, 0.1, 0.8, 2.2, 0],
  Kartoffelstärke: [350, 0.1, 86, 0.1, 0, 0, 0],
  Kichererbsen: [140, 7.5, 19, 2.6, 0.5, 6, 0.3],
  'Kichererbsenmehl glutenfrei': [380, 22, 50, 6.5, 10, 11, 0.7],
  Kidneybohnen: [110, 8, 17, 0.5, 0.3, 6.5, 0.1],
  Knoblauch: [149, 6.4, 33, 0.5, 1, 2.1, 0.1],
  Kochbananen: [122, 1.3, 32, 0.4, 15, 2.3, 0.1],
  Kochschinken: [110, 19, 1, 3.5, 1, 0, 1.2],
  Kokosraspeln: [660, 6.9, 24, 63, 7, 16, 56],
  Koriander: [23, 2.1, 3.7, 0.5, 0.9, 2.8, 0],
  Lachsfilet: [200, 20, 0, 13, 0, 0, 2.5],
  Lammhack: [280, 17, 0, 23, 0, 0, 10],
  Limette: [30, 0.7, 10, 0.2, 1.7, 2.8, 0],
  Mais: [86, 3.2, 19, 1.2, 4.5, 2.4, 0.2],
  'Maismehl vorgekocht': [360, 7, 78, 1.5, 0.6, 4, 0.2],
  Maistortillas: [218, 5.7, 45, 2.9, 0.9, 6.3, 0.4],
  'Mayonnaise glutenfrei': [680, 1, 1, 75, 1, 0, 6],
  Milch: [64, 3.4, 4.8, 3.5, 4.8, 0, 2.2],
  Minze: [44, 3.3, 8, 0.7, 0, 6.8, 0.2],
  Mozzarella: [250, 18, 1, 19, 1, 0, 13],
  Naturjoghurt: [66, 3.5, 4.5, 3.6, 4.5, 0, 2.3],
  Olivenöl: [884, 0, 0, 100, 0, 0, 14],
  Orange: [47, 0.9, 12, 0.1, 9, 2.4, 0],
  Pancetta: [400, 15, 0, 38, 0, 0, 14],
  Paprika: [31, 1, 6, 0.3, 4.2, 2.1, 0],
  Parmaschinken: [250, 26, 0, 16, 0, 0, 5.5],
  Parmesan: [400, 33, 0, 29, 0, 0, 19],
  'Passierte Tomaten': [32, 1.4, 5, 0.2, 4, 1.4, 0],
  'Pasta glutenfrei': [355, 7, 78, 1.5, 0.5, 2.5, 0.3],
  Petersilie: [36, 3, 6, 0.8, 0.9, 3.3, 0.1],
  'Polenta glutenfrei': [360, 8, 77, 1.5, 0.6, 3.5, 0.2],
  Rapsöl: [884, 0, 0, 100, 0, 0, 7],
  Reis: [350, 7, 78, 0.6, 0.1, 1.4, 0.2],
  Reismehl: [360, 6, 80, 1.4, 0.1, 2.4, 0.4],
  Ricotta: [150, 9, 3, 11, 3, 0, 7],
  Rinderhack: [250, 18, 0, 20, 0, 0, 8.5],
  Rinderschmorwürfel: [150, 21, 0, 7, 0, 0, 3],
  Rinderstreifen: [120, 22, 0, 3.5, 0, 0, 1.5],
  Risottoreis: [350, 7, 79, 0.6, 0.1, 1.2, 0.2],
  Rosinen: [300, 3, 79, 0.5, 59, 3.7, 0.1],
  'Rote Linsen': [340, 25, 50, 1.5, 2, 11, 0.2],
  'Rote Zwiebeln': [40, 1.1, 9, 0.1, 4.2, 1.7, 0],
  Rucola: [25, 2.6, 3.7, 0.7, 2, 1.6, 0.1],
  Sahne: [300, 2.4, 3.2, 31, 3.2, 0, 19],
  Salatgurke: [15, 0.7, 3.6, 0.1, 1.7, 0.5, 0],
  Salbei: [315, 10, 60, 13, 1.7, 40, 7],
  'Saure Sahne': [120, 3, 4, 10, 4, 0, 6.5],
  'Schwarze Bohnen': [130, 8.5, 23, 0.5, 0.3, 8.5, 0.1],
  Schweinefilet: [120, 21, 0, 4, 0, 0, 1.4],
  Serranoschinken: [240, 30, 0, 13, 0, 0, 4.5],
  'Speisestärke glutenfrei': [380, 0.3, 91, 0.1, 0, 0.9, 0],
  Staudensellerie: [16, 0.7, 3, 0.2, 1.3, 1.6, 0],
  Süßkartoffeln: [86, 1.6, 20, 0.1, 4.2, 3, 0],
  Teffmehl: [367, 13, 73, 2.4, 1.8, 8, 0.4],
  Thunfisch: [116, 26, 0, 1, 0, 0, 0.3],
  Tomaten: [18, 0.9, 3.9, 0.2, 2.6, 1.2, 0],
  Tomatenmark: [82, 4.3, 19, 0.5, 12, 4.1, 0.1],
  Wasser: [0, 0, 0, 0, 0, 0, 0],
  'Weiße Bohnen': [115, 7.5, 20, 0.5, 0.3, 6.3, 0.1],
  Zitrone: [29, 1.1, 9, 0.3, 2.5, 2.8, 0],
  Zucchini: [17, 1.2, 3.1, 0.3, 2.5, 1, 0.1],
  Zwiebeln: [40, 1.1, 9, 0.1, 4.2, 1.7, 0],
};

/** Gramm je Stück / Zehe (mittlere Größe, essbarer Anteil) */
const PIECE: Record<string, number> = {
  Aubergine: 300, Avocado: 150, Blumenkohl: 600, Chili: 15, Eier: 55, Frühlingszwiebeln: 15, Karotten: 80, Knoblauch: 4,
  Kochbananen: 200, Limette: 45, Maistortillas: 30, Orange: 150, Paprika: 160, 'Rote Zwiebeln': 80, Salatgurke: 350,
  Staudensellerie: 50, Tomaten: 100, Zitrone: 60, Zucchini: 250, Zwiebeln: 80,
};

/** Dichte für ml → g, wenn deutlich ungleich 1 */
const DENSITY: Record<string, number> = { Olivenöl: 0.92, Rapsöl: 0.92, Sahne: 1 };

const KEYS: (keyof Nutrients)[] = ['kcal', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'sat'];

export function grams(name: string, amount: number, unit: string): number | null {
  switch (unit) {
    case 'g':
      return amount;
    case 'ml':
      return amount * (DENSITY[name] ?? 1);
    case 'Stück':
    case 'Zehen':
      return PIECE[name] != null ? amount * PIECE[name] : null;
    case 'EL':
      return amount * 12;
    case 'TL':
      return amount * 4;
    default:
      return null;
  }
}

/** Summe der Nährwerte einer Zutatenliste, geteilt durch `servings`. `missing` listet unbekannte Zutaten. */
export function estimate(items: { name: string; amount: number; unit: string }[], servings: number) {
  const total = Object.fromEntries(KEYS.map((k) => [k, 0])) as unknown as Nutrients;
  const missing: string[] = [];
  for (const it of items) {
    const row = T[it.name];
    const g = grams(it.name, it.amount, it.unit);
    if (!row || g == null) {
      missing.push(it.name);
      continue;
    }
    KEYS.forEach((k, idx) => (total[k] += (row[idx] * g) / 100 / servings));
  }
  return { nutrients: total, missing };
}

export const hasNutrientData = (name: string) => name in T;
