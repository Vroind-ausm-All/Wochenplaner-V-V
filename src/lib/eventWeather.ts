import type { CalendarEvent, ISODate, Time } from '../store/types';
import { addDays, fromMinutes, toMinutes } from './date';
import { alertCovers, type WeatherAlert } from './alerts';
import { occurrences, type Occurrence } from './recurrence';
import { weatherKind, type Forecast } from './weather';

/** Woran man Unternehmungen draußen erkennt (Titel oder Notiz). */
const OUTDOOR =
  /spazier|picknick|radtour|fahrrad|grill|wochenmarkt|flohmarkt|ausflug|park\b|spielplatz|wander|jogg|laufen|lauftreff|zoo|tierpark|freibad|baden|badesee|\bsee\b|garten|draußen|sonnenuntergang|camping|fußball|tennis|reiten|kanu|minigolf|biergarten|stadtfest|weihnachtsmarkt|abendspaziergang/i;

export const isOutdoor = (e: Pick<CalendarEvent, 'title' | 'notes' | 'allDay'>) => !e.allDay && (OUTDOOR.test(e.title) || OUTDOOR.test(e.notes ?? ''));

export interface SlotWeather {
  rain: number; // höchste Regenwahrscheinlichkeit im Zeitraum (%)
  wet: boolean; // Niederschlag, Gewitter oder Schnee erwartet
  temp: number | null;
  code: number | null;
}

const at = (date: ISODate, time: Time) => new Date(`${date}T${time}:00`).getTime();

/** Wetter für einen Zeitraum aus der Stundenvorhersage, sonst aus der Tagesvorhersage. */
export function weatherFor(f: Forecast | null, date: ISODate, time: Time, minutes: number): SlotWeather | null {
  if (!f) return null;
  const start = toMinutes(time), end = start + Math.max(60, minutes);
  const hours = f.hourly.filter((h) => {
    if (!h.time.startsWith(date)) return false;
    const m = Number(h.time.slice(11, 13)) * 60;
    return m >= Math.floor(start / 60) * 60 && m < end;
  });
  if (hours.length) {
    const worst = hours.reduce((a, b) => (b.rain > a.rain ? b : a));
    return {
      rain: Math.max(...hours.map((h) => h.rain)),
      wet: hours.some((h) => ['rain', 'drizzle', 'storm', 'snow'].includes(weatherKind(h.code)) && h.rain >= 40),
      temp: Math.round(hours.reduce((a, h) => a + h.temp, 0) / hours.length),
      code: worst.code,
    };
  }
  const d = f.daily.find((x) => x.date === date);
  if (!d) return null;
  return { rain: d.rain, wet: ['rain', 'storm', 'snow'].includes(weatherKind(d.code)) && d.rain >= 50, temp: Math.round(d.max), code: d.code };
}

export type RiskLevel = 'ok' | 'watch' | 'bad';
export interface EventRisk {
  level: RiskLevel;
  reason: string;
  icon: string;
  weather: SlotWeather | null;
  alert?: WeatherAlert;
}

export function eventRisk(e: { on: ISODate; time: Time; duration: number }, f: Forecast | null, alerts: WeatherAlert[] = []): EventRisk {
  const start = at(e.on, e.time), end = start + Math.max(60, e.duration) * 60000;
  const alert = alerts.find((a) => a.severity !== 'minor' && alertCovers(a, start, end));
  const w = weatherFor(f, e.on, e.time, e.duration);
  if (alert) return { level: 'bad', reason: `Wetterwarnung: ${alert.event.charAt(0)}${alert.event.slice(1).toLowerCase()}`, icon: '⚠️', weather: w, alert };
  if (!w) return { level: 'ok', reason: '', icon: '', weather: null };
  const kind = w.code != null ? weatherKind(w.code) : 'cloudy';
  if (w.rain >= 60 || (w.wet && w.rain >= 45)) return { level: 'bad', reason: kind === 'storm' ? `Gewitter möglich (${w.rain} %)` : kind === 'snow' ? `Schnee (${w.rain} %)` : `${w.rain} % Regen`, icon: kind === 'storm' ? '⛈️' : kind === 'snow' ? '🌨️' : '☔', weather: w };
  if (w.rain >= 35) return { level: 'watch', reason: `${w.rain} % Regen – Schirm mitnehmen`, icon: '🌂', weather: w };
  if (w.temp != null && w.temp <= 2) return { level: 'watch', reason: `nur ${w.temp}° – warm anziehen`, icon: '🧣', weather: w };
  return { level: 'ok', reason: '', icon: '', weather: w };
}

