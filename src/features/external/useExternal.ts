import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { addDays, today } from '../../lib/date';
import { holidaysBetween, type State } from '../../lib/holidays';
import { expandIcs, type IcsOccurrence } from '../../lib/ical';
import { occurrences, byDayAndTime, type Occurrence } from '../../lib/recurrence';
import { useStore } from '../../store/store';
import { useSync } from '../../store/sync';
import type { ExternalCalendar, ISODate, PlannerData } from '../../store/types';

/**
 * Abonnierte Kalender. Die Abo-Liste ist Teil der gemeinsamen Daten; die Termine holt jedes Gerät
 * selbst und speichert sie lokal zwischen (so funktioniert die Anzeige auch offline).
 * Abruf über den Heimserver (/api/ics), weil Google, iCloud & Co. direkte Browserzugriffe meist sperren.
 */
interface CacheEntry {
  url: string;
  fetchedAt: number;
  window: [ISODate, ISODate];
  items: IcsOccurrence[];
  error?: string;
}

interface ExternalState {
  cache: Record<string, CacheEntry>;
  loading: Record<string, boolean>;
}

const KEY = 'wir-external-v1';
const MAX_AGE = 30 * 60 * 1000;
/** Gespeicherter Zeitraum: 2 Monate zurück, 13 Monate voraus */
const windowFor = (t: ISODate): [ISODate, ISODate] => [addDays(t, -62), addDays(t, 400)];

const load = (): ExternalState['cache'] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

export const useExternalStore = create<ExternalState>(() => ({ cache: typeof localStorage === 'undefined' ? {} : load(), loading: {} }));

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(useExternalStore.getState().cache));
  } catch {
    /* zu groß – dann eben nur im Speicher */
  }
};

export const normalizeUrl = (url: string) => url.trim().replace(/^webcals?:\/\//i, 'https://');

async function download(url: string): Promise<string> {
  const target = normalizeUrl(url);
  if (useSync.getState().connected) {
    const r = await fetch(`/api/ics?url=${encodeURIComponent(target)}`);
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `Abruf fehlgeschlagen (${r.status})`);
    return r.text();
  }
  try {
    const r = await fetch(target);
    if (!r.ok) throw new Error(`Abruf fehlgeschlagen (${r.status})`);
    return await r.text();
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Dieser Kalender lässt sich nur über den Heimserver abrufen.');
    throw e;
  }
}

export async function refreshCalendar(cal: ExternalCalendar, force = false) {
  const st = useExternalStore.getState();
  const c = st.cache[cal.id];
  if (!force && c && c.url === cal.url && Date.now() - c.fetchedAt < MAX_AGE && !c.error) return;
  if (st.loading[cal.id]) return;
  useExternalStore.setState((s) => ({ loading: { ...s.loading, [cal.id]: true } }));
  const window = windowFor(today());
  let entry: CacheEntry;
  try {
    const text = await download(cal.url);
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('Unter dieser Adresse liegt kein Kalender (iCal/ICS).');
    entry = { url: cal.url, fetchedAt: Date.now(), window, items: expandIcs(text, window[0], window[1]) };
  } catch (e) {
    // Alte Termine behalten, nur den Fehler vermerken.
    entry = { url: cal.url, fetchedAt: Date.now(), window, items: c?.url === cal.url ? c.items : [], error: (e as Error).message };
  }
  useExternalStore.setState((s) => ({ cache: { ...s.cache, [cal.id]: entry }, loading: { ...s.loading, [cal.id]: false } }));
  persist();
}

/** Einmal in der App einbinden: hält alle Abos aktuell. */
export function useExternalUpdater() {
  const calendars = useStore((s) => s.data.calendars);
  const connected = useSync((s) => s.connected);
  useEffect(() => {
    const run = () => calendars.forEach((c) => void refreshCalendar(c));
    run();
    const t = setInterval(run, 5 * 60 * 1000);
    // Entfernte Abos auch aus dem Zwischenspeicher löschen.
    const ids = new Set(calendars.map((c) => c.id));
    const cache = useExternalStore.getState().cache;
    if (Object.keys(cache).some((k) => !ids.has(k))) {
      useExternalStore.setState({ cache: Object.fromEntries(Object.entries(cache).filter(([k]) => ids.has(k))) });
      persist();
    }
    return () => clearInterval(t);
  }, [calendars, connected]);
}

/** Feiertage und Abo-Termine im Zeitraum, im Format der eigenen Termine. */
export function externalBetween(data: PlannerData, cache: ExternalState['cache'], from: ISODate, to: ISODate): Occurrence[] {
  const out: Occurrence[] = [];
  const s = data.settings;
  for (const h of holidaysBetween(from, to, (s.holidayState as State) ?? null, s.specialDays)) {
    out.push({
      id: `hol:${h.date}:${h.name}`, on: h.date, date: h.date, title: h.name, time: '00:00', duration: 1440, allDay: true,
      category: 'Familie', owner: 'Beide', repeat: 'none', reminder: 'none',
      external: { kind: 'holiday', calendarId: 'feiertage', calendarName: h.official ? 'Feiertag' : 'Besonderer Tag', hue: h.official ? 0 : 330, busy: false, official: h.official },
    });
  }
  for (const cal of data.calendars) {
    if (!cal.visible) continue;
    for (const it of cache[cal.id]?.items ?? []) {
      if (it.date < from || it.date > to) continue;
      out.push({
        id: `ext:${cal.id}:${it.uid}:${it.date}:${it.time}`, on: it.date, date: it.date, title: it.title, time: it.time, duration: it.duration, allDay: it.allDay,
        category: 'Termin', owner: cal.owner, repeat: 'none', reminder: 'none',
        external: { kind: 'ics', calendarId: cal.id, calendarName: cal.name, hue: cal.hue, busy: cal.busy, location: it.location, description: it.description, span: it.span },
      });
    }
  }
  return out;
}

/** Eigene Termine + Feiertage + Abos – für alle Kalenderansichten. */
export function useAllOccurrences(from: ISODate, to: ISODate): Occurrence[] {
  const data = useStore((s) => s.data);
  const cache = useExternalStore((s) => s.cache);
  return useMemo(() => [...occurrences(data.events, from, to), ...externalBetween(data, cache, from, to)].sort(byDayAndTime), [data, cache, from, to]);
}
