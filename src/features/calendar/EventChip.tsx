import { CATEGORY_STYLE } from '../../data/templates';
import { Pickable } from '../../dnd/Dnd';
import { fromMinutes, toMinutes } from '../../lib/date';
import type { Occurrence } from '../../lib/recurrence';
import { ExternalChip } from '../external/ExternalUi';
import { EventWeatherBadge } from '../weather/WeatherCheck';
import { initials, useOwnerName } from './hooks';

export const hueStyle = (category: Occurrence['category']) => ({ '--h': CATEGORY_STYLE[category]?.hue ?? 150 }) as React.CSSProperties;

export function OwnerDot({ owner }: { owner: Occurrence['owner'] }) {
  const name = useOwnerName();
  if (owner === 'Beide') return <span className="owner-dot both" title="Beide">♡</span>;
  return (
    <span className={`owner-dot ${owner === 'Person A' ? 'a' : 'b'}`} title={name(owner)}>
      {initials(name(owner))}
    </span>
  );
}

/** Kompakte Darstellung (Monat, Kopfzeilen, Listen). */
export function EventChip({ e, showTime = true }: { e: Occurrence; showTime?: boolean }) {
  if (e.external) return <ExternalChip e={e} showTime={showTime} />;
  return (
    <Pickable payload={{ type: 'event', id: e.id, on: e.on, label: e.title }} className="ev-chip" style={hueStyle(e.category)} title={e.title}>
      <span className="ev-chip__emoji">{CATEGORY_STYLE[e.category]?.emoji}</span>
      {showTime && !e.allDay && <span className="ev-chip__time">{e.time}</span>}
      <span className="ellipsis">{e.title}</span>
      {e.repeat !== 'none' && <span aria-label="Serie">↻</span>}
      <EventWeatherBadge e={e} />
    </Pickable>
  );
}

export const timeRange = (e: Occurrence) => (e.allDay ? 'ganztags' : `${e.time}–${fromMinutes(toMinutes(e.time) + e.duration)}`);
