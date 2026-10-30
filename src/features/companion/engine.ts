import { RECIPES } from '../../data/recipes';
import type { Recipe } from '../../data/recipes/types';
import { addDays, daysBetween, fmt, fromMinutes, isWeekend, monday, range, toMinutes, weekdayIndex } from '../../lib/date';
import { occurrences, type Occurrence } from '../../lib/recurrence';
import { isOutdoorFriendly, type DailyWeather } from '../../lib/weather';
import type { CalendarEvent, Energy, ISODate, PlannerData, Time } from '../../store/types';
import type { IconName } from '../../ui/Icon';
import { DATE_IDEAS, QUESTIONS, type DateIdea } from './ideas';

/**
 * Der WIR-Begleiter: eine reine Funktion über den Planerdaten. Er schaut auf
 *  – gemeinsame Zeit (Kategorie „Wir“ + gemeinsames Kochen) gegen das Wochenziel,
 *  – eigene Zeit beider Personen (Balance statt Wettbewerb),
 *  – Abstand zur letzten Date Night, den wöchentlichen Check-in,
 *  – volle Tage und die Tagesenergie aus dem Check-in,
 *  – das Wetter, um passende Ideen in freie Zeitfenster zu legen.
 */

export type Mood = 'calm' | 'happy' | 'celebrate' | 'concerned' | 'sleepy';

export interface Suggestion {
  id: string;
  kind: 'wir' | 'date' | 'checkin' | 'ich-a' | 'ich-b' | 'rest' | 'meal';
  title: string;
  icon: IconName;
  reason: string;
  date: ISODate;
  time: Time;
  duration: number;
  category: CalendarEvent['category'];
  owner: CalendarEvent['owner'];
  recipe?: Recipe;
  idea?: DateIdea;
}

/** Hinweis des Begleiters: Piktogramm + kurzer Satz. */
export interface Message {
  icon: IconName;
  text: string;
}

export interface CompanionReport {
  mood: Mood;
  headline: string;
  messages: Message[];
  question: string;
  week: ISODate;
  wir: { minutes: number; goal: number; planned: number };
  ich: { a: number; b: number; goal: number };
  daysSinceDate: number | null;
  nextDate: Occurrence | null;
  checkinPlanned: boolean;
  busyDays: ISODate[];
  specialDays: Occurrence[];
  suggestions: Suggestion[];
}

const isDate = (e: CalendarEvent) => /date|essen gehen|kino|restaurant/i.test(e.title) || (e.category === 'Wir' && e.duration >= 90);
const isCheckin = (e: CalendarEvent) => /check-?in|wochenkompass/i.test(e.title);
const timed = (e: Occurrence) => !e.allDay;

