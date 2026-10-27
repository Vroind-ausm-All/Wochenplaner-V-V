export interface Affirmation {
  id: string;
  text: string;
  theme: 'Wir' | 'Gelassenheit' | 'Selbstfürsorge' | 'Familie' | 'Dankbarkeit';
}

const list: [Affirmation['theme'], string][] = [
  // Die sieben Gedanken des bisherigen Boards
  ['Wir', 'Wir teilen Verantwortung und schöne Momente.'],
  ['Gelassenheit', 'Wir müssen nicht alles schaffen. Wir dürfen gemeinsam lernen.'],
  ['Selbstfürsorge', 'Erholung ist keine Belohnung, sondern ein Bedürfnis.'],
  ['Familie', 'Wir dürfen um Unterstützung bitten, bevor es zu viel wird.'],
  ['Wir', 'Ein gutes Miteinander beginnt mit echtem Zuhören.'],
  ['Gelassenheit', 'Ein unperfekter Tag ist kein gescheiterter Tag.'],
  ['Wir', 'Wir sind ein Team, auch wenn wir Unterschiedliches brauchen.'],
  // Neu
  ['Wir', '{A} und {B}: Kleine Momente zählen mehr als große Pläne.'],
  ['Wir', 'Wir wählen einander – heute wieder.'],
  ['Wir', 'Wir sprechen aus, was wir brauchen, statt zu hoffen, dass es erraten wird.'],
  ['Wir', 'Zehn Minuten echte Aufmerksamkeit sind ein Geschenk.'],
  ['Wir', 'Unterschiedlich zu sein macht uns vollständiger.'],
  ['Gelassenheit', 'Was heute nicht passt, darf morgen passen.'],
  ['Gelassenheit', 'Wir planen, damit wir loslassen können.'],
  ['Gelassenheit', 'Atmen. Ein Schritt nach dem anderen.'],
  ['Gelassenheit', 'Nicht jede Lücke im Kalender muss gefüllt werden.'],
  ['Selbstfürsorge', 'Eigene Zeit macht uns zu besseren Partnern.'],
  ['Selbstfürsorge', 'Nein zu sagen ist manchmal das freundlichste Ja zu uns.'],
  ['Selbstfürsorge', 'Gut für sich zu sorgen ist nicht egoistisch, sondern nötig.'],
  ['Selbstfürsorge', 'Müde sein ist ein Signal, kein Versagen.'],
  ['Familie', 'Unser Zuhause ist ein Ort, an dem man ankommen darf.'],
  ['Familie', 'Mental Load wird leichter, wenn wir sie sichtbar machen.'],
  ['Familie', 'Gemeinsam gekocht schmeckt doppelt.'],
  ['Familie', 'Wir wachsen in unsere neuen Rollen hinein – mit Geduld.'],
  ['Dankbarkeit', 'Heute gab es mindestens einen Moment zum Lächeln.'],
  ['Dankbarkeit', 'Danke sagen kostet nichts und wärmt beide.'],
  ['Dankbarkeit', 'Wir sehen, was der andere still erledigt.'],
  ['Dankbarkeit', 'Das Gewöhnliche ist oft das Wertvolle.'],
];

export const AFFIRMATIONS: Affirmation[] = list.map(([theme, text], i) => ({ id: `a${i}`, theme, text }));

export const personalize = (text: string, a: string, b: string) => text.replace('{A}', a).replace('{B}', b);

/** Jeden Tag ein anderer Startgedanke, über `quoteOffset` verschiebbar (altes Board). */
export function dailyIndex(date: Date, offset = 0) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 864e5);
  return (((day + offset) % AFFIRMATIONS.length) + AFFIRMATIONS.length) % AFFIRMATIONS.length;
}
