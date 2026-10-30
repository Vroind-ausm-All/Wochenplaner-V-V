// Datenmodell. Bewusst eine Obermenge des alten WIR-Boards (Schlüssel `wir-board-4-v1`),
// damit Sicherungen und der Familienserver zwischen alter und neuer Oberfläche kompatibel bleiben.

export type ISODate = string; // 'YYYY-MM-DD'
export type Time = string; // 'HH:MM'

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Owner = 'Beide' | 'Person A' | 'Person B';
export const OWNERS: Owner[] = ['Beide', 'Person A', 'Person B'];

export type Category = 'Wir' | 'Ich' | 'Familie' | 'Baby' | 'Haushalt' | 'Frist' | 'Arbeit' | 'Termin';
export const CATEGORIES: Category[] = ['Wir', 'Ich', 'Familie', 'Baby', 'Haushalt', 'Arbeit', 'Termin', 'Frist'];

export interface CalendarEvent {
  id: string;
  title: string;
  date: ISODate;
  time: Time;
  duration: number; // Minuten
  category: Category;
  owner: Owner;
  allDay: boolean;
  repeat: Repeat;
  reminder: 'none' | '15' | '60' | '1440';
  exDates?: ISODate[];
  notes?: string;
  /** Herkunft, z. B. 'companion' für Vorschläge des Begleiters */
  origin?: string;
}

export type MealSlot = 'Mittag' | 'Abend';
export const MEAL_SLOTS: MealSlot[] = ['Mittag', 'Abend'];

export interface PlannedMeal {
  /** Rezeptname – so speichert es das alte Board */
  name: string;
  recipeId?: string;
  portions: number;
  meat: boolean;
  /** Gemeinsam kochen? Der Begleiter zählt das als Wir-Zeit. */
  together?: boolean;
}

export type MealPlan = Record<ISODate, Partial<Record<MealSlot | 'Frühstück', PlannedMeal>>>;

export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  category: string;
  done: boolean;
  origin?: 'meal-plan' | string;
}

export type GfStatus = 'verified' | 'unverified' | 'not-applicable';
export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  min: number;
  unit: string;
  category: string;
  gfStatus: GfStatus;
}

export interface Task {
  id: string;
  title: string;
  owner: Owner;
  due: ISODate;
  repeat: Repeat;
  doneDates: ISODate[];
  notes: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  due: ISODate;
  category: string;
  owner?: Owner;
  done?: boolean;
  notes?: string;
}

export interface BabyItem {
  id: string;
  title: string;
  group: string;
  owner: Owner;
  date: ISODate;
  done: boolean;
  notes: string;
}

export type Energy = 1 | 2 | 3;
export interface CheckIn {
  a?: Energy;
  b?: Energy;
}

/** Abonnierter Kalender (iCal/ICS) – nur lesend. Die Liste wird geteilt, die Termine holt jedes Gerät selbst. */
export interface ExternalCalendar {
  id: string;
  name: string;
  url: string;
  hue: number;
  owner: Owner;
  /** Termine daraus gelten für den Begleiter als belegte Zeit */
  busy: boolean;
  visible: boolean;
}

/** Zusatzinfo an Terminen, die nicht aus dem eigenen Plan stammen (Abos, Feiertage). */
export interface ExternalMeta {
  kind: 'ics' | 'holiday';
  calendarId: string;
  calendarName: string;
  hue: number;
  busy: boolean;
  official?: boolean;
  location?: string;
  description?: string;
  span?: { day: number; of: number };
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export interface Settings {
  quoteOffset: number;
  personA: string;
  personB: string;
  /** Wir-Zeit-Ziel pro Woche in Minuten */
  wirGoalMinutes: number;
  /** Eigene Zeit pro Person und Woche in Minuten */
  ichGoalMinutes: number;
  /** Date Night spätestens alle n Tage */
  dateNightEveryDays: number;
  /** Abendfenster, in denen der Begleiter Vorschläge sucht */
  weekdayWindow: [Time, Time];
  weekendWindow: [Time, Time];
  lunchOnWeekdays: boolean;
  defaultPortions: number;
  location: Location | null;
  dimAfterMinutes: number; // 0 = aus
  nightMode: boolean;
  nightFrom: Time;
  nightTo: Time;
  favoriteCuisines: string[];
  /** Bundesland für gesetzliche Feiertage (Kürzel, z. B. 'BY'); null = nur bundesweite */
  holidayState: string | null;
  /** Valentinstag, Muttertag, Heiligabend, Silvester anzeigen */
  specialDays: boolean;
}

export interface PlannerData {
  events: CalendarEvent[];
  shopping: ShoppingItem[];
  inventory: InventoryItem[];
  tasks: Task[];
  meals: MealPlan;
  documents: DocumentItem[];
  baby: BabyItem[];
  /** Wochenkompass-Checkliste (altes Board) */
  checks: boolean[];
  settings: Settings;
  checkins: Record<ISODate, CheckIn>;
  favoriteAffirmations: string[];
  favoriteRecipes: string[];
  /** Vom Begleiter verworfene Vorschläge (ID → Datum des Verwerfens) */
  dismissed: Record<string, ISODate>;
  /** Abonnierte Kalender */
  calendars: ExternalCalendar[];
}
