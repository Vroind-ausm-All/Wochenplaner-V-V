import { AnimatePresence, motion } from 'motion/react';
import { recipeById } from '../../data/recipes';
import { PickBanner } from '../../dnd/Dnd';
import { pick, useDnd } from '../../dnd/state';
import { addDays, addMonths, fmt, monday, range } from '../../lib/date';
import { useToday } from '../../lib/useClock';
import { useStore, type CalendarMode } from '../../store/store';
import { Segmented } from '../../ui/Segmented';
import { EnergyCheckin } from '../companion/EnergyCheckin';
import { MealSlotBox } from '../meals/MealSlotBox';
import { DayTasks } from '../tasks/TasksPage';
import { HourlyStrip } from '../weather/WeatherPanel';
import { AgendaView } from './AgendaView';
import { MonthView } from './MonthView';
import { TemplateTray } from './TemplateTray';
import { TimeGrid } from './TimeGrid';
import './calendar.css';
import { Icon } from '../../ui/Icon';

const MODES: { value: CalendarMode; label: string }[] = [
  { value: 'month', label: 'Monat' },
  { value: 'week', label: 'Woche' },
  { value: 'day', label: 'Tag' },
  { value: 'agenda', label: 'Termine' },
];

export function CalendarPage() {
  const mode = useStore((s) => s.calendarMode);
  const cursor = useStore((s) => s.cursor);
  const setUi = useStore((s) => s.setUi);
  const today = useToday();

  const shift = (dir: number) => {
    const next = mode === 'month' ? addMonths(cursor, dir) : addDays(cursor, dir * (mode === 'day' ? 1 : 7));
    setUi({ cursor: next });
  };
  const title =
    mode === 'month' ? fmt.month(cursor)
    : mode === 'week' ? `${fmt.short(monday(cursor))} – ${fmt.short(addDays(monday(cursor), 6))}`
    : mode === 'day' ? fmt.long(cursor)
    : `Ab ${fmt.relative(cursor, today)}`;
  const periodKey = mode === 'month' ? cursor.slice(0, 7) : mode === 'week' ? monday(cursor) : cursor;

  return (
    <div className="cal">
      <header className="cal__bar">
        <div className="row">
          <button className="btn icon" onClick={() => shift(-1)} aria-label="Zurück">
            <Icon name="chevron-left" />
          </button>
          <button className="btn" onClick={() => setUi({ cursor: today })}>
            Heute
          </button>
          <button className="btn icon" onClick={() => shift(1)} aria-label="Weiter">
            <Icon name="chevron-right" />
          </button>
          <h2 className="cal__title">{title}</h2>
        </div>
        <Segmented value={mode} options={MODES} onChange={(m) => setUi({ calendarMode: m })} label="Ansicht" />
      </header>
      <div className="cal__main">
        <div className="cal__view">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={mode + periodKey} className="cal__anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {mode === 'month' && <MonthView />}
              {mode === 'week' && <TimeGrid days={range(monday(cursor), 7)} />}
              {mode === 'day' && (
                <div className="dayview">
                  <TimeGrid days={[cursor]} />
                  <DayPanel />
                </div>
              )}
              {mode === 'agenda' && <AgendaView />}
            </motion.div>
          </AnimatePresence>
        </div>
        <TemplateTray />
      </div>
    </div>
  );
}

function DayPanel() {
  const cursor = useStore((s) => s.cursor);
  return (
    <aside className="daypanel">
      <HourlyStrip date={cursor} />
      <section className="stack">
        <span className="eyebrow">Essen</span>
        <MealSlotBox day={cursor} slot="Mittag" />
        <MealSlotBox day={cursor} slot="Abend" />
      </section>
      <EnergyCheckin day={cursor} />
      <DayTasks day={cursor} />
    </aside>
  );
}

/** Banner mit Zusatzaktionen für das ausgewählte Element (app-weit eingebunden). */
export function PickActions() {
  const picked = useDnd((s) => s.picked);
  const events = useStore((s) => s.data.events);
  const setUi = useStore((s) => s.setUi);
  let actions = null;
  if (picked?.type === 'event') {
    const ev = events.find((e) => e.id === picked.id);
    actions = ev && (
      <>
        <button className="btn sm" onClick={() => { pick(null); setUi({ editing: { kind: 'event', event: ev } }); }}>
          <Icon name="edit" size={16} /> Bearbeiten
        </button>
        <button className="btn sm danger" onClick={() => { pick(null); useStore.getState().deleteEvent(ev.id); }} aria-label="Löschen">
          <Icon name="trash" size={16} />
        </button>
      </>
    );
  }
  if (picked?.type === 'recipe' || picked?.type === 'meal') {
    const id = picked.type === 'recipe' ? picked.recipeId : undefined;
    actions = id && recipeById(id) ? <button className="btn sm" onClick={() => setUi({ recipeOpen: id })}>Rezept</button> : null;
  }
  return <PickBanner actions={actions} />;
}
