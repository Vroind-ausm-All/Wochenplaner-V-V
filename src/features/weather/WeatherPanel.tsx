import { motion } from 'motion/react';
import { fmt } from '../../lib/date';
import { rainSoon } from '../../lib/eventWeather';
import { useNow, useToday } from '../../lib/useClock';
import { isOutdoorFriendly, weatherIcon, weatherLabel } from '../../lib/weather';
import { useStore } from '../../store/store';
import { useWeatherStore } from './useWeather';
import './weather.css';
import { Icon } from '../../ui/Icon';

/** Wetterausblick: aktuelle Lage + 7 Tage. Tippen auf einen Tag öffnet die Tagesansicht. */
export function WeatherPanel({ days = 7 }: { days?: number }) {
  const { forecast, loading, error } = useWeatherStore();
  const setUi = useStore((s) => s.setUi);
  const today = useToday();
  useNow(); // minütlich neu bewerten

  if (!forecast)
    return (
      <section className="card wx">
        <span className="eyebrow">Wetter</span>
        <p className="muted">{loading ? 'Wetter wird geladen …' : error ?? 'Ort in den Einstellungen wählen.'}</p>
      </section>
    );

  const c = forecast.current;
  const list = forecast.daily.filter((d) => d.date >= today).slice(0, days);
    return (
    <section className="card wx" aria-label="Wetterausblick">
      <div className="wx__now">
        <Icon name={weatherIcon(c.code, c.isDay)} size={56} strokeWidth={1.25} className="wx__big" />
        <div>
          <div className="wx__temp">{Math.round(c.temp)}°</div>
          <div className="small">
            {weatherLabel(c.code)} · Wind {Math.round(c.wind)} km/h
          </div>
          <div className="small muted">{forecast.location.name}</div>
        </div>
      </div>
      {(() => {
        const soon = rainSoon(forecast);
        return soon ? (
          <div className="wx__soon">
            <Icon name="umbrella" size={18} /> <span>Regen ab {soon.hour} Uhr wahrscheinlich ({soon.rain} %) – Schirm einpacken.</span>
          </div>
        ) : null;
      })()}
      <div className="wx__days">
        {list.map((d, i) => (
          <motion.button
            key={d.date}
            className={`wx__day ${isOutdoorFriendly(d) ? 'is-nice' : ''}`}
            onClick={() => setUi({ view: 'calendar', calendarMode: 'day', cursor: d.date })}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: i * 0.02 }}
            title={`${weatherLabel(d.code)} · Regen ${d.rain} %`}
          >
            <span className="small">{i === 0 ? 'Heute' : fmt.weekday(d.date)}</span>
            <Icon name={weatherIcon(d.code)} size={24} className="wx__icon" />
            <b>{Math.round(d.max)}°</b>
            <span className="small muted">{Math.round(d.min)}°</span>
            <span className="wx__rain" style={{ opacity: d.rain > 20 ? 1 : 0.35 }}>
              {d.rain} %
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
        <Icon name={weatherIcon(day.code)} size={32} className="wx__icon" />
        <div className="grow">
          <b>{weatherLabel(day.code)}</b>
          <div className="small muted">
            {Math.round(day.min)}° bis {Math.round(day.max)}° · Sonne {day.sunrise}–{day.sunset}
          </div>
        </div>
        {isOutdoorFriendly(day) && <span className="badge">gut für draußen</span>}
      </div>
      {hours.length > 0 && (
        <div className="wx__hours">
          {hours.map((h) => (
            <div key={h.time} className="wx__hour">
              <span className="small muted">{h.time.slice(11, 13)}</span>
              <Icon name={weatherIcon(h.code, Number(h.time.slice(11, 13)) > 6 && Number(h.time.slice(11, 13)) < 20)} size={20} />
              <b className="small">{Math.round(h.temp)}°</b>
              {h.rain >= 30 && <Icon name="drop" size={12} label={`Regen ${h.rain} %`} />}
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
      <Icon name={weatherIcon(f.current.code, f.current.isDay)} size={22} /> <b>{Math.round(f.current.temp)}°</b>
    </span>
  );
}
