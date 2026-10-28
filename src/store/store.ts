import { create } from 'zustand';
import { findRecipe } from '../data/recipes';
import type { Recipe } from '../data/recipes/types';
import { addDays, isWeekend, monday, today } from '../lib/date';
import { regenerateShopping } from '../lib/grocery';
import { uid } from '../lib/id';
import { loadLocal, normalize, STORAGE_KEY } from './migrate';
import type { CalendarEvent, CheckIn, Energy, ISODate, MealSlot, PlannerData, PlannedMeal, Settings, Time } from './types';

export type View = 'home' | 'calendar' | 'meals' | 'shopping' | 'tasks' | 'companion' | 'family' | 'settings';
export type CalendarMode = 'month' | 'week' | 'day' | 'agenda';

interface Toast {
  id: number;
  text: string;
  undo?: boolean;
}

interface UiState {
  view: View;
  calendarMode: CalendarMode;
  /** Ausgewählter Tag – Anker für alle Kalenderansichten */
  cursor: ISODate;
  /** Woche, für die die Einkaufsliste aus dem Essensplan berechnet wird */
  groceryWeek: ISODate;
  editing: { kind: 'event'; event?: CalendarEvent; draft?: Partial<CalendarEvent> } | null;
  recipeOpen: string | null;
  toast: Toast | null;
}

interface Actions {
  /** Jede Datenänderung läuft hier durch: Kopie, Änderung, Verlauf für „Rückgängig“. */
  mutate: (fn: (d: PlannerData) => void, toast?: string) => void;
  undo: () => void;
  replaceAll: (d: unknown, opts?: { silent?: boolean }) => void;
  setUi: (p: Partial<UiState>) => void;
  notify: (text: string, undo?: boolean) => void;

  addEvent: (e: Omit<CalendarEvent, 'id'>, toast?: string) => string;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  /** Verschiebt ein (Serien-)Vorkommen. scope 'one' löst das Vorkommen aus der Serie. */
  moveEvent: (id: string, from: ISODate, to: ISODate, time: Time | null, scope: 'one' | 'all') => void;
  resizeEvent: (id: string, duration: number) => void;

  placeMeal: (day: ISODate, slot: MealSlot, recipe: Recipe, opts?: Partial<PlannedMeal>) => void;
  moveMeal: (from: { day: ISODate; slot: MealSlot }, to: { day: ISODate; slot: MealSlot }) => void;
  updateMeal: (day: ISODate, slot: MealSlot, patch: Partial<PlannedMeal>) => void;
  removeMeal: (day: ISODate, slot: MealSlot) => void;

  setCheckin: (day: ISODate, who: keyof CheckIn, energy: Energy) => void;
  updateSettings: (p: Partial<Settings>) => void;
}

export type Store = { data: PlannerData; history: PlannerData[] } & UiState & Actions;

const initial = loadLocal(typeof localStorage === 'undefined' ? { getItem: () => null } : localStorage);
let toastId = 0;

const regroceries = (d: PlannerData, week: ISODate) => {
  d.shopping = regenerateShopping(d.shopping, d.inventory, d.meals, week);
};

