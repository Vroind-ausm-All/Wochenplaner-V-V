import { DropZone, Pickable } from '../../dnd/Dnd';
import { addDays, fmt, range } from '../../lib/date';
import { useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { WeatherBadge } from '../weather/WeatherBadge';
import { ExternalAgendaItem } from '../external/ExternalUi';
import { EventWeatherBadge } from '../weather/WeatherCheck';
import { CategoryIcon, hueStyle, OwnerDot, timeRange } from './EventChip';
import { useOccurrences } from './hooks';

/** Terminansicht: die nächsten 30 Tage als Liste – ideal für den schnellen Überblick. */
export function AgendaView() {
  const cursor = useStore((s) => s.cursor);
  const setUi = useStore((s) => s.setUi);
  const today = useToday();
  const days = range(cursor, 30);
  const occ = useOccurrences(cursor, addDays(cursor, 29));
  const visible = days.filter((d) => d === today || occ.some((e) => e.on === d));

  return (
    <div className="agenda">
      {visible.map((d) => (
        <section key={d} className="agenda__day">
          <DropZone target={{ type: 'day', date: d }} className={`agenda__head ${d === today ? 'is-today' : ''}`} onEmptyClick={() => setUi({ cursor: d, calendarMode: 'day' })}>
            <div>
              <div className="agenda__rel">{fmt.relative(d, today)}</div>
              <div className="small muted">{fmt.long(d)}</div>
            </div>
            <span className="grow" />
            <WeatherBadge date={d} />
          </DropZone>
          <div className="stack">
            {occ.filter((e) => e.on === d).map((e) => e.external ? <ExternalAgendaItem key={e.id} e={e} /> : (
              <Pickable key={e.id + e.on} payload={{ type: 'event', id: e.id, on: e.on, label: e.title }} className="agenda__item" style={hueStyle(e.category)}>
                <span className="agenda__time">{timeRange(e)}</span>
                <CategoryIcon category={e.category} className="agenda__icon" />
                <span className="grow">
                  <b>{e.title}</b>
                  <span className="small muted">
                    {' '}
                    · {e.category}
                    {e.repeat !== 'none' ? ' · Serie' : ''}
                  </span>
                  {e.notes && <div className="small muted ellipsis">{e.notes}</div>}
                </span>
                <EventWeatherBadge e={e} />
                <OwnerDot owner={e.owner} />
              </Pickable>
            ))}
            {!occ.some((e) => e.on === d) && <div className="empty small">Heute ist noch alles frei.</div>}
          </div>
        </section>
      ))}
    </div>
  );
}
