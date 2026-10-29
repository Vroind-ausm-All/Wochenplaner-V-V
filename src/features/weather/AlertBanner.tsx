import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { SEVERITY, type WeatherAlert } from '../../lib/alerts';
import { Sheet } from '../../ui/Sheet';
import { useActiveAlerts } from './useAlerts';

const span = (a: WeatherAlert) => {
  const f = (t: number) => {
    const d = new Date(t);
    const today = new Date();
    const day = d.toDateString() === today.toDateString() ? 'heute' : d.toDateString() === new Date(today.getTime() + 864e5).toDateString() ? 'morgen' : d.toLocaleDateString('de-DE', { weekday: 'short' });
    return `${day} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  };
  return a.expires ? `${f(a.onset)} – ${f(a.expires)}` : `ab ${f(a.onset)}`;
};

const icon = (event: string) =>
  /gewitter/i.test(event) ? '⛈️' : /sturm|orkan|wind|böen/i.test(event) ? '🌬️' : /schnee|glätte|glatteis|frost/i.test(event) ? '🧊' : /regen|tauwetter|hochwasser/i.test(event) ? '🌧️' : /hitze|uv/i.test(event) ? '🌡️' : /nebel/i.test(event) ? '🌫️' : '⚠️';

/** Amtliche Warnungen des DWD – farbig nach Stufe, antippen zeigt Details und Verhaltenshinweise. */
export function AlertBanner({ compact }: { compact?: boolean }) {
  const alerts = useActiveAlerts();
  const [open, setOpen] = useState<WeatherAlert | null>(null);
  return (
    <>
      <AnimatePresence initial={false}>
        {alerts.map((a) => (
          <motion.button
            key={a.id}
            type="button"
            className={`alert-banner ${compact ? 'is-compact' : ''}`}
            style={{ '--sev': SEVERITY[a.severity].color } as React.CSSProperties}
            onClick={() => setOpen(a)}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="alert-banner__icon">{icon(a.event)}</span>
            <span className="grow">
              <span className="alert-banner__level">{SEVERITY[a.severity].label}</span>
              <b>{a.event ? a.event.charAt(0) + a.event.slice(1).toLowerCase() : a.headline}</b>
              <span className="small"> · {span(a)}</span>
            </span>
            {!compact && <span className="small">Details ›</span>}
          </motion.button>
        ))}
      </AnimatePresence>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.headline || 'Wetterwarnung'}>
        {open && (
          <div className="stack">
            <p>
              <span className="badge" style={{ background: SEVERITY[open.severity].color, color: '#fff' }}>
                {SEVERITY[open.severity].label}
              </span>{' '}
              {span(open)}
              {open.region ? ` · ${open.region}` : ''}
            </p>
            {open.description && <p>{open.description}</p>}
            {open.instruction && (
              <div className="safe">
                <b>Was tun?</b>
                <p>{open.instruction}</p>
              </div>
            )}
            <p className="small muted">Quelle: Deutscher Wetterdienst (über Bright Sky). Maßgeblich sind die amtlichen Warnungen auf dwd.de bzw. in der WarnWetter-App.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}

export { icon as alertIcon, span as alertSpan };
