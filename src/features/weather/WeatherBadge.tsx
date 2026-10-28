import { weatherIcon, weatherLabel } from '../../lib/weather';
import { useDayWeather } from './useWeather';

/** Kleines Wettersymbol mit Höchst-/Tiefstwert für einen Kalendertag. */
export function WeatherBadge({ date, compact }: { date: string; compact?: boolean }) {
  const w = useDayWeather(date);
  if (!w) return null;
  return (
    <span className="wx-badge" title={`${weatherLabel(w.code)} · ${Math.round(w.min)}° bis ${Math.round(w.max)}° · Regen ${w.rain}%`}>
      <span aria-hidden>{weatherIcon(w.code)}</span>
      <b>{Math.round(w.max)}°</b>
      {!compact && <span className="muted">{Math.round(w.min)}°</span>}
    </span>
  );
}
