import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { findRecipe } from '../../data/recipes';
import { CATEGORY_STYLE } from '../../data/templates';
import { DropZone, Pickable } from '../../dnd/Dnd';
import { fmt, fromMinutes, toMinutes } from '../../lib/date';
import { layoutLanes, type Occurrence } from '../../lib/recurrence';
import { useNow, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import type { ISODate } from '../../store/types';
import { WeatherBadge } from '../weather/WeatherBadge';
import { ExternalBlock } from '../external/ExternalUi';
import { EventWeatherBadge } from '../weather/WeatherCheck';
import { EventChip, hueStyle, OwnerDot, timeRange } from './EventChip';
import { useOccurrences } from './hooks';

const START = 6;
const END = 23;
const slots = Array.from({ length: (END - START) * 2 }, (_, i) => fromMinutes(START * 60 + i * 30));
/** Höhe je 30 Minuten: füllt hohe Hochkant-Displays, scrollt auf kleinen. */
const fitSlot = (h: number) => Math.max(30, Math.min(56, Math.floor(h / slots.length)));
const topFor = (t: string, slotH: number) => ((toMinutes(t) - START * 60) / 30) * slotH;

/** Zeitraster für Wochen- (7 Spalten) und Tagesansicht (1 Spalte). */
export function TimeGrid({ days }: { days: ISODate[] }) {
  const occ = useOccurrences(days[0], days[days.length - 1]);
  const scroller = useRef<HTMLDivElement>(null);
  const today = useToday();
  const now = useNow();
  const setUi = useStore((s) => s.setUi);
  const meals = useStore((s) => s.data.meals);
  const [slotH, setSlotH] = useState(32);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSlotH(fitSlot(el.clientHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Beim Öffnen auf „jetzt“ (oder 7 Uhr) scrollen.
    const t = days.includes(today) ? Math.max(toMinutes(now) - 90, 7 * 60) : 7 * 60;
    scroller.current?.scrollTo({ top: ((t - START * 60) / 30) * slotH });
  }, [days[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const newAt = (date: ISODate, time: string) => setUi({ editing: { kind: 'event', draft: { date, time } } });

  return (
    <div className={`tg ${days.length === 1 ? 'tg--day' : ''}`} style={{ '--cols': days.length, '--slot-h': `${slotH}px` } as React.CSSProperties}>
      <div className="tg-head">
        <div className="tg-corner">KW {fmt.kw(days[0])}</div>
        {days.map((d) => {
          const allDay = occ.filter((e) => e.on === d && e.allDay);
          const dinner = meals[d]?.Abend;
          const r = dinner && findRecipe(dinner);
          return (
            <DropZone key={d} target={{ type: 'day', date: d }} className={`tg-dayhead ${d === today ? 'is-today' : ''}`} onEmptyClick={() => setUi({ cursor: d, calendarMode: 'day' })} label={fmt.long(d)}>
              <div className="row tg-dayhead__top">
                <span className="tg-dayname">{fmt.weekday(d)}</span>
                <span className="tg-daynum">{d.slice(8).replace(/^0/, '')}</span>
                <span className="grow" />
                <WeatherBadge date={d} compact />
              </div>
              {r && (
                <div className="tg-dinner ellipsis" title={`Abendessen: ${r.name}`}>
                  {r.symbol} {r.name}
                </div>
              )}
              {allDay.map((e) => (
                <EventChip key={e.id + e.on} e={e} showTime={false} />
              ))}
            </DropZone>
          );
        })}
      </div>
      <div className="tg-scroll" ref={scroller}>
        <div className="tg-body" style={{ height: slots.length * slotH }}>
          <div className="tg-times" aria-hidden>
            {slots.filter((s) => s.endsWith(':00')).map((s) => (
              <div key={s} style={{ top: topFor(s, slotH) }}>
                {s}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <DayColumn key={d} day={d} events={occ.filter((e) => e.on === d && !e.allDay)} isToday={d === today} now={now} onNew={newAt} slotH={slotH} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day, events, isToday, now, onNew, slotH }: { day: ISODate; events: Occurrence[]; isToday: boolean; now: string; onNew: (d: ISODate, t: string) => void; slotH: number }) {
  const lanes = layoutLanes(events.map((e) => ({ ...e, id: e.id + e.on })));
  return (
    <div className="tg-col">
      {slots.map((s) => (
        <DropZone key={s} target={{ type: 'slot', date: day, time: s }} className={`tg-slot ${s.endsWith(':00') ? 'hour' : ''}`} onEmptyClick={() => onNew(day, s)} label={`${fmt.long(day)} ${s} Uhr`} />
      ))}
      {events.map((e) => {
        const l = lanes.get(e.id + e.on) ?? { lane: 0, lanes: 1 };
        if (e.external) {
          const height = Math.max(slotH * 0.8, (e.duration / 30) * slotH - 3);
          const pos = { top: topFor(e.time, slotH) + 1, height, left: `calc(${(l.lane / l.lanes) * 100}% + 2px)`, width: `calc(${100 / l.lanes}% - 4px)` };
          return <ExternalBlock key={e.id} e={e} style={pos} />;
        }
        return <EventBlock key={e.id + e.on} e={e} lane={l.lane} lanes={l.lanes} slotH={slotH} />;
      })}
      {isToday && toMinutes(now) >= START * 60 && toMinutes(now) < END * 60 && (
        <motion.div className="tg-now" style={{ top: topFor(now, slotH) }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} aria-label={`Jetzt ${now}`} />
      )}
    </div>
  );
}

function EventBlock({ e, lane, lanes, slotH }: { e: Occurrence; lane: number; lanes: number; slotH: number }) {
  const resize = useStore((s) => s.resizeEvent);
  const [preview, setPreview] = useState<number | null>(null);
  const duration = preview ?? e.duration;
  const height = Math.max(slotH * 0.8, (duration / 30) * slotH - 3);
  const startResize = (ev: React.PointerEvent) => {
    ev.stopPropagation();
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    const y0 = ev.clientY;
    const move = (m: PointerEvent) => setPreview(Math.max(15, e.duration + Math.round(((m.clientY - y0) / slotH) * 2) * 15));
    const up = (u: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      const final = Math.max(15, e.duration + Math.round(((u.clientY - y0) / slotH) * 2) * 15);
      setPreview(null);
      if (final !== e.duration) resize(e.id, final);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  return (
    <Pickable
      payload={{ type: 'event', id: e.id, on: e.on, label: `${CATEGORY_STYLE[e.category]?.emoji ?? ''} ${e.title}` }}
      className={`ev-block ${height < 50 ? 'is-short' : ''}`}
      style={{ ...hueStyle(e.category), top: topFor(e.time, slotH) + 1, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
      title={`${e.title} · ${timeRange(e)}`}
    >
      <div className="ev-block__title ellipsis">
        {CATEGORY_STYLE[e.category]?.emoji} {e.title}
      </div>
      <div className="ev-block__meta row">
        <span>{preview ? `${e.time}–${fromMinutes(toMinutes(e.time) + duration)}` : timeRange(e)}</span>
        {e.repeat !== 'none' && <span>↻</span>}
        <span className="grow" />
        <EventWeatherBadge e={e} />
        <OwnerDot owner={e.owner} />
      </div>
      <span
        className="ev-block__resize"
        aria-label="Dauer ziehen"
        onPointerDown={startResize}
        onMouseDown={(x) => x.stopPropagation()}
        onTouchStart={(x) => x.stopPropagation()}
        onClick={(x) => x.stopPropagation()}
      />
    </Pickable>
  );
}