/** Freie Zeitfenster eines Tages innerhalb des Abend-/Wochenendfensters. */
export function freeSlots(events: Occurrence[], day: ISODate, window: [Time, Time], notBefore?: Time): [number, number][] {
  let [ws, we] = window.map(toMinutes) as [number, number];
  if (notBefore) ws = Math.max(ws, Math.ceil(toMinutes(notBefore) / 15) * 15 + 15);
  const busy = events
    .filter((e) => e.on === day && timed(e))
    .map((e) => [toMinutes(e.time), toMinutes(e.time) + e.duration] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cur = ws;
  for (const [s, e] of busy) {
    if (s > cur) out.push([cur, Math.min(s, we)]);
    cur = Math.max(cur, e + 15); // 15 Min. Puffer nach Terminen
    if (cur >= we) break;
  }
  if (cur < we) out.push([cur, we]);
  return out.filter(([s, e]) => e - s >= 15);
}

function load(events: Occurrence[], day: ISODate) {
  const list = events.filter((e) => e.on === day && timed(e) && e.category !== 'Wir');
  return { count: list.length, minutes: list.reduce((a, e) => a + e.duration, 0) };
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

interface Input {
  data: PlannerData;
  today: ISODate;
  now: Time;
  weather?: DailyWeather[];
  /** Abo-Termine und Feiertage der Woche (siehe externalBetween) */
  external?: Occurrence[];
  /** Amtliche Wetterwarnungen (ab Stufe „markant“ relevant für Pläne draußen) */
  alerts?: { event: string; severity: string; onset: number; expires: number | null }[];
}

export function analyze({ data, today, now, weather = [], external = [], alerts = [] }: Input): CompanionReport {
  const s = data.settings;
  const week = monday(today);
  const days = range(week, 7);
  const occ = occurrences(data.events, week, addDays(week, 6));
  // Für freie Zeitfenster und volle Tage zählen auch belegte Abo-Termine (z. B. Dienstkalender).
  const busyOcc = [...occ, ...external.filter((e) => e.external?.busy && !e.allDay)];
  const holidays = external.filter((e) => e.external?.kind === 'holiday' && e.external.official && e.on >= week && e.on <= addDays(week, 6));
  const holidaySet = new Set(holidays.map((e) => e.on));
  const freeDay = (d: ISODate) => isWeekend(d) || holidaySet.has(d);
  // Markante Warnungen (Sturm, Gewitter, Glätte …) machen einen Tag ungeeignet für draußen.
  const strong = alerts.filter((a) => a.severity !== 'minor');
  const dayStart = (d: ISODate) => new Date(`${d}T00:00:00`).getTime();
  const warned = (d: ISODate) => strong.some((a) => a.onset < dayStart(d) + 864e5 && (a.expires === null || a.expires > dayStart(d)));
  const niceOutside = (d: ISODate) => !warned(d) && !!wx.get(d) && isOutdoorFriendly(wx.get(d)!);
  const wx = new Map(weather.map((w) => [w.date, w]));
  const A = s.personA, B = s.personB;

  // --- Wir-Zeit -------------------------------------------------------------
  const wirEvents = occ.filter((e) => e.category === 'Wir');
  const togetherMeals = days.flatMap((d) => Object.values(data.meals[d] || {}).filter((m) => m?.together)).length;
  const wirMinutes = wirEvents.reduce((a, e) => a + (e.allDay ? 180 : e.duration), 0) + togetherMeals * 45;
  const wirDone = wirEvents.filter((e) => e.on < today || (e.on === today && toMinutes(e.time) + e.duration <= toMinutes(now))).reduce((a, e) => a + e.duration, 0);

  // --- Ich-Zeit -------------------------------------------------------------
  const ich = (who: 'Person A' | 'Person B') =>
    occ.filter((e) => e.category === 'Ich' && (e.owner === who || e.owner === 'Beide')).reduce((a, e) => a + e.duration, 0);
  const ichA = ich('Person A'), ichB = ich('Person B');

  // --- Date Night -----------------------------------------------------------
  const past = occurrences(data.events, addDays(today, -90), today).filter(isDate).filter((e) => e.on < today || toMinutes(e.time) <= toMinutes(now));
  const last = past[past.length - 1];
  const daysSinceDate = last ? daysBetween(last.on, today) : null;
  const nextDate = occurrences(data.events, today, addDays(today, 21)).filter(isDate).find((e) => e.on > today || toMinutes(e.time) > toMinutes(now)) ?? null;

  const checkinPlanned = occ.some(isCheckin);
  const busyDays = days.filter((d) => {
    const l = load(busyOcc, d);
    return l.count >= 4 || l.minutes >= 6 * 60;
  });
  const specialDays = occurrences(data.events, today, addDays(today, 21)).filter((e) => e.repeat === 'yearly' && (e.category === 'Wir' || e.category === 'Familie'));

  const energy = data.checkins[today] || {};
  const lowA = energy.a === 1, lowB = energy.b === 1;

  // --- Vorschläge -----------------------------------------------------------
  const suggestions: Suggestion[] = [];
  const upcoming = days.filter((d) => d >= today);
  const slotsFor = (d: ISODate) => freeSlots(busyOcc, d, freeDay(d) ? s.weekendWindow : s.weekdayWindow, d === today ? now : undefined);
  const taken = new Set<ISODate>();
  const findSlot = (minutes: number, prefer: (d: ISODate) => number, preferredStart?: Time) => {
    const candidates = upcoming
      .filter((d) => !taken.has(d))
      .flatMap((d) => slotsFor(d).filter(([a, b]) => b - a >= minutes).map((slot) => ({ d, slot })))
      .sort((x, y) => prefer(y.d) - prefer(x.d) || x.d.localeCompare(y.d));
    const pick = candidates[0];
    if (!pick) return null;
    let start = pick.slot[0];
    if (preferredStart) {
      const p = toMinutes(preferredStart);
      if (p >= pick.slot[0] && p + minutes <= pick.slot[1]) start = p;
    }
    taken.add(pick.d);
    return { date: pick.d, time: fromMinutes(Math.ceil(start / 15) * 15) };
  };
  const dayScore = (d: ISODate) => -load(busyOcc, d).minutes / 60 - (busyDays.includes(d) ? 5 : 0) + (holidaySet.has(d) ? 3 : 0);
  const id = (k: string) => `${k}-${week}`;
  const notDismissed = (sid: string) => !data.dismissed[sid];

  if (lowA && lowB && notDismissed(id('rest-' + today))) {
    const slot = freeSlots(busyOcc, today, freeDay(today) ? s.weekendWindow : s.weekdayWindow, now)[0];
    if (slot) {
      const quick = pickRecipe(today, (r) => r.minutes <= 30, s.favoriteCuisines);
      suggestions.push({
        id: id('rest-' + today), kind: 'rest', icon: 'armchair', title: 'Ruhiger Abend ohne Programm',
        reason: `Ihr seid beide erschöpft. Heute nichts mehr leisten – ${quick ? `${quick.name} geht in ${quick.minutes} Minuten` : 'etwas Einfaches essen'} und früh ins Bett.`,
        date: today, time: fromMinutes(slot[0]), duration: 60, category: 'Wir', owner: 'Beide', recipe: quick,
      });
    }
  }

  if (!checkinPlanned && notDismissed(id('checkin'))) {
    const slot = findSlot(15, (d) => (weekdayIndex(d) === 6 ? 10 : weekdayIndex(d) === 5 ? 5 : 0), '17:00');
    if (slot)
      suggestions.push({
        id: id('checkin'), kind: 'checkin', icon: 'compass', title: 'WIR-Check-in', duration: 15, category: 'Wir', owner: 'Beide', ...slot,
        reason: '15 Minuten Wochenkompass: Termine, Verantwortung, Erholung – und wer nächste Woche Hilfe braucht.',
      });
  }

  const dateDue = !nextDate && (daysSinceDate === null || daysSinceDate >= s.dateNightEveryDays - 3);
  if (dateDue && notDismissed(id('date'))) {
    const rainy = (d: ISODate) => warned(d) || (wx.get(d) ? !isOutdoorFriendly(wx.get(d)!) : false);
    const slot = findSlot(120, (d) => [4, 5].includes(weekdayIndex(d)) ? 10 + dayScore(d) : dayScore(d), '19:00');
    if (slot) {
      const idea = rainy(slot.date) ? DATE_IDEAS.find((x) => x.id === 'cook')! : DATE_IDEAS.find((x) => x.id === 'restaurant')!;
      const recipe = idea.id === 'cook' ? pickRecipe(slot.date, (r) => r.group === 'Besonders', s.favoriteCuisines) : undefined;
      suggestions.push({
        id: id('date'), kind: 'date', icon: idea.icon, title: idea.id === 'cook' ? `Date Night: ${recipe ? recipe.name : 'Kochabend'}` : 'Date Night',
        reason: (daysSinceDate === null ? 'Ich finde noch keine Date Night im Kalender.' : `Eure letzte Date Night ist ${daysSinceDate} Tage her.`) + ' ' + idea.text,
        duration: 120, category: 'Wir', owner: 'Beide', idea, recipe, ...slot,
      });
    }
  }

  if (wirMinutes < s.wirGoalMinutes && notDismissed(id('wir'))) {
    const missing = s.wirGoalMinutes - wirMinutes;
    const slot = findSlot(45, (d) => dayScore(d) + (niceOutside(d) ? 3 : 0));
    if (slot) {
      const w = wx.get(slot.date);
      const outdoor = niceOutside(slot.date);
      const pool = DATE_IDEAS.filter((x) => x.minutes <= 90 && (outdoor ? x.place !== 'drinnen' : x.place !== 'draußen') && x.energy <= (lowA || lowB ? 1 : 2));
      const idea = pool[hash(slot.date + week) % pool.length] ?? DATE_IDEAS[0];
      suggestions.push({
        id: id('wir'), kind: 'wir', icon: idea.icon, title: idea.title, duration: idea.minutes, category: 'Wir', owner: 'Beide', idea, ...slot,
        reason: `Noch ${fmt.duration(missing)} bis zu eurem Wir-Ziel.${w ? ` ${fmt.weekdayLong(slot.date)}: ${Math.round(w.max)}° – ${outdoor ? 'gut für draußen' : 'eher etwas für drinnen'}.` : ''} ${idea.text}`,
      });
    }
  }

  const ichGap = (mins: number) => mins < s.ichGoalMinutes * Math.min(1, (weekdayIndex(today) + 2) / 7);
  for (const [who, mins, name, kind] of [['Person A', ichA, A, 'ich-a'], ['Person B', ichB, B, 'ich-b']] as const) {
    if (!ichGap(mins) || !notDismissed(id(kind))) continue;
    const slot = findSlot(60, dayScore);
    if (slot)
      suggestions.push({
        id: id(kind), kind, icon: 'leaf', title: `Eigene Zeit für ${name}`, duration: 60, category: 'Ich', owner: who, ...slot,
        reason: `${name} hat diese Woche erst ${fmt.duration(mins)} nur für sich. Erholung ist keine Belohnung, sondern ein Bedürfnis.`,
      });
  }

  for (const d of busyDays.filter((d) => d >= today)) {
    if (data.meals[d]?.Abend || !notDismissed(id('meal-' + d))) continue;
    const r = pickRecipe(d, (x) => x.minutes <= 30 || x.technique === 'Airfryer', s.favoriteCuisines);
    if (r)
      suggestions.push({
        id: id('meal-' + d), kind: 'meal', icon: 'pot', title: `${fmt.weekday(d)}: ${r.name}`, recipe: r,
        reason: `${fmt.weekdayLong(d)} ist voll. Plant schon jetzt etwas Schnelles (${r.minutes} Min.) – ein Gedanke weniger.`,
        date: d, time: '18:30', duration: r.minutes, category: 'Haushalt', owner: 'Beide',
      });
  }

  // --- Stimmung & Botschaft ---------------------------------------------------
  const ratio = wirMinutes / Math.max(1, s.wirGoalMinutes);
  const overdue = daysSinceDate !== null && daysSinceDate > s.dateNightEveryDays && !nextDate;
  const hour = toMinutes(now) / 60;
  let mood: Mood = 'calm';
  if (hour >= 22.5 || hour < 6) mood = 'sleepy';
  else if (lowA && lowB) mood = 'concerned';
  else if (strong.some((a) => ['severe', 'extreme'].includes(a.severity) && warned(today))) mood = 'concerned';
  else if (ratio >= 1) mood = 'celebrate';
  else if (busyDays.filter((d) => d >= today).length >= 3 || overdue) mood = 'concerned';
  else if (ratio >= 0.6) mood = 'happy';

  const messages: Message[] = [];
  const say = (icon: IconName, text: string) => messages.push({ icon, text });
  const warnToday = strong.find(() => warned(today)) ?? strong[0];
  if (warnToday) say('alert', `Wetterwarnung: ${warnToday.event.charAt(0)}${warnToday.event.slice(1).toLowerCase()} – Pläne draußen lieber verschieben, Ideen für drinnen gibt es genug.`);
  if (specialDays[0]) say('star', `${specialDays[0].title} – ${fmt.relative(specialDays[0].on, today)}.`);
  const nextHoliday = holidays.find((h) => h.on >= today && !isWeekend(h.on));
  if (nextHoliday) say('leaf', `${fmt.weekdayLong(nextHoliday.on)} ist ${nextHoliday.title} – ein freier Tag für euch.`);
  if (nextDate) say('wir', `Nächste Date Night: ${fmt.relative(nextDate.on, today)}${nextDate.allDay ? '' : `, ${nextDate.time} Uhr`}.`);
  if (busyDays.length) say('calendar', `Volle Tage: ${busyDays.map(fmt.weekday).join(', ')} – dort lieber nichts zusätzlich einplanen.`);
  if (lowA !== lowB) say('battery-low', `${lowA ? A : B} hat heute wenig Energie. Vielleicht übernimmt ${lowA ? B : A} heute den Abend?`);
  if (Math.abs(ichA - ichB) >= 120) say('users', `Eigene Zeit ist ungleich verteilt (${A}: ${fmt.duration(ichA)}, ${B}: ${fmt.duration(ichB)}).`);

  const headline =
    mood === 'sleepy' ? 'Schlaft gut. Morgen ist auch noch ein Tag.'
    : mood === 'celebrate' ? `Ihr habt euch diese Woche schon ${fmt.duration(wirMinutes)} geschenkt. Schön!`
    : mood === 'concerned' && lowA && lowB ? 'Heute ist ein Tag zum Durchatmen.'
    : mood === 'concerned' ? 'Die Woche ist dicht – ich helfe euch, Inseln zu finden.'
    : mood === 'happy' ? 'Ihr seid auf einem guten Weg.'
    : wirMinutes === 0 ? 'Noch keine gemeinsame Zeit geplant – lasst uns etwas finden.'
    : 'Ich behalte eure gemeinsame Zeit im Blick.';

  return {
    mood, headline, messages, week,
    question: QUESTIONS[hash(today) % QUESTIONS.length],
    wir: { minutes: wirMinutes, goal: s.wirGoalMinutes, planned: wirMinutes - wirDone },
    ich: { a: ichA, b: ichB, goal: s.ichGoalMinutes },
    daysSinceDate, nextDate, checkinPlanned, busyDays, specialDays,
    suggestions: suggestions.slice(0, 5),
  };
}

function pickRecipe(seedDay: ISODate, filter: (r: Recipe) => boolean, favorites: string[]) {
  const pool = RECIPES.filter(filter);
  const fav = pool.filter((r) => favorites.includes(r.cuisine));
  const list = fav.length ? fav : pool;
  return list[hash(seedDay) % list.length];
}

export const energyLabel: Record<Energy, string> = { 1: 'Akku leer', 2: 'Geht so', 3: 'Voller Energie' };
