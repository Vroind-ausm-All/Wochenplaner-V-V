import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { fmt } from '../../lib/date';
import { eventRisk, findDrierSlot, isOutdoor, weatherConcerns } from '../../lib/eventWeather';
import type { Occurrence } from '../../lib/recurrence';
import { useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { useActiveAlerts } from './useAlerts';
import { useWeatherStore } from './useWeather';

/** Prüft Unternehmungen draußen gegen Vorhersage und Warnungen und bietet einen trockeneren Zeitpunkt an. */
export function WeatherCheck() {
  const forecast = useWeatherStore((s) => s.forecast);
  const alerts = useActiveAlerts(7 * 24);
  const events = useStore((s) => s.data.events);
  const dismissed = useStore((s) => s.data.dismissed);
  const { moveEvent, mutate } = useStore.getState();
  const today = useToday();

  const items = useMemo(
    () =>
      weatherConcerns(events, forecast, alerts, today)
        .filter((x) => !dismissed[`wx-${x.event.id}-${x.event.on}`])
        .map((x) => ({ ...x, alt: x.risk.level === 'bad' ? findDrierSlot(x.event, forecast, events, alerts, today) : null })),
    [events, forecast, alerts, today, dismissed],
  );
  if (!items.length) return null;

  return (
    <section className="card stack wx-check" aria-label="Wetter-Check für Termine draußen">
      <div className="eyebrow">Wetter-Check für eure Pläne draußen</div>
      <AnimatePresence initial={false}>
        {items.map(({ event: e, risk, alt }) => (
          <motion.div key={e.id + e.on} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={`wx-check__item is-${risk.level}`}>
            <span className="wx-check__icon">{risk.icon}</span>
            <div className="grow">
              <b>
                {fmt.relative(e.on, today)} {e.time} · {e.title}
              </b>
              <div className="small">{risk.reason}</div>
              <div className="row wrap" style={{ marginTop: 6 }}>
                {alt && (
                  <button
                    className="btn sm primary"
                    onClick={() => moveEvent(e.id, e.on, alt.date, alt.time, e.repeat === 'none' ? 'all' : 'one')}
                  >
                    Auf {fmt.relative(alt.date, today)} {alt.time} verschieben ({alt.rain} % Regen)
                  </button>
                )}
                {risk.level === 'bad' && !alt && <span className="small muted">Kein trockenerer Zeitpunkt in Sicht – vielleicht eine Idee für drinnen?</span>}
                <button className="btn sm ghost" onClick={() => mutate((d) => void (d.dismissed[`wx-${e.id}-${e.on}`] = today))}>
                  Passt so
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  );
}

/** Kleines Wettersymbol an Terminen draußen, wenn es kritisch wird. */
export function EventWeatherBadge({ e }: { e: Occurrence }) {
  const forecast = useWeatherStore((s) => s.forecast);
  const alerts = useActiveAlerts(7 * 24);
  if (e.external || !isOutdoor(e)) return null;
  const r = eventRisk(e, forecast, alerts);
  if (r.level === 'ok') return null;
  return (
    <span className={`wx-pin is-${r.level}`} title={r.reason} aria-label={r.reason}>
      {r.icon}
    </span>
  );
}