export const useStore = create<Store>()((set, get) => ({
  data: initial.data,
  history: [],
  view: 'home',
  calendarMode: 'week',
  cursor: today(),
  groceryWeek: monday(today()),
  editing: null,
  recipeOpen: null,
  toast: initial.migrated ? { id: ++toastId, text: 'Daten aus dem bisherigen WIR-Board übernommen ✓' } : null,

  mutate(fn, toast) {
    const prev = get().data;
    const next = structuredClone(prev);
    fn(next);
    set((s) => ({ data: next, history: [...s.history.slice(-24), prev] }));
    if (toast) get().notify(toast, true);
  },
  undo() {
    const h = get().history;
    if (!h.length) return;
    set({ data: h[h.length - 1], history: h.slice(0, -1), toast: { id: ++toastId, text: 'Rückgängig gemacht' } });
  },
  replaceAll(d, opts) {
    set((s) => ({ data: normalize(d), history: opts?.silent ? s.history : [...s.history, s.data] }));
  },
  setUi: (p) => set(p),
  notify: (text, undo) => set({ toast: { id: ++toastId, text, undo } }),

  addEvent(e, toast = 'Termin eingeplant') {
    const id = uid();
    get().mutate((d) => void d.events.push({ ...e, id }), toast);
    return id;
  },
  updateEvent(id, patch) {
    get().mutate((d) => {
      const ev = d.events.find((x) => x.id === id);
      if (ev) Object.assign(ev, patch);
    }, 'Termin gespeichert');
  },
  deleteEvent(id) {
    get().mutate((d) => void (d.events = d.events.filter((x) => x.id !== id)), 'Termin gelöscht');
  },
  moveEvent(id, from, to, time, scope) {
    get().mutate((d) => {
      const ev = d.events.find((x) => x.id === id);
      if (!ev) return;
      if (ev.repeat === 'none' || scope === 'all') {
        // Ganze Serie um dieselbe Anzahl Tage verschieben.
        const delta = Math.round((new Date(`${to}T12:00`).getTime() - new Date(`${from}T12:00`).getTime()) / 864e5);
        ev.date = addDays(ev.date, delta);
        if (ev.exDates) ev.exDates = ev.exDates.map((x) => addDays(x, delta));
        if (time) {
          ev.time = time;
          ev.allDay = false;
        }
      } else {
        ev.exDates = [...(ev.exDates || []), from];
        d.events.push({ ...ev, id: uid(), date: to, time: time ?? ev.time, allDay: time ? false : ev.allDay, repeat: 'none', exDates: [] });
      }
    }, 'Termin verschoben');
  },
  resizeEvent(id, duration) {
    get().mutate((d) => {
      const ev = d.events.find((x) => x.id === id);
      if (ev) ev.duration = Math.max(15, Math.min(12 * 60, duration));
    });
  },

  placeMeal(day, slot, recipe, opts) {
    const s = get().data.settings;
    if (slot === 'Mittag' && !isWeekend(day) && !s.lunchOnWeekdays) slot = 'Abend';
    const week = monday(day);
    set({ groceryWeek: week });
    get().mutate((d) => {
      d.meals[day] = { ...(d.meals[day] || {}), [slot]: { name: recipe.name, recipeId: recipe.id, portions: s.defaultPortions, meat: false, ...opts } };
      regroceries(d, week);
    }, `${recipe.symbol} ${recipe.name} eingeplant · Einkaufsliste aktualisiert`);
  },
  moveMeal(from, to) {
    get().mutate((d) => {
      const m = d.meals[from.day]?.[from.slot];
      if (!m) return;
      const swap = d.meals[to.day]?.[to.slot];
      d.meals[to.day] = { ...(d.meals[to.day] || {}), [to.slot]: m };
      if (swap) d.meals[from.day]![from.slot] = swap;
      else delete d.meals[from.day]![from.slot];
      regroceries(d, get().groceryWeek);
    }, 'Mahlzeit verschoben');
  },
  updateMeal(day, slot, patch) {
    get().mutate((d) => {
      const m = d.meals[day]?.[slot];
      if (!m) return;
      Object.assign(m, patch);
      if (patch.meat && !findRecipe(m)?.meat) m.meat = false;
      regroceries(d, get().groceryWeek);
    });
  },
  removeMeal(day, slot) {
    get().mutate((d) => {
      if (d.meals[day]) delete d.meals[day][slot];
      regroceries(d, get().groceryWeek);
    }, 'Mahlzeit entfernt');
  },

  setCheckin(day, who, energy) {
    get().mutate((d) => void (d.checkins[day] = { ...(d.checkins[day] || {}), [who]: energy }));
  },
  updateSettings(p) {
    get().mutate((d) => void Object.assign(d.settings, p));
  },
}));

export const regenerateGroceries = (week: ISODate) => {
  useStore.setState({ groceryWeek: week });
  useStore.getState().mutate((d) => regroceries(d, week), 'Einkaufsliste neu berechnet');
};

// ---- Persistenz & Tabs -------------------------------------------------------
try {
  // Erststart bzw. übernommene Altdaten sofort unter dem neuen Schlüssel sichern.
  if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(initial.data));
} catch {
  /* kein Speicher verfügbar */
}
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('wir-wochenplaner') : null;
let fromChannel = false;

useStore.subscribe((s, prev) => {
  if (s.data === prev.data) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s.data));
  } catch {
    /* Speicher voll oder privat – weiterarbeiten */
  }
  if (fromChannel) return; // Der andere Tab gleicht selbst mit dem Server ab.
  channel?.postMessage({ type: 'update', data: s.data });
  syncHooks.forEach((h) => h(s.data));
});

channel?.addEventListener('message', (e) => {
  if (e.data?.type !== 'update') return;
  fromChannel = true;
  useStore.getState().replaceAll(e.data.data, { silent: true });
  fromChannel = false;
});

/** Der Server-Sync hängt sich hier ein (siehe sync.ts). */
export const syncHooks = new Set<(d: PlannerData) => void>();
