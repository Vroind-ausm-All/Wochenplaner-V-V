import { addDays, today } from '../lib/date';
import { uid } from '../lib/id';
import type { PlannerData, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  quoteOffset: 0,
  personA: 'Person A',
  personB: 'Person B',
  wirGoalMinutes: 240,
  ichGoalMinutes: 180,
  dateNightEveryDays: 14,
  weekdayWindow: ['18:30', '22:00'],
  weekendWindow: ['10:00', '21:30'],
  lunchOnWeekdays: false,
  defaultPortions: 2,
  location: null,
  dimAfterMinutes: 0,
  nightMode: false,
  nightFrom: '22:30',
  nightTo: '06:00',
  favoriteCuisines: ['Italienisch', 'Asiatisch'],
  holidayState: null,
  specialDays: true,
};

export const WOCHENKOMPASS = [
  'Wichtige Termine und Fristen ansehen',
  'Verantwortlichkeiten verteilen',
  'Erholung für beide schützen',
  'Gemeinsamen schönen Moment planen',
  'Fragen: Wer braucht nächste Woche Hilfe?',
];

export function seed(): PlannerData {
  const t = today();
  return {
    events: [
      { id: uid(), title: 'Gemeinsamer Spaziergang', date: addDays(t, 1), time: '18:00', duration: 40, category: 'Wir', owner: 'Beide', allDay: false, repeat: 'none', reminder: 'none' },
      { id: uid(), title: 'WIR-Check-in', date: addDays(t, 6 - ((new Date().getDay() + 6) % 7)), time: '17:00', duration: 15, category: 'Wir', owner: 'Beide', allDay: false, repeat: 'weekly', reminder: 'none' },
    ],
    shopping: [{ id: uid(), name: 'Hafermilch (glutenfrei zertifiziert)', qty: '2 Packungen', category: 'Lebensmittel', done: false }],
    inventory: [{ id: uid(), name: 'Waschmittel', qty: 1, min: 2, unit: 'Flaschen', category: 'Haushalt', gfStatus: 'not-applicable' }],
    tasks: [{ id: uid(), title: 'Wochenkompass vorbereiten', owner: 'Beide', due: addDays(t, 6), repeat: 'weekly', doneDates: [], notes: '' }],
    meals: {},
    documents: [],
    baby: [{ id: uid(), title: 'Babyausstattung gemeinsam durchgehen', group: 'Anschaffungen', owner: 'Beide', date: addDays(t, 7), done: false, notes: '' }],
    checks: WOCHENKOMPASS.map(() => false),
    settings: { ...DEFAULT_SETTINGS },
    checkins: {},
    favoriteAffirmations: [],
    favoriteRecipes: [],
    dismissed: {},
    calendars: [],
  };
}
