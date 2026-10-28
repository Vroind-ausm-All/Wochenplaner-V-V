import type { Category, Time } from '../store/types';

export interface Template {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  category: Category;
  /** Uhrzeit beim Ablegen auf einen ganzen Tag (Monatsansicht) */
  defaultTime: Time;
}

/** Schnellbausteine – die acht aus dem alten Board plus Alltagsklassiker. */
export const TEMPLATES: Template[] = [
  { id: 'paarzeit', title: 'Paarzeit', emoji: '♡', minutes: 90, category: 'Wir', defaultTime: '19:30' },
  { id: 'date', title: 'Date Night', emoji: '🍷', minutes: 120, category: 'Wir', defaultTime: '19:00' },
  { id: 'checkin', title: 'WIR-Check-in', emoji: '🧭', minutes: 15, category: 'Wir', defaultTime: '17:00' },
  { id: 'walk', title: 'Spaziergang', emoji: '🚶', minutes: 45, category: 'Wir', defaultTime: '18:00' },
  { id: 'cook', title: 'Zusammen kochen', emoji: '👩‍🍳', minutes: 60, category: 'Wir', defaultTime: '18:30' },
  { id: 'free', title: 'Eigene Freizeit', emoji: '🌿', minutes: 60, category: 'Ich', defaultTime: '20:00' },
  { id: 'sport', title: 'Sport', emoji: '🏃', minutes: 45, category: 'Ich', defaultTime: '07:00' },
  { id: 'rest', title: 'Erholung', emoji: '🛋️', minutes: 60, category: 'Ich', defaultTime: '15:00' },
  { id: 'shop', title: 'Einkaufen', emoji: '🛒', minutes: 60, category: 'Haushalt', defaultTime: '10:00' },
  { id: 'clean', title: 'Putzen', emoji: '🧽', minutes: 60, category: 'Haushalt', defaultTime: '11:00' },
  { id: 'baby', title: 'Babyvorbereitung', emoji: '🍼', minutes: 45, category: 'Baby', defaultTime: '17:00' },
  { id: 'doctor', title: 'Arzttermin', emoji: '🩺', minutes: 60, category: 'Termin', defaultTime: '09:00' },
  { id: 'family', title: 'Familienbesuch', emoji: '👨‍👩‍👧', minutes: 180, category: 'Familie', defaultTime: '14:00' },
];

export const CATEGORY_STYLE: Record<Category, { emoji: string; hue: number }> = {
  Wir: { emoji: '♡', hue: 8 },
  Ich: { emoji: '🌿', hue: 140 },
  Familie: { emoji: '👨‍👩‍👧', hue: 270 },
  Baby: { emoji: '🍼', hue: 320 },
  Haushalt: { emoji: '🏠', hue: 40 },
  Arbeit: { emoji: '💼', hue: 210 },
  Termin: { emoji: '📌', hue: 190 },
  Frist: { emoji: '⏳', hue: 25 },
};
