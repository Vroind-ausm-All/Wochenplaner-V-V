import type { ISODate, Location } from '../store/types';

/** Wetterdaten von Open-Meteo (kostenlos, ohne API-Schlüssel, DSGVO-freundlich). */
export interface DailyWeather {
  date: ISODate;
  code: number;
  max: number;
  min: number;
  rain: number; // Regenwahrscheinlichkeit %
  sunrise: string;
  sunset: string;
}
export interface HourlyWeather {
  time: string; // ISO lokal 'YYYY-MM-DDTHH:00'
  temp: number;
  code: number;
  rain: number;
}
export interface Forecast {
  fetchedAt: number;
  location: Location;
  current: { temp: number; code: number; isDay: boolean; wind: number };
  daily: DailyWeather[];
  hourly: HourlyWeather[];
}

export const DEFAULT_LOCATION: Location = { name: 'Berlin', latitude: 52.52, longitude: 13.405 };

type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
const WMO: Record<number, [string, Kind]> = {
  0: ['Klar', 'clear'], 1: ['Überwiegend klar', 'clear'], 2: ['Teils bewölkt', 'partly'], 3: ['Bedeckt', 'cloudy'],
  45: ['Nebel', 'fog'], 48: ['Reifnebel', 'fog'],
  51: ['Leichter Niesel', 'drizzle'], 53: ['Niesel', 'drizzle'], 55: ['Starker Niesel', 'drizzle'], 56: ['Gefrierender Niesel', 'drizzle'], 57: ['Gefrierender Niesel', 'drizzle'],
  61: ['Leichter Regen', 'rain'], 63: ['Regen', 'rain'], 65: ['Starker Regen', 'rain'], 66: ['Gefrierender Regen', 'rain'], 67: ['Gefrierender Regen', 'rain'],
  71: ['Leichter Schnee', 'snow'], 73: ['Schnee', 'snow'], 75: ['Starker Schnee', 'snow'], 77: ['Schneegriesel', 'snow'],
  80: ['Regenschauer', 'rain'], 81: ['Regenschauer', 'rain'], 82: ['Heftige Schauer', 'rain'], 85: ['Schneeschauer', 'snow'], 86: ['Schneeschauer', 'snow'],
  95: ['Gewitter', 'storm'], 96: ['Gewitter mit Hagel', 'storm'], 99: ['Gewitter mit Hagel', 'storm'],
};
const ICON: Record<Kind, [string, string]> = {
  clear: ['☀️', '🌙'], partly: ['⛅', '☁️'], cloudy: ['☁️', '☁️'], fog: ['🌫️', '🌫️'], drizzle: ['🌦️', '🌧️'], rain: ['🌧️', '🌧️'], snow: ['🌨️', '🌨️'], storm: ['⛈️', '⛈️'],
};

export const weatherKind = (code: number): Kind => WMO[code]?.[1] ?? 'cloudy';
export const weatherLabel = (code: number) => WMO[code]?.[0] ?? 'Wetter';
export const weatherIcon = (code: number, isDay = true) => ICON[weatherKind(code)][isDay ? 0 : 1];

/** Eignet sich der Tag für Unternehmungen draußen? */
export function isOutdoorFriendly(d: DailyWeather) {
  const k = weatherKind(d.code);
  return (k === 'clear' || k === 'partly' || k === 'cloudy') && d.rain < 40 && d.max >= 8;
}

const CACHE_KEY = 'wir-weather-cache';
const MAX_AGE = 30 * 60 * 1000;

export function cachedForecast(loc: Location): Forecast | null {
  try {
    const f = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as Forecast | null;
    if (f && f.location.latitude === loc.latitude && f.location.longitude === loc.longitude) return f;
  } catch {
    /* ignorieren */
  }
  return null;
}

export const isStale = (f: Forecast | null) => !f || Date.now() - f.fetchedAt > MAX_AGE;

export async function fetchForecast(loc: Location, signal?: AbortSignal): Promise<Forecast> {
  const p = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: 'temperature_2m,weather_code,is_day,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '14',
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`, { signal });
  if (!r.ok) throw new Error(`Wetterdienst antwortet nicht (${r.status})`);
  const j = await r.json();
  const f: Forecast = {
    fetchedAt: Date.now(),
    location: loc,
    current: { temp: j.current.temperature_2m, code: j.current.weather_code, isDay: !!j.current.is_day, wind: j.current.wind_speed_10m },
    daily: j.daily.time.map((date: string, i: number) => ({
      date,
      code: j.daily.weather_code[i],
      max: j.daily.temperature_2m_max[i],
      min: j.daily.temperature_2m_min[i],
      rain: j.daily.precipitation_probability_max[i] ?? 0,
      sunrise: j.daily.sunrise[i]?.slice(11, 16) ?? '',
      sunset: j.daily.sunset[i]?.slice(11, 16) ?? '',
    })),
    hourly: j.hourly.time.map((time: string, i: number) => ({
      time,
      temp: j.hourly.temperature_2m[i],
      code: j.hourly.weather_code[i],
      rain: j.hourly.precipitation_probability[i] ?? 0,
    })),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(f));
  } catch {
    /* ignorieren */
  }
  return f;
}

export async function searchPlace(q: string): Promise<Location[]> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: q, count: '6', language: 'de' })}`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results || []).map((x: { name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }) => ({
    name: [x.name, x.admin1, x.country_code].filter(Boolean).join(', '),
    latitude: x.latitude,
    longitude: x.longitude,
  }));
}
