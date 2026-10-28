import { motion } from 'motion/react';
import { addDays, fmt } from '../../lib/date';
import { useAllOccurrences } from '../external/useExternal';
import { useNow, useSeconds, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { AffirmationCard } from '../affirmations/AffirmationCard';
import { EventChip, timeRange } from '../calendar/EventChip';
import { CompanionCard } from '../companion/Companion';
import { EnergyCheckin } from '../companion/EnergyCheckin';
import { MealSlotBox } from '../meals/MealSlotBox';
import { DayTasks } from '../tasks/TasksPage';
import { WeatherPanel } from '../weather/WeatherPanel';
import { useOwnerName } from '../calendar/hooks';
import './home.css';

function Clock() {
  const d = useSeconds();
  const today = useToday();
  return (
    <div className="clock">
      <div className="clock__time">
        {String(d.getHours()).padStart(2, '0')}
        <motion.span animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          :
        </motion.span>
        {String(d.getMinutes()).padStart(2, '0')}
      </div>
      <div className="clock__date">
        {fmt.long(today)} · KW {fmt.kw(today)}
      </div>
    </div>
  );
}

function Agenda() {
  const setUi = useStore((s) => s.setUi);
  const today = useToday();
  const now = useNow();
  const name = useOwnerName();
  const all = useAllOccurrences(today, addDays(today, 2));
  const list = all.filter((e) => e.on > today || e.allDay || e.time >= now.slice(0, 2) + ':00');
  return (
    <section className="card stack">
      <div className="row">
        <div className="eyebrow grow">Als Nächstes</div>
        <button className="btn sm" onClick={() => setUi({ view: 'calendar', calendarMode: 'agenda', cursor: today })}>
          Alle Termine
        </button>
      </div>
      {list.slice(0, 6).map((e) => (
        <div key={e.id + e.on} className="home-ev">
          <div className="home-ev__when">
            <b>{fmt.relative(e.on, today)}</b>
            <span className="small muted">{timeRange(e)}</span>
          </div>
          <div className="grow">
            <EventChip e={e} showTime={false} />
            <span className="small muted">{name(e.owner)}</span>
          </div>
        </div>
      ))}
      {!list.length && <div className="empty">Nichts geplant – genießt den Freiraum.</div>}
    </section>
  );
}

export function HomePage() {
  const today = useToday();
  const shopping = useStore((s) => s.data.shopping.filter((x) => !x.done).length);
  const setUi = useStore((s) => s.setUi);
  return (
    <div className="home">
      <div className="home__top">
        <Clock />
        <AffirmationCard large />
      </div>
      <div className="home__grid">
        <div className="stack">
          <WeatherPanel />
          <Agenda />
        </div>
        <div className="stack">
          <CompanionCard />
          <EnergyCheckin day={today} />
        </div>
        <div className="stack">
          <section className="card stack">
            <div className="row">
              <div className="eyebrow grow">Heute essen wir</div>
              <button className="btn sm" onClick={() => setUi({ view: 'meals' })}>
                Essensplan
              </button>
            </div>
            <MealSlotBox day={today} slot="Mittag" />
            <MealSlotBox day={today} slot="Abend" />
            <div className="small muted">Morgen:</div>
            <MealSlotBox day={addDays(today, 1)} slot="Abend" compact />
          </section>
          <section className="card stack">
            <DayTasks day={today} />
            <button className="tile" onClick={() => setUi({ view: 'shopping' })}>
              🛒 <b>{shopping}</b> Dinge auf der Einkaufsliste
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
