import { cuisine, i, meat } from './helpers';

const HING = 'Asafoetida (Hing) ist fast immer mit Weizenmehl gestreckt – nur ausdrücklich glutenfreie Ware oder weglassen.';

export default cuisine('Indisch', [
  {
    name: 'Chana Masala mit Basmatireis',
    group: 'Klassiker', minutes: 35, symbol: '🫛',
    description: 'Kichererbsen in würziger Tomaten-Ingwer-Soße',
    ingredients: [i('Kichererbsen', 480), i('Passierte Tomaten', 400), i('Zwiebeln', 2, 'Stück'), i('Ingwer', 20), i('Knoblauch', 3, 'Zehen'), i('Basmatireis', 160), i('Naturjoghurt', 100), i('Koriander', 10), i('Rapsöl', 20, 'ml')],
    steps: [
      'Zwiebeln fein würfeln und im Öl 10 Minuten goldbraun braten.',
      'Ingwer und Knoblauch zugeben, mit Kreuzkümmel, Kurkuma, Koriander- und Chilipulver 1 Minute rösten.',
      'Tomaten und Kichererbsen zugeben, 15 Minuten köcheln; einige Kichererbsen zerdrücken.',
      'Mit Reis, Joghurt und frischem Koriander servieren.',
    ],
    swaps: [HING, 'Garam Masala besser selbst mischen oder auf Kennzeichnung achten.'],
  },
  {
    name: 'Aloo Gobi mit Erbsen',
    group: 'Klassiker', minutes: 40, symbol: '🥦',
    description: 'Kartoffeln und Blumenkohl, trocken gebraten mit Kurkuma',
    ingredients: [i('Kartoffeln', 400), i('Blumenkohl', 1, 'Stück'), i('Zwiebeln', 1, 'Stück'), i('Tomaten', 2, 'Stück'), i('Ingwer', 15), i('Erbsen', 100), i('Basmatireis', 140), i('Rapsöl', 30, 'ml'), i('Koriander', 10)],
    steps: [
      'Kartoffeln und Blumenkohl in mundgerechte Stücke schneiden.',
      'Kreuzkümmel im Öl anrösten, Zwiebel und Ingwer 5 Minuten braten.',
      'Gemüse mit Kurkuma und Salz zugeben, abgedeckt 20 Minuten garen, gelegentlich wenden.',
      'Tomaten und Erbsen zugeben, 5 Minuten fertig garen. Mit Reis servieren.',
    ],
    meat: meat('Hähnchenschenkel', 250, 'Hähnchen gewürfelt vorab vollständig anbraten und mitgaren.'),
    swaps: [HING],
  },
  {
    name: 'Masala Dosa mit Kokos-Chutney',
    group: 'Besonders', minutes: 50, symbol: '🥞',
    description: 'Hauchdünne Reis-Crêpes mit Kartoffelfüllung',
    ingredients: [i('Reismehl', 120), i('Kichererbsenmehl glutenfrei', 40), i('Naturjoghurt', 200), i('Kartoffeln', 400), i('Zwiebeln', 1, 'Stück'), i('Erbsen', 80), i('Kokosraspeln', 50), i('Ingwer', 10), i('Rapsöl', 30, 'ml')],
    steps: [
      'Reis- und Kichererbsenmehl mit 100 g Joghurt, 250 ml Wasser und Salz glatt rühren, 20 Minuten quellen lassen.',
      'Kartoffeln garen, grob zerdrücken. Senfsaat, Zwiebel, Ingwer, Kurkuma braten und mit Kartoffeln und Erbsen mischen.',
      'Chutney: Kokosraspeln mit restlichem Joghurt, Ingwer, Salz und etwas Wasser pürieren.',
      'Teig in einer heißen, leicht geölten Pfanne dünn verstreichen, knusprig backen, füllen und klappen.',
    ],
    swaps: ['Traditionell fermentiert aus Reis und Urdbohnen – das Grundrezept zeigt die Original-Variante.', HING],
    homemade: ['gf-dosa'],
  },
  {
    name: 'Butter-Kichererbsen mit Cashews',
    group: 'Klassiker', minutes: 40, symbol: '🧈',
    description: 'Wie Butter Chicken – samtig, mild, für alle',
    ingredients: [i('Kichererbsen', 400), i('Passierte Tomaten', 400), i('Sahne', 100, 'ml'), i('Butter', 20), i('Zwiebeln', 1, 'Stück'), i('Ingwer', 15), i('Knoblauch', 2, 'Zehen'), i('Cashewkerne', 30), i('Basmatireis', 160)],
    steps: [
      'Zwiebel, Ingwer und Knoblauch in Butter weich dünsten, Garam Masala, Paprika und Kurkuma kurz mitrösten.',
      'Tomaten und Cashews zugeben, 10 Minuten köcheln und fein pürieren.',
      'Sahne und Kichererbsen unterrühren, 10 Minuten ziehen lassen.',
      'Mit Basmatireis servieren.',
    ],
    meat: meat('Hähnchenbrust', 300, 'Hähnchen in Joghurt-Gewürz marinieren, separat vollständig braten und in die Soße geben.'),
    swaps: ['Naan ist Weizen – dazu Reis oder Dosa reichen.'],
  },
  {
    name: 'Gemüse-Biryani mit Raita',
    group: 'Besonders', minutes: 55, symbol: '🍚',
    description: 'Duftender Schichtreis mit Röstzwiebeln und Rosinen',
    ingredients: [i('Basmatireis', 180), i('Karotten', 2, 'Stück'), i('Erbsen', 100), i('Blumenkohl', 0.5, 'Stück'), i('Zwiebeln', 2, 'Stück'), i('Naturjoghurt', 250), i('Cashewkerne', 30), i('Rosinen', 20), i('Rapsöl', 30, 'ml'), i('Salatgurke', 0.5, 'Stück')],
    steps: [
      'Reis 20 Minuten einweichen und in Salzwasser 5 Minuten vorgaren, abgießen.',
      'Zwiebeln in Streifen im Öl tief goldbraun rösten, die Hälfte beiseitelegen.',
      'Gemüse mit Garam Masala, Kurkuma und 100 g Joghurt 10 Minuten schmoren.',
      'Reis und Gemüse schichten, mit Röstzwiebeln, Cashews und Rosinen bestreuen, abgedeckt 15 Minuten sanft dämpfen.',
      'Raita: Gurke raspeln, mit restlichem Joghurt und Minze verrühren.',
    ],
    meat: meat('Hähnchenschenkel', 250, 'Hähnchen mit dem Gemüse vollständig schmoren.'),
    swaps: [HING],
  },
  {
    name: 'Pakoras aus dem Airfryer mit Minz-Raita',
    group: 'Schnell', minutes: 35, symbol: '🧅', technique: 'Airfryer',
    description: 'Knusprige Gemüse-Bhajis aus Kichererbsenmehl',
    ingredients: [i('Kichererbsenmehl glutenfrei', 150), i('Zwiebeln', 2, 'Stück'), i('Babyspinat', 100), i('Blumenkohl', 0.5, 'Stück'), i('Naturjoghurt', 200), i('Salatgurke', 0.5, 'Stück'), i('Minze', 5), i('Basmatireis', 120), i('Rapsöl', 20, 'ml')],
    steps: [
      'Zwiebeln in feine Streifen, Blumenkohl in kleine Röschen schneiden, Spinat hacken.',
      'Kichererbsenmehl mit Gewürzen (Kreuzkümmel, Kurkuma, Chili), Salz und ca. 120 ml Wasser zu dickem Teig rühren, Gemüse unterheben.',
      'Kleine Häufchen auf Backpapier in den Airfryer setzen, mit Öl besprühen, 12 Minuten bei 190 °C backen, wenden.',
      'Mit Raita aus Joghurt, Gurke und Minze und Reis servieren.',
    ],
    swaps: ['Kichererbsenmehl (Besan) zertifiziert glutenfrei kaufen – Mühlen verarbeiten oft auch Weizen.'],
  },
]);
