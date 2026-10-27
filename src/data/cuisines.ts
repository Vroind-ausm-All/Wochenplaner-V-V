import type { Cuisine } from './recipes/types';

/**
 * Küchenwelten. Die ersten fünf stammen aus dem alten Board, der Rest ist neu.
 * `gfEase` bewertet, wie leicht sich die Küche ohne Gluten kochen lässt.
 */
export const CUISINES: Cuisine[] = [
  {
    id: 'Italienisch', name: 'Italienisch', flag: '🇮🇹', tagline: 'Risotto, Polenta & Pasta', gfEase: 2, hue: 8,
    gfNote: 'Risotto, Polenta und viele Gemüsegerichte sind von Natur aus glutenfrei. Pasta, Gnocchi und Pizza mit Ersatz oder selbst gemacht.',
    watchOut: ['Nudelwasser & Siebe getrennt halten', 'Gnocchi aus dem Kühlregal enthalten meist Weizen', 'Paniermehl bei Parmigiana weglassen'],
  },
  {
    id: 'Deutsch', name: 'Deutsch', flag: '🇩🇪', tagline: 'Hausgemacht & gemütlich', gfEase: 1, hue: 38,
    gfNote: 'Kartoffelküche ist dankbar – Spätzle, Knödel, Soßen und Panaden brauchen Ersatz.',
    watchOut: ['Mehlschwitzen → Maisstärke oder Reismehl', 'Wurstwaren auf Kennzeichnung prüfen', 'Bier & Malzbier enthalten Gerste'],
  },
  {
    id: 'Französisch', name: 'Französisch', flag: '🇫🇷', tagline: 'Bistro & Provence', gfEase: 2, hue: 220,
    gfNote: 'Galettes aus Buchweizen, Socca aus Kichererbsen und provenzalisches Gemüse sind glutenfrei – Quiche und Baguette brauchen Ersatz.',
    watchOut: ['Crêpes sind Weizen, Galettes (reiner Buchweizen) nicht', 'Roux / Béchamel binden'],
  },
  {
    id: 'Asiatisch', name: 'Asiatisch', flag: '🌏', tagline: 'Wok, Curry & Umami', gfEase: 3, hue: 150,
    gfNote: 'Reis, Reisnudeln und Glasnudeln tragen die Küche. Größte Falle: Sojasauce – immer Tamari nehmen.',
    watchOut: ['Sojasauce enthält Weizen → Tamari', 'Gochujang & Miso oft mit Gerste/Weizen', 'Austernsauce, Hoisin prüfen', 'Udon/Ramen sind Weizen; Soba nur 100 % Buchweizen'],
  },
  {
    id: 'Indisch', name: 'Indisch', flag: '🇮🇳', tagline: 'Dal, Masala & Dosa', gfEase: 3, hue: 28,
    gfNote: 'Reis, Linsen und Kichererbsenmehl: eine der glutenfreundlichsten Küchen. Nur Brote (Naan, Chapati) sind Weizen.',
    watchOut: ['Asafoetida (Hing) ist fast immer mit Weizenmehl gestreckt', 'Garam Masala & Currypulver auf Rieselhilfe prüfen', 'Naan/Chapati → Dosa oder Reis'],
  },
  {
    id: 'Mexikanisch', name: 'Mexikanisch & Latino', flag: '🇲🇽', tagline: 'Mais, Bohnen & Limette', gfEase: 3, hue: 95,
    gfNote: 'Mais ist die Basis: Maistortillas, Arepas, Tamales. Dazu Kartoffeln und Quinoa aus Peru, Tapioka aus Brasilien.',
    watchOut: ['Weizentortillas (Flour Tortillas) meiden', 'Taco-/Chili-Gewürzmischungen enthalten oft Weizenmehl', 'Maismehl auf Kreuzkontakt prüfen'],
  },
  {
    id: 'Griechisch', name: 'Griechisch', flag: '🇬🇷', tagline: 'Olivenöl, Zitrone & Kräuter', gfEase: 3, hue: 205,
    gfNote: 'Gemüse, Hülsenfrüchte, Reis und Feta – fast alles glutenfrei. Pita und Filoteig ersetzen.',
    watchOut: ['Pita, Filo- und Blätterteig sind Weizen', 'Béchamel der Moussaka mit Maisstärke binden', 'Orzo (Kritharaki) ist Nudel → Reis'],
  },
  {
    id: 'Spanisch', name: 'Spanisch & Portugiesisch', flag: '🇪🇸', tagline: 'Paella, Tortilla & Tapas', gfEase: 3, hue: 45,
    gfNote: 'Reis, Kartoffeln, Eier, Olivenöl – Tapas-Küche ist überwiegend glutenfrei.',
    watchOut: ['Chorizo & Würste auf Kennzeichnung prüfen', 'Croquetas sind paniert', 'Brot zu Tapas glutenfrei wählen'],
  },
  {
    id: 'Nahost', name: 'Nahost', flag: '🌿', tagline: 'Levante & Gewürze', gfEase: 2, hue: 80,
    gfNote: 'Hummus, Falafel, Reisgerichte sind glutenfrei – Bulgur, Couscous und Fladenbrot nicht.',
    watchOut: ['Bulgur/Couscous → Quinoa, Hirse oder Buchweizen', 'Falafel-Fertigmischungen enthalten oft Mehl', 'Fladenbrot ersetzen'],
  },
  {
    id: 'Afrikanisch', name: 'Afrikanisch', flag: '🌍', tagline: 'Injera, Erdnuss & Jollof', gfEase: 3, hue: 18,
    gfNote: 'Äthiopisches Injera aus Teff, westafrikanische Eintöpfe mit Reis, Kochbanane oder Maisbrei – meist ohne Gluten.',
    watchOut: ['Injera im Restaurant oft mit Weizen gestreckt – selbst gemacht 100 % Teff', 'Berbere/Currypulver prüfen', 'Brühwürfel selbst machen'],
  },
  {
    id: 'Airfryer & Fastfood', name: 'Airfryer & Fastfood', flag: '🍟', tagline: 'Schnell & knusprig', gfEase: 1, hue: 0,
    gfNote: 'Burger, Pizza, Wings – gelingt mit Ersatzprodukten. Airfryer zu Hause vermeidet die geteilte Fritteuse.',
    watchOut: ['Restaurant-Pommes oft in gemeinsamer Fritteuse', 'Normale Cornflakes enthalten Gerstenmalz', 'Ofenpommes teils mit Weizenbeschichtung'],
  },
];