export interface Alternative {
  date: ISODate;
  time: Time;
  rain: number;
}

/**
 * Trockenerer Zeitpunkt in den nächsten Tagen: gleiche Uhrzeit an Folgetagen oder ±1–3 Std. am selben Tag,
 * ohne Überschneidung mit anderen Terminen, ohne Warnung, zwischen 7 und 21 Uhr.
 */
export function findDrierSlot(e: Occurrence, f: Forecast | null, events: CalendarEvent[], alerts: WeatherAlert[] = [], today?: ISODate, now = Date.now()): Alternative | null {
  if (!f) return null;
  const base = toMinutes(e.time);
  const candidates: { date: ISODate; time: Time; dist: number }[] = [];
  for (const shift of [-60, 60, -120, 120, -180, 180]) candidates.push({ date: e.on, time: fromMinutes(base + shift), dist: Math.abs(shift) / 60 });
  for (let d = 1; d <= 3; d++) {
    candidates.push({ date: addDays(e.on, d), time: e.time, dist: d * 2 });
    candidates.push({ date: addDays(e.on, -d), time: e.time, dist: d * 2 + 1 });
  }
  const busy = occurrences(events.filter((x) => x.id !== e.id), addDays(e.on, -3), addDays(e.on, 3)).filter((x) => !x.allDay);
  const free = (date: ISODate, time: Time) =>
    !busy.some((x) => x.on === date && toMinutes(x.time) < toMinutes(time) + e.duration && toMinutes(time) < toMinutes(x.time) + x.duration);
  const options = candidates
    .filter((c) => (!today || c.date >= today) && at(c.date, c.time) > now)
    .filter((c) => toMinutes(c.time) >= 7 * 60 && toMinutes(c.time) + e.duration <= 21 * 60)
    .filter((c) => free(c.date, c.time))
    .map((c) => ({ ...c, risk: eventRisk({ on: c.date, time: c.time, duration: e.duration }, f, alerts) }))
    .filter((c) => c.risk.level === 'ok' && c.risk.weather && c.risk.weather.rain < 30)
    .sort((a, b) => a.risk.weather!.rain - b.risk.weather!.rain + (a.dist - b.dist) * 4);
  const best = options[0];
  return best ? { date: best.date, time: best.time, rain: best.risk.weather!.rain } : null;
}

/** Riskante Draußen-Termine der nächsten Tage. */
export function weatherConcerns(events: CalendarEvent[], f: Forecast | null, alerts: WeatherAlert[], today: ISODate, now = Date.now(), days = 7) {
  if (!f) return [];
  return occurrences(events, today, addDays(today, days - 1))
    .filter((e) => isOutdoor(e) && at(e.on, e.time) + e.duration * 60000 > now)
    .map((e) => ({ event: e, risk: eventRisk(e, f, alerts) }))
    .filter((x) => x.risk.level !== 'ok');
}

/** Wann es in den nächsten Stunden wahrscheinlich regnet (für den Hinweis im Wetterkasten). */
export function rainSoon(f: Forecast | null, now = new Date(), hours = 6): { hour: string; rain: number } | null {
  if (!f) return null;
  const from = now.getTime() - 3600_000;
  const next = f.hourly.filter((h) => {
    const t = new Date(`${h.time}:00`).getTime();
    return t >= from && t <= now.getTime() + hours * 3600_000;
  });
  const hit = next.find((h) => h.rain >= 50 && ['rain', 'drizzle', 'storm', 'snow'].includes(weatherKind(h.code)));
  return hit ? { hour: hit.time.slice(11, 16), rain: hit.rain } : null;
}
