import { BASICS_CUISINE } from '../cuisines';
import { cuisine, i } from './helpers';

/** Grundrezepte zum Selbermachen – werden von Gerichten über `homemade` verlinkt. */
export default cuisine(BASICS_CUISINE, [
  {
    id: 'gf-mehlmischung', name: 'Allround-Mehlmischung', group: 'Grundrezept', minutes: 5, symbol: '🌾', yields: 'ca. 1 kg',
    description: 'Ersetzt Weizenmehl 1:1 in Soßen, Kuchen und Pfannkuchen',
    ingredients: [i('Reismehl', 500), i('Kartoffelstärke', 300), i('Tapiokastärke', 150), i('Flohsamenschalen', 30)],
    steps: [
      'Alle Zutaten in einer großen Schüssel gründlich verrühren und luftdicht abfüllen.',
      'Für Hefeteige zusätzlich 1 TL Flohsamenschalen je 100 g Mischung einrühren und den Teig 10 Minuten quellen lassen.',
      'Glutenfreie Teige brauchen mehr Flüssigkeit: lieber etwas weicher anrühren als bei Weizen.',
    ],
    swaps: ['Alle Mehle zertifiziert glutenfrei kaufen.', 'Statt Flohsamenschalen geht Xanthan (ca. 1 TL je 250 g).'],
  },
  {
    id: 'gf-pizzateig', name: 'Pizzateig', group: 'Grundrezept', minutes: 90, symbol: '🍕', yields: '2 Pizzen (Ø 28 cm)',
    description: 'Luftig dank Flohsamenschalen, knusprig auf dem Stein',
    ingredients: [i('Glutenfreie Mehlmischung', 300), i('Flohsamenschalen', 15), i('Trockenhefe', 7), i('Wasser', 300, 'ml'), i('Olivenöl', 20, 'ml'), i('Zucker', 5)],
    steps: [
      'Hefe und Zucker im lauwarmen Wasser auflösen, Flohsamenschalen einrühren und 5 Minuten gelieren lassen.',
      'Mehlmischung, 1 TL Salz und Öl zugeben und 5 Minuten zu einem weichen, klebrigen Teig verkneten.',
      'Abgedeckt 60 Minuten gehen lassen, mit nassen Händen auf Backpapier dünn ausdrücken.',
      'Bei maximaler Hitze 8 Minuten vorbacken, belegen und weitere 8–10 Minuten backen.',
    ],
    homemade: ['gf-mehlmischung'],
  },
  {
    id: 'gf-pastateig', name: 'Frischer Pastateig', group: 'Grundrezept', minutes: 45, symbol: '🍝', yields: '2 Portionen Tagliatelle oder 6 Lasagneplatten',
    description: 'Seidig ausrollbar – für Tagliatelle, Ravioli, Lasagne',
    ingredients: [i('Glutenfreie Mehlmischung', 200), i('Eier', 3, 'Stück'), i('Olivenöl', 10, 'ml'), i('Flohsamenschalen', 5)],
    steps: [
      'Mehlmischung und Flohsamenschalen mischen, Eier und Öl in die Mitte geben und zu einem glatten Teig kneten.',
      'In Folie gewickelt 20 Minuten ruhen lassen.',
      'Zwischen zwei Lagen Backpapier oder mit der Nudelmaschine (Stufe 5) dünn ausrollen und schneiden.',
      'In einem eigenen Topf 2–3 Minuten in Salzwasser garen.',
    ],
    swaps: ['Nudelmaschine vorher gründlich von Weizenmehl reinigen oder eine eigene verwenden.'],
    homemade: ['gf-mehlmischung'],
  },
  {
    id: 'gf-gnocchi', name: 'Kartoffelgnocchi', group: 'Grundrezept', minutes: 50, symbol: '🥔', yields: '2 Portionen',
    description: 'Mit Kartoffelstärke und Reismehl statt Weizen',
    ingredients: [i('Kartoffeln', 600), i('Kartoffelstärke', 60), i('Reismehl', 60), i('Eier', 1, 'Stück')],
    steps: [
      'Mehligkochende Kartoffeln in der Schale garen oder im Ofen backen (trockener = besser).',
      'Heiß pellen, durchpressen und kurz ausdampfen lassen.',
      'Mit Stärke, Reismehl, Ei, Salz und Muskat zügig verkneten – nicht zu lange, sonst wird der Teig zäh.',
      'Rollen formen, abstechen und in siedendem Wasser garen, bis sie aufsteigen.',
    ],
  },
  {
    id: 'gf-tortillas', name: 'Maistortillas', group: 'Grundrezept', minutes: 30, symbol: '🌮', yields: '10–12 Tortillas',
    description: 'Aus Masa Harina – nur zwei Zutaten',
    ingredients: [i('Masa Harina', 220), i('Wasser', 300, 'ml')],
    steps: [
      'Masa Harina mit warmem Wasser und 1 Prise Salz zu einem geschmeidigen Teig kneten (fühlt sich an wie Knete).',
      '10 Minuten abgedeckt ruhen lassen, dann zu 12 Kugeln formen.',
      'Zwischen Folie mit einer Tortillapresse oder einem Topfboden flach drücken.',
      'In einer sehr heißen, trockenen Pfanne je Seite 40–60 Sekunden backen, in einem Tuch warm halten.',
    ],
    swaps: ['Masa Harina ist nixtamalisierter Mais und von Natur aus glutenfrei – auf Kennzeichnung achten. Normales Maismehl funktioniert hierfür nicht.'],
  },
  {
    id: 'gf-injera', name: 'Injera aus Teff', group: 'Grundrezept', minutes: 40, symbol: '🫓', yields: '6 Fladen',
    description: 'Äthiopisches Sauerteig-Fladenbrot, 100 % Teff',
    ingredients: [i('Teffmehl', 250), i('Wasser', 450, 'ml')],
    steps: [
      'Original: Teff mit 400 ml Wasser verrühren und abgedeckt 1–3 Tage bei Raumtemperatur säuern lassen.',
      'Schnell: Teff mit 400 ml Mineralwasser, 1 TL Natron und 1 EL Zitronensaft verrühren und 30 Minuten ruhen lassen.',
      'Teig mit restlichem Wasser auf Pfannkuchenkonsistenz bringen und salzen.',
      'In eine heiße, beschichtete Pfanne dünn eingießen, abdecken und nur von einer Seite backen, bis die Oberfläche voller Poren und trocken ist.',
    ],
    swaps: ['Teffmehl zertifiziert glutenfrei kaufen.'],
  },
  {
    id: 'gf-dosa', name: 'Dosa-Teig (fermentiert)', group: 'Grundrezept', minutes: 30, symbol: '🥞', yields: '8 Dosas',
    description: 'Original aus Reis und Urdbohnen, über Nacht fermentiert',
    ingredients: [i('Reis', 300), i('Urdbohnen geschält', 100), i('Wasser', 500, 'ml')],
    steps: [
      'Reis und Urdbohnen getrennt 6 Stunden einweichen.',
      'Getrennt mit wenig Wasser sehr fein pürieren, mischen und salzen.',
      'Abgedeckt 10–14 Stunden warm fermentieren lassen, bis der Teig Blasen wirft.',
      'Dünn in der heißen Pfanne ausstreichen und knusprig backen.',
    ],
  },
  {
    id: 'gf-paniermehl', name: 'Paniermehl', group: 'Grundrezept', minutes: 40, symbol: '🍞', yields: 'ca. 150 g',
    description: 'Aus glutenfreiem Brot oder Maisflakes ohne Gerstenmalz',
    ingredients: [i('Glutenfreies Brot', 200)],
    steps: [
      'Brot in Würfel schneiden und bei 120 °C 30 Minuten trocknen.',
      'Abkühlen lassen und im Mixer fein mahlen.',
      'Alternative: ungesüßte Maisflakes ohne Gerstenmalz grob zerstoßen – ideal für Airfryer-Panaden.',
      'Luftdicht bis zu 4 Wochen haltbar.',
    ],
    swaps: ['Normale Cornflakes enthalten Gerstenmalz und sind nicht glutenfrei.'],
  },
  {
    id: 'gf-bruehe', name: 'Gemüsebrühe-Paste', group: 'Grundrezept', minutes: 30, symbol: '🥕', yields: '1 Glas (ca. 600 g, reicht für ca. 15 l Brühe)',
    description: 'Ersetzt Brühwürfel – ohne Weizen, Hefeextrakt oder Gerste',
    ingredients: [i('Karotten', 300), i('Staudensellerie', 200), i('Lauch', 1, 'Stück'), i('Zwiebeln', 2, 'Stück'), i('Petersilie', 30), i('Salz', 120)],
    steps: [
      'Gemüse und Kräuter grob schneiden und im Mixer fein zerkleinern.',
      'Mit dem Salz mischen und in einem Topf 15 Minuten unter Rühren einkochen.',
      'Heiß in saubere Gläser füllen. Gekühlt mehrere Monate haltbar.',
      '1 gehäufter TL je 500 ml heißes Wasser.',
    ],
  },
  {
    id: 'gf-bechamel', name: 'Béchamelsoße', group: 'Grundrezept', minutes: 10, symbol: '🥛', yields: '500 ml',
    description: 'Gebunden mit Reismehl oder Maisstärke',
    ingredients: [i('Butter', 30), i('Reismehl', 30), i('Milch', 500, 'ml')],
    steps: [
      'Butter schmelzen, Reismehl einrühren und 1 Minute anschwitzen (nicht bräunen).',
      'Kalte Milch nach und nach einrühren und unter Rühren aufkochen.',
      '5 Minuten köcheln, mit Salz, Pfeffer und Muskat abschmecken.',
      'Schnellvariante: Milch erhitzen und mit 25 g kalt angerührter Maisstärke binden.',
    ],
  },
  {
    id: 'gf-pao-de-queijo', name: 'Pão de queijo', group: 'Grundrezept', minutes: 35, symbol: '🧀', yields: 'ca. 20 Stück',
    description: 'Brasilianische Käsebällchen aus Tapioka',
    ingredients: [i('Tapiokastärke', 250), i('Milch', 125, 'ml'), i('Rapsöl', 60, 'ml'), i('Eier', 1, 'Stück'), i('Parmesan', 100)],
    steps: [
      'Milch, Öl und 1 TL Salz aufkochen und über die Tapiokastärke gießen, glatt rühren.',
      'Etwas abkühlen lassen, Ei und Käse unterkneten.',
      'Mit geölten Händen walnussgroße Kugeln formen.',
      'Bei 200 °C 20–25 Minuten goldbraun backen (Airfryer: 180 °C, 12 Minuten).',
    ],
  },
  {
    id: 'gf-brot', name: 'Saatenbrot ohne Kneten', group: 'Grundrezept', minutes: 90, symbol: '🥖', yields: '1 Kastenbrot',
    description: 'Saftig, nussig, lange frisch – mit Buchweizenflocken',
    ingredients: [i('Buchweizenflocken', 150), i('Sonnenblumenkerne', 130), i('Leinsamen', 90), i('Kürbiskerne', 50), i('Chiasamen', 30), i('Flohsamenschalen', 30), i('Wasser', 350, 'ml'), i('Rapsöl', 40, 'ml')],
    steps: [
      'Alle trockenen Zutaten mit 1 TL Salz in einer Kastenform mischen.',
      'Wasser und Öl zugeben, gut verrühren, glatt streichen und mindestens 2 Stunden (oder über Nacht) quellen lassen.',
      'Bei 175 °C 20 Minuten backen, aus der Form stürzen und direkt auf dem Rost weitere 40 Minuten backen.',
      'Vollständig auskühlen lassen, erst dann anschneiden.',
    ],
    swaps: ['Hafer ist nur mit „glutenfrei“-Siegel geeignet (Kreuzkontakt) und wird nicht von allen vertragen – Buchweizen ist die sichere Wahl.'],
  },
  {
    id: 'gf-teriyaki', name: 'Teriyaki-Sauce', group: 'Grundrezept', minutes: 10, symbol: '🍶', yields: 'ca. 250 ml',
    description: 'Mit Tamari statt Sojasauce',
    ingredients: [i('Tamari glutenfrei', 100, 'ml'), i('Honig', 40), i('Ingwer', 15), i('Knoblauch', 2, 'Zehen'), i('Speisestärke glutenfrei', 10), i('Wasser', 100, 'ml')],
    steps: [
      'Tamari, Wasser, Honig, geriebenen Ingwer und Knoblauch aufkochen.',
      'Stärke in 2 EL kaltem Wasser anrühren und einrühren.',
      '1 Minute köcheln, bis die Soße glänzt. Gekühlt 2 Wochen haltbar.',
    ],
    swaps: ['Normale Sojasauce wird mit Weizen gebraut – Tamari mit Glutenfrei-Kennzeichnung verwenden.'],
  },
]);
