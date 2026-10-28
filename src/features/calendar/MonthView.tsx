import { findRecipe } from '../../data/recipes';
import { DropZone } from '../../dnd/Dnd';
import { addDays, fmt, monthGrid, WEEKDAYS } from '../../lib/date';
import { useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { WeatherBadge } from '../weather/WeatherBadge';
import { EventChip } from './EventChip';
import { useOccurrences } from './hooks';

export function MonthView() {
  const cursor = useStore((s) => s.cursor);
  const setUi = useStore((s) => s.setUi);
  const meals = useStore((s) => s.data.meals);
  const today = useToday();
  const grid = monthGrid(cursor);
  const occ = useOccurrences(grid[0], addDays(grid[0], 41));
  const month = cursor.slice(0, 7);

  return (
    <div className="month">
      {WEEKDAYS.map((d) => (
        <div key={d} className="month__head">
          {d}
        </div>
      ))}
      {grid.map((d) => {
        const es = occ.filter((e) => e.on === d);
        const dinner = meals[d]?.Abend;
        const r = dinner && findRecipe(dinner);
        return (
          <DropZone
            key={d}
            target={{ type: 'day', date: d }}
            className={`month__cell ${d.slice(0, 7) !== month ? 'is-other' : ''} ${d === today ? 'is-today' : ''} ${d === cursor ? 'is-cursor' : ''}`}
            onEmptyClick={() => setUi({ cursor: d, calendarMode: 'day' })}
            label={`${fmt.long(d)}: ${es.length} Termine`}
          >
            <div className="row month__top">
              <span className="month__num">{Number(d.slice(8))}</span>
              <span className="grow" />
              {r && <span title={r.name}>{r.symbol}</span>}
              <WeatherBadge date={d} compact />
            </div>
            <div className="month__events">
              {es.slice(0, 3).map((e) => (
                <EventChip key={e.id + e.on} e={e} />
              ))}
              {es.length > 3 && <span className="small muted">+{es.length - 3} weitere</span>}
            </div>
          </DropZone>
        );
      })}
    </div>
  );
}
