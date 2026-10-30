import type { Category, Time } from '../store/types';
import type { IconName } from '../ui/Icon';

export interface Template {
  id: string;
  title: string;
  icon: IconName;
  minutes: number;
  category: Category;
  /** Uhrzeit beim Ablegen auf einen ganzen Tag (Monatsansicht) */
  defaultTime: Time;
}

/** Schnellbausteine – die acht aus dem alten Board plus Alltagsklassiker. */
export const TEMPLATES: Template[] = [
  { id: 'paarzeit', title: 'Paarzeit', icon: 'wir', minutes: 90, category: 'Wir', defaultTime: '19:30' },
  { id: 'date', title: 'Date Night', icon: 'glass', minutes: 120, category: 'Wir', defaultTime: '19:00' },
  { id: 'checkin', title: 'WIR-Check-in', icon: 'compass', minutes: 15, category: 'Wir', defaultTime: '17:00' },
  { id: 'walk', title: 'Spaziergang', icon: 'walk', minutes: 45, category: 'Wir', defaultTime: '18:00' },
  { id: 'cook', title: 'Zusammen kochen', icon: 'pot', minutes: 60, category: 'Wir', defaultTime: '18:30' },
  { id: 'free', title: 'Eigene Freizeit', icon: 'leaf', minutes: 60, category: 'Ich', defaultTime: '20:00' },
  { id: 'sport', title: 'Sport', icon: 'run', minutes: 45, category: 'Ich', defaultTime: '07:00' },
  { id: 'rest', title: 'Erholung', icon: 'armchair', minutes: 60, category: 'Ich', defaultTime: '15:00' },
  { id: 'shop', title: 'Einkaufen', icon: 'cart', minutes: 60, category: 'Haushalt', defaultTime: '10:00' },
  { id: 'clean', title: 'Putzen', icon: 'bucket', minutes: 60, category: 'Haushalt', defaultTime: '11:00' },
  { id: 'baby', title: 'Babyvorbereitung', icon: 'pram', minutes: 45, category: 'Baby', defaultTime: '17:00' },
  { id: 'doctor', title: 'Arzttermin', icon: 'medical', minutes: 60, category: 'Termin', defaultTime: '09:00' },
  { id: 'family', title: 'Familienbesuch', icon: 'house', minutes: 180, category: 'Familie', defaultTime: '14:00' },
];

/** Piktogramm je Kategorie. `hue` bleibt für ältere Daten erhalten, die Gestaltung nutzt sie nicht mehr. */
export const CATEGORY_STYLE: Record<Category, { icon: IconName; hue: number }> = {
  Wir: { icon: 'wir', hue: 8 },
  Ich: { icon: 'leaf', hue: 140 },
  Familie: { icon: 'house', hue: 270 },
  Baby: { icon: 'pram', hue: 320 },
  Haushalt: { icon: 'bucket', hue: 40 },
  Arbeit: { icon: 'briefcase', hue: 210 },
  Termin: { icon: 'pin', hue: 190 },
  Frist: { icon: 'hourglass', hue: 25 },
};
