export interface DateIdea {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  place: 'draußen' | 'drinnen' | 'egal';
  cost: 'kostenlos' | 'günstig' | 'besonders';
  /** benötigte Energie: 1 = auch nach einem langen Tag möglich */
  energy: 1 | 2 | 3;
  text: string;
}

export const DATE_IDEAS: DateIdea[] = [
  { id: 'walk', title: 'Abendspaziergang', emoji: '🚶', minutes: 45, place: 'draußen', cost: 'kostenlos', energy: 1, text: 'Handys bleiben zu Hause – nur ihr zwei und die Abendluft.' },
  { id: 'sunset', title: 'Sonnenuntergang schauen', emoji: '🌅', minutes: 40, place: 'draußen', cost: 'kostenlos', energy: 1, text: 'Thermoskanne mit Tee, eine Decke, ein schöner Platz.' },
  { id: 'picnic', title: 'Picknick im Park', emoji: '🧺', minutes: 90, place: 'draußen', cost: 'günstig', energy: 2, text: 'Glutenfreie Snacks einpacken: Pão de queijo, Obst, Käse.' },
  { id: 'bike', title: 'Radtour mit Café-Stopp', emoji: '🚲', minutes: 120, place: 'draußen', cost: 'günstig', energy: 3, text: 'Vorher ein Café mit glutenfreiem Kuchen heraussuchen.' },
  { id: 'market', title: 'Gemeinsam auf den Wochenmarkt', emoji: '🥬', minutes: 60, place: 'draußen', cost: 'günstig', energy: 2, text: 'Zutaten für das nächste Kochdate aussuchen.' },
  { id: 'cook', title: 'Kochabend zu zweit', emoji: '👩‍🍳', minutes: 90, place: 'drinnen', cost: 'günstig', energy: 2, text: 'Eine neue Küche ausprobieren – einer schneidet, einer rührt.' },
  { id: 'movie', title: 'Kinoabend auf dem Sofa', emoji: '🎬', minutes: 120, place: 'drinnen', cost: 'kostenlos', energy: 1, text: 'Abwechselnd aussuchen, Popcorn ist von Natur aus glutenfrei.' },
  { id: 'games', title: 'Spieleabend', emoji: '🎲', minutes: 60, place: 'drinnen', cost: 'kostenlos', energy: 2, text: 'Ein Kartenspiel, ein Brettspiel, ein bisschen Ehrgeiz.' },
  { id: 'questions', title: '36 Fragen zum Verlieben', emoji: '💬', minutes: 45, place: 'drinnen', cost: 'kostenlos', energy: 1, text: 'Abwechselnd fragen und wirklich zuhören.' },
  { id: 'spa', title: 'Wellness-Abend zu Hause', emoji: '🛁', minutes: 75, place: 'drinnen', cost: 'günstig', energy: 1, text: 'Massage, Kerzen, ruhige Musik – nichts muss.' },
  { id: 'memories', title: 'Fotos von früher anschauen', emoji: '📸', minutes: 45, place: 'drinnen', cost: 'kostenlos', energy: 1, text: 'Welche Momente wollen wir wiederholen?' },
  { id: 'restaurant', title: 'Date Night auswärts', emoji: '🍷', minutes: 150, place: 'egal', cost: 'besonders', energy: 2, text: 'Restaurant mit glutenfreier Küche vorher anrufen und Kreuzkontakt ansprechen.' },
  { id: 'dance', title: 'Wohnzimmer-Tanz', emoji: '💃', minutes: 30, place: 'drinnen', cost: 'kostenlos', energy: 2, text: 'Eure Lieder von früher, laut.' },
  { id: 'future', title: 'Träume-Abend', emoji: '✨', minutes: 60, place: 'egal', cost: 'kostenlos', energy: 1, text: 'Wohin wollen wir in fünf Jahren? Eine Liste, keine Pläne.' },
];

/** Gesprächsimpulse für 5 Minuten echtes Zuhören (aus dem Wochenkompass des alten Boards erweitert). */
export const QUESTIONS = [
  'Was war heute schwer – und was hat gutgetan?',
  'Was brauchst du diese Woche von mir?',
  'Wofür bist du mir gerade dankbar?',
  'Wann hast du dich zuletzt richtig gesehen gefühlt?',
  'Was würdest du gern einmal wieder mit mir machen?',
  'Welche Kleinigkeit macht dir im Alltag Freude?',
  'Was ist gerade dein größter Gedanke im Kopf?',
  'Worauf freust du dich in den nächsten Tagen?',
  'Was können wir diese Woche weglassen?',
  'Was hast du heute über dich gelernt?',
  'Welcher Moment mit uns hat dich zuletzt zum Lachen gebracht?',
  'Was wünschst du dir für unser nächstes Wochenende?',
];
