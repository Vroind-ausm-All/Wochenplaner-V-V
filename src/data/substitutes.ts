/** Ersatztabelle: glutenhaltig → glutenfreie Alternativen. */
export const SUBSTITUTES: { gluten: string; instead: string[]; diy?: string; note?: string }[] = [
  { gluten: 'Weizenmehl (Soßen, Kuchen)', instead: ['Allround-Mehlmischung', 'Reismehl', 'Maisstärke zum Binden'], diy: 'gf-mehlmischung' },
  { gluten: 'Pizza- & Hefeteig', instead: ['Mehlmischung + Flohsamenschalen'], diy: 'gf-pizzateig', note: 'Teig weicher lassen, mit nassen Händen formen.' },
  { gluten: 'Pasta, Lasagne', instead: ['Mais-Reis-Pasta', 'Linsen-/Kichererbsenpasta', 'Zucchini-Platten'], diy: 'gf-pastateig', note: 'Eigener Topf und eigenes Sieb.' },
  { gluten: 'Gnocchi, Schupfnudeln', instead: ['Kartoffel + Stärke + Reismehl'], diy: 'gf-gnocchi' },
  { gluten: 'Weizentortillas, Wraps', instead: ['Maistortillas', 'Reispapier', 'Salatblätter'], diy: 'gf-tortillas' },
  { gluten: 'Fladenbrot, Naan, Pita', instead: ['Injera aus Teff', 'Dosa', 'Socca aus Kichererbsen'], diy: 'gf-injera' },
  { gluten: 'Brot & Brötchen', instead: ['Saatenbrot', 'zertifiziertes GF-Brot'], diy: 'gf-brot', note: 'Eigener Toaster oder Toasttaschen.' },
  { gluten: 'Paniermehl', instead: ['GF-Paniermehl', 'Maisflakes ohne Gerstenmalz', 'gemahlene Mandeln'], diy: 'gf-paniermehl' },
  { gluten: 'Couscous, Bulgur', instead: ['Hirse', 'Quinoa', 'Buchweizen', 'Blumenkohlreis'] },
  { gluten: 'Dinkel, Grünkern, Gerste, Roggen', instead: ['Buchweizen', 'Amaranth', 'Reis', 'Teff'] },
  { gluten: 'Sojasauce', instead: ['Tamari (glutenfrei)', 'Kokos-Aminos'], diy: 'gf-teriyaki' },
  { gluten: 'Brühwürfel, Fertigbrühe', instead: ['GF-gekennzeichnete Brühe'], diy: 'gf-bruehe' },
  { gluten: 'Béchamel / Mehlschwitze', instead: ['Reismehl-Roux', 'Maisstärke'], diy: 'gf-bechamel' },
  { gluten: 'Seitan', instead: ['Tofu', 'Tempeh (GF)', 'Kichererbsen'] },
  { gluten: 'Bier (zum Kochen)', instead: ['glutenfreies Bier', 'Brühe + Schuss Apfelessig'] },
  { gluten: 'Haferflocken', instead: ['zertifiziert GF-Hafer', 'Buchweizen-/Hirseflocken'], note: 'Nicht alle Zöliakiebetroffenen vertragen Hafer.' },
  { gluten: 'Udon, Ramen, Mie', instead: ['Reisnudeln', 'Glasnudeln', 'Soba aus 100 % Buchweizen'] },
  { gluten: 'Brötchen zu Käsebrot/Brunch', instead: ['Pão de queijo'], diy: 'gf-pao-de-queijo' },
];

/** Versteckte Glutenquellen – werden in Rezeptdetails an passenden Zutaten angezeigt. */
export const HIDDEN_GLUTEN: { match: RegExp; hint: string; diy?: string }[] = [
  { match: /brühe/i, hint: 'Viele Brühen enthalten Weizen oder Gerstenextrakt.', diy: 'gf-bruehe' },
  { match: /soja|tamari/i, hint: 'Nur Tamari mit Glutenfrei-Kennzeichnung – normale Sojasauce enthält Weizen.', diy: 'gf-teriyaki' },
  { match: /paste|gewürz|masala|harissa|ras el|berbere|curry|shawarma|paprikapulver|kreuzkümmel|zimt/i, hint: 'Gewürze & Pasten: Rieselhilfen können Weizenmehl enthalten.' },
  { match: /asafoetida|hing/i, hint: 'Asafoetida ist fast immer mit Weizen gestreckt.' },
  { match: /gochujang|miso/i, hint: 'Standardware oft mit Gerste/Weizen fermentiert.' },
  { match: /wurst|chorizo|schinken|speck|merguez|pancetta|salsiccia/i, hint: 'Wurstwaren: auf glutenfreie Kennzeichnung achten.' },
  { match: /mayonnaise|senf|ketchup|meerrettich/i, hint: 'Saucen & Würzmittel prüfen (Bindemittel, Malzessig).' },
  { match: /cornflakes|maisflakes/i, hint: 'Normale Cornflakes enthalten Gerstenmalz.', diy: 'gf-paniermehl' },
  { match: /hafer/i, hint: 'Hafer nur zertifiziert glutenfrei.' },
  { match: /mehl|stärke|flocken|polenta|grieß|masa|teff|hirse|quinoa|buchweizen|linsen/i, hint: 'Zertifiziert glutenfrei kaufen – Kreuzkontakt in Mühlen und bei loser Ware.' },
  { match: /pasta|spaghetti|nudel|lasagne|spätzle/i, hint: 'Glutenfreie Variante; eigener Topf & Sieb.', diy: 'gf-pastateig' },
  { match: /brot|bun|boden|tortilla(?!-chips)|wrap/i, hint: 'Glutenfreie Variante verwenden.', diy: 'gf-brot' },
  { match: /tortilla-chips|nachos/i, hint: 'Auf glutenfreie Kennzeichnung prüfen (gemeinsame Fritteusen in der Produktion).' },
];

export const hiddenGlutenHint = (ingredient: string) => HIDDEN_GLUTEN.find((h) => h.match.test(ingredient));
