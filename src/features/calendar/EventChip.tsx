import { CATEGORY_STYLE } from '../../data/templates';
import { Pickable } from '../../dnd/Dnd';
import { fromMinutes, toMinutes } from '../../lib/date';
import type { Occurrence } from '../../lib/recurrence';
import { ExternalChip } from '../external/ExternalUi';
import { EventWeatherBadge } from '../weather/WeatherCheck';
import { Icon, OwnerMark } from '../../ui/Icon';
import { useOwnerName } from './hooks';

/** Gemeinsame Zeit („Wir“) trägt die Signalfarbe, alles andere bleibt schwarz-weiß. */
export const hueStyle = (category: Occurrence['category']) =>
  (category === 'Wir' ? { '--edge': 'var(--accent)', '--bg': 'var(--wir-fill)', '--fg': 'var(--ink)' } : { '--edge': 'var(--ink)', '--bg': 'var(--card)', '--fg': 'var(--ink)' }) as React.CSSProperties;

/** Personen-Marke mit Namen als Tooltip: ● Person A, ○ Person B, beide Kreise = gemeinsam. */
export function OwnerDot({ owner, withName = false }: { owner: Occurrence['owner']; withName?: boolean }) {
  const name = useOwnerName();
  return (
    <span className={`owner-dot ${owner === 'Beide' ? 'both' : ''}`} title={name(owner)}>
      <OwnerMark owner={owner} size={12} />
      {withName ? <span>{name(owner)}</span> : <span className="sr-only">{name(owner)}</span>}
    </span>
  );
}

/** Piktogramm der Kategorie. */
export function CategoryIcon({ category, size = 16, className = '' }: { category: Occurrence['category']; size?: number; className?: string }) {
  return <Icon name={CATEGORY_STYLE[category]?.icon ?? 'pin'} size={size} className={className} />;
}

/** Kompakte Darstellung (Monat, Kopfzeilen, Listen). */
export function EventChip({ e, showTime = true }: { e: Occurrence; showTime?: boolean }) {
  if (e.external) return <ExternalChip e={e} showTime={showTime} />;
  return (
    <Pickable payload={{ type: 'event', id: e.id, on: e.on, label: e.title }} className="ev-chip" style={hueStyle(e.category)} title={e.title}>
      <CategoryIcon category={e.category} className="ev-chip__icon" size={14} />
      {showTime && !e.allDay && <span className="ev-chip__time">{e.time}</span>}
      <span className="ellipsis">{e.title}</span>
      {e.repeat !== 'none' && <Icon name="repeat" size={12} label="Serie" />}
      <EventWeatherBadge e={e} />
    </Pickable>
  );
}

export const timeRange = (e: Occurrence) => (e.allDay ? 'ganztags' : `${e.time}–${fromMinutes(toMinutes(e.time) + e.duration)}`);
