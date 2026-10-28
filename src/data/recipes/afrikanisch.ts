import { cuisine, i, meat } from './helpers';

export default cuisine('Afrikanisch', [
  {
    name: 'Misir Wot mit Injera',
    group: 'Besonders', minutes: 50, symbol: '🫓',
    description: 'Äthiopisch: rote Linsen in Berbere, dazu Teff-Fladen',
    ingredients: [i('Rote Linsen', 200), i('Zwiebeln', 2, 'Stück'), i('Tomatenmark', 40), i('Knoblauch', 3, 'Zehen'), i('Ingwer', 15), i('Rapsöl', 30, 'ml'), i('Teffmehl', 200), i('Blattspinat', 200)],
    steps: [
      'Injera-Teig nach Grundrezept ansetzen (Schnellvariante: 30 Minuten mit Mineralwasser und Natron).',
      'Zwiebeln sehr fein hacken und ohne Fett 10 Minuten trocken rösten, dann Öl, Knoblauch, Ingwer und Berbere zugeben.',
      'Tomatenmark und Linsen einrühren, mit 600 ml Wasser 25 Minuten zu einem dicken Eintopf köcheln.',
      'Spinat mit Knoblauch als Gomen dünsten. Injera in einer Pfanne nur von einer Seite backen, bis sich Poren bilden.',
    ],
    meat: meat('Rinderschmorwürfel', 250, 'Für Key Wot das Rindfleisch mit Zwiebeln und Berbere 60 Minuten weich schmoren.'),
    swaps: ['Injera in Restaurants ist oft mit Weizen gestreckt – selbst gemacht aus 100 % Teff ist es glutenfrei.', 'Berbere selbst mischen oder auf Kennzeichnung achten.'],
    homemade: ['gf-injera'],
  },
  {
    name: 'Maafe – Erdnuss-Eintopf mit Süßkartoffel',
    group: 'Klassiker', minutes: 45, symbol: '🥜',
    description: 'Westafrikanisch, cremig und wärmend',
    ingredients: [i('Süßkartoffeln', 400), i('Erdnussmus', 60), i('Passierte Tomaten', 400), i('Zwiebeln', 1, 'Stück'), i('Ingwer', 15), i('Blattspinat', 150), i('Kichererbsen', 240), i('Reis', 140), i('Rapsöl', 15, 'ml')],
    steps: [
      'Zwiebel und Ingwer im Öl anschwitzen, Süßkartoffelwürfel zugeben.',
      'Tomaten, Erdnussmus und 300 ml Wasser glatt einrühren, 20 Minuten köcheln.',
      'Kichererbsen und Spinat zugeben und 5 Minuten ziehen lassen; mit Chili und Limette abschmecken.',
      'Mit Reis servieren.',
    ],
    meat: meat('Hähnchenschenkel', 300, 'Hähnchen anbraten und im Eintopf vollständig mitschmoren.'),
    swaps: ['Brühwürfel (klassisch: Maggi) enthalten oft Weizen – Gemüsebrühe selbst machen.'],
    homemade: ['gf-bruehe'],
  },
  {
    name: 'Jollof-Reis mit gebratener Kochbanane',
    group: 'Klassiker', minutes: 50, symbol: '🍛',
    description: 'Der rote Partyreis aus Ghana und Nigeria',
    ingredients: [i('Reis', 160), i('Passierte Tomaten', 400), i('Paprika', 2, 'Stück'), i('Zwiebeln', 1, 'Stück'), i('Tomatenmark', 30), i('Gemüsebrühe glutenfrei', 400, 'ml'), i('Kochbananen', 2, 'Stück'), i('Rapsöl', 40, 'ml')],
    steps: [
      'Paprika, Zwiebel und Tomaten fein pürieren.',
      'Tomatenmark im Öl rösten, Püree zugeben und 10 Minuten einkochen; mit Thymian, Curry und Lorbeer würzen.',
      'Reis einrühren, Brühe angießen, abgedeckt bei kleiner Hitze 25 Minuten garen.',
      'Kochbananen schräg in Scheiben schneiden und in Öl goldbraun braten.',
    ],
    meat: meat('Hähnchenschenkel', 300, 'Hähnchen separat vollständig braten oder backen und dazu servieren.'),
    swaps: ['Currypulver auf glutenfreie Kennzeichnung prüfen.'],
  },
  {
    name: 'Chakalaka mit Pap (Maisbrei)',
    group: 'Modern', minutes: 40, symbol: '🌽',
    description: 'Südafrikanisches Bohnen-Gemüse-Relish mit cremigem Mais',
    ingredients: [i('Polenta glutenfrei', 150), i('Weiße Bohnen', 240), i('Karotten', 2, 'Stück'), i('Paprika', 1, 'Stück'), i('Zwiebeln', 1, 'Stück'), i('Passierte Tomaten', 400), i('Ingwer', 10), i('Rapsöl', 20, 'ml'), i('Butter', 15)],
    steps: [
      'Zwiebel, Paprika und geraspelte Karotten im Öl mit Ingwer und Curry 8 Minuten braten.',
      'Tomaten und Bohnen zugeben, 15 Minuten würzig einkochen.',
      'Maisgrieß in 600 ml kochendes Salzwasser einrühren und unter Rühren 10 Minuten zu Pap garen, Butter unterrühren.',
      'Pap mit Chakalaka servieren.',
    ],
    meat: meat('Bratwurst glutenfrei', 200, '„Pap & Wors“: Bratwurst vollständig grillen und dazu servieren.'),
  },
  {
    name: 'Red Red – ghanaischer Bohneneintopf',
    group: 'Schnell', minutes: 35, symbol: '🍌',
    description: 'Augenbohnen in Tomate, dazu süße Kochbanane',
    ingredients: [i('Augenbohnen', 480), i('Passierte Tomaten', 400), i('Zwiebeln', 1, 'Stück'), i('Ingwer', 15), i('Knoblauch', 2, 'Zehen'), i('Rapsöl', 40, 'ml'), i('Kochbananen', 2, 'Stück')],
    steps: [
      'Zwiebel, Ingwer und Knoblauch im Öl (traditionell Palmöl) weich braten.',
      'Tomaten zugeben und 10 Minuten einkochen.',
      'Bohnen zugeben und 10 Minuten ziehen lassen, mit Chili abschmecken.',
      'Kochbananen in Scheiben braten und dazu servieren.',
    ],
    meat: meat('Lachsfilet', 200, 'Lachs separat braten und auf den Eintopf setzen.'),
  },
]);
