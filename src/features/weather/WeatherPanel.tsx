import { motion } from 'motion/react';
import { fmt } from '../../lib/date';
import { useToday } from '../../lib/useClock';
import { isOutdoorFriendly, weatherIcon, weatherKind, weatherLabel } from '../../lib/weather';
import { useStore } from '../../store/store';
import { useWeatherStore } from './useWeather';
import './weather.css';

/** Wetterausblick: aktuelle Lage + 7 Tage. Tippen auf einen Tag öffnet die Tagesansicht. */
export function WeatherPanel({ days = 7 }: { days?: number }) {
  const { forecast, loading, error } = useWeatherStore();
  const setUi = useStore((s) => s.setUi);
  const today = useToday();

  if (!forecast)
    return (
      <section className="card wx">
        <div className="eyebrow">Wetter</div>
        <p className="muted">{loading ? 'Wetter wird geladen …' : error ?? 'Ort in den Einstellungen wählen.'}</p>
      </section>
    );

  const c = forecast.current;
  const list = forecast.daily.filter((d) => d.date >= today).slice(0, days);
  const kind = weatherKind(c.code);
  return (
    <section className={`card wx wx--${kind} ${c.isDay ? '' : 'wx--night'}`} aria-label="Wetterausblick">
      <div className="wx__now">
        <motion.span className="wx__big" animate={kind === 'clear' ? { rotate: [0, 8, 0] } : { y: [0, -3, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          {weatherIcon(c.code, c.isDay)}
        </motion.span>
        <div>
          <div className="wx__temp">{Math.round(c.temp)}°</div>
          <div className="small">
            {weatherLabel(c.code)} · Wind {Math.round(c.wind)} km/h
          </div>
          <div className="small muted">{forecast.location.name}</div>
        </div>
      </div>
      <div className="wx__days">
        {list.map((d, i) => (
          <motion.button
            key={d.date}
            className={`wx__day ${isOutdoorFriendly(d) ? 'is-nice' : ''}`}
            onClick={() => setUi({ view: 'calendar', calendarMode: 'day', cursor: d.date })}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            title={`${weatherLabel(d.code)} · Regen ${d.rain} %`}
          >
            <span className="small">{i === 0 ? 'Heute' : fmt.weekday(d.date)}</span>
            <span className="wx__icon">{weatherIcon(d.code)}</span>
            <b>{Math.round(d.max)}°</b>
            <span className="small muted">{Math.round(d.min)}°</span>
            <span className="wx__rain" style={{ opacity: d.rain > 20 ? 1 : 0.35 }}>
              💧{d.rain}%
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

/** Stündlicher Verlauf für die Tagesansicht. */
export function HourlyStrip({ date }: { date: string }) {
  const f = useWeatherStore((s) => s.forecast);
  const day = f?.daily.find((d) => d.date === date);
  const hours = f?.hourly.filter((h) => h.time.startsWith(date) && Number(h.time.slice(11, 13)) >= 6 && Number(h.time.slice(11, 13)) % 2 === 0) ?? [];
  if (!day) return null;
  return (
    <section className="card wx wx--strip">
      <div className="row">
        <span className="wx__icon">{weatherIcon(day.code)}</span>
        <div className="grow">
          <b>{weatherLabel(day.code)}</b>
          <div className="small muted">
            {Math.round(day.min)}° bis {Math.round(day.max)}° · ☀ {day.sunrise}–{day.sunset}
          </div>
        </div>
        {isOutdoorFriendly(day) && <span className="badge">gut für draußen</span>}
      </div>
      {hours.length > 0 && (
        <div className="wx__hours">
          {hours.map((h) => (
            <div key={h.time} className="wx__hour">
              <span className="small muted">{h.time.slice(11, 13)}</span>
              <span>{weatherIcon(h.code, Number(h.time.slice(11, 13)) > 6 && Number(h.time.slice(11, 13)) < 20)}</span>
              <b className="small">{Math.round(h.temp)}°</b>
              {h.rain >= 30 && <span className="small">💧</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Kompakte Anzeige für die Kopfzeile. */
export function WeatherNow() {
  const f = useWeatherStore((s) => s.forecast);
  if (!f) return null;
  return (
    <span className="wx-now" title={`${weatherLabel(f.current.code)} in ${f.location.name}`}>
      {weatherIcon(f.current.code, f.current.isDay)} <b>{Math.round(f.current.temp)}°</b>
    </span>
  );
}