export const BASICS_CUISINE = 'Selbstgemacht';

export const cuisineById = (id: string) => CUISINES.find((c) => c.id === id);

/**
 * Weitere Küchen als Ausblick (noch ohne Rezepte) – inkl. Einschätzung, wie gut sie
 * sich glutenfrei umsetzen lassen.
 */
export const CUISINE_OUTLOOK: { name: string; flag: string; gfEase: 1 | 2 | 3; note: string }[] = [
  { name: 'Thai & Vietnamesisch', flag: '🇹🇭', gfEase: 3, note: 'Reisnudeln, Reispapier, Currys. Fischsauce & Sojasauce prüfen.' },
  { name: 'Japanisch', flag: '🇯🇵', gfEase: 2, note: 'Sushi, Donburi, Onigiri gut machbar – Tamari statt Shoyu, Mirin/Miso prüfen, Tempura mit Reismehl.' },
  { name: 'Koreanisch', flag: '🇰🇷', gfEase: 2, note: 'Bibimbap, Japchae – Gochujang gibt es glutenfrei, Standardware enthält Weizen.' },
  { name: 'Peruanisch', flag: '🇵🇪', gfEase: 3, note: 'Kartoffeln, Quinoa, Ceviche, Lomo saltado (mit Tamari).' },
  { name: 'Brasilianisch', flag: '🇧🇷', gfEase: 3, note: 'Pão de queijo, Feijoada, Tapioka-Crêpes – Maniok ist von Natur aus glutenfrei.' },
  { name: 'Persisch', flag: '🇮🇷', gfEase: 3, note: 'Reis mit Tahdig, Schmorgerichte (Khoresh), Kräuteromelett Kuku Sabzi.' },
  { name: 'Türkisch', flag: '🇹🇷', gfEase: 2, note: 'Linsensuppe, Imam Bayıldı, Kebap-Teller mit Reis – Pide, Börek und Bulgur ersetzen.' },
  { name: 'Skandinavisch', flag: '🇸🇪', gfEase: 2, note: 'Lachs, Kartoffeln, Köttbullar mit glutenfreiem Paniermehl, Saatenbrot.' },
  { name: 'Karibisch', flag: '🇯🇲', gfEase: 3, note: 'Rice & Peas, Jerk-Gemüse, Kochbananen – Jerk-Würzmischung prüfen.' },
  { name: 'Osteuropäisch', flag: '🇵🇱', gfEase: 1, note: 'Borschtsch, Kartoffelpuffer – Piroggen und Pelmeni mit selbst gemachtem Teig.' },
];
