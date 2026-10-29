import { addDays, fmt, toMinutes } from '../../lib/date';
import { taskOccurrences } from '../../lib/recurrence';
import { useAllOccurrences } from '../external/useExternal';
import { useNow, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import type { Owner } from '../../store/types';
import { Icon, OwnerMark } from '../../ui/Icon';
import { AffirmationCard } from '../affirmations/AffirmationCard';
import { CategoryIcon, EventChip, OwnerDot, timeRange } from '../calendar/EventChip';
import { CompanionCard } from '../companion/Companion';
import { EnergyCheckin } from '../companion/EnergyCheckin';
import { MealSlotBox } from '../meals/MealSlotBox';
import { AlertBanner } from '../weather/AlertBanner';
import { WeatherCheck } from '../weather/WeatherCheck';
import { WeatherPanel } from '../weather/WeatherPanel';
import { useOwnerName } from '../calendar/hooks';
import './home.css';

function Clock() {
  const now = useNow();
  const today = useToday();
  return (
    <div className="clock">
      <div className="clock__time num">{now}</div>
      <div className="clock__date">
        {fmt.long(today)} <span className="muted">· KW {fmt.kw(today)}</span>
      </div>
    </div>
  );
}

const toggleTask = (id: string, on: string, done: boolean) =>
  useStore.getState().mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return;
    t.doneDates = done ? [...new Set([...(t.doneDates || []), on])] : (t.doneDates || []).filter((x) => x !== on);
  });

/**
 * Heute auf einen Blick – nach Personen geordnet: links Person A, in der Mitte „Gemeinsam“, rechts Person B.
 * So sieht man an der Wand sofort, wer was übernimmt und wo ihr zusammen seid.
 */
function Today() {
  const today = useToday();
  const now = useNow();
  const name = useOwnerName();
  const setUi = useStore((s) => s.setUi);
  const tasks = useStore((s) => s.data.tasks);
  const events = useAllOccurrences(today, today).filter((e) => e.on === today);
  const todo = taskOccurrences(tasks, today, today);
  const cols: { owner: Owner; label: string }[] = [
    { owner: 'Person A', label: name('Person A') },
    { owner: 'Beide', label: 'Gemeinsam' },
    { owner: 'Person B', label: name('Person B') },
  ];
  const past = (e: (typeof events)[number]) => !e.allDay && toMinutes(e.time) + e.duration <= toMinutes(now);

  return (
    <section className="today" aria-label="Heute – wer macht was">
      <header className="section-head">
        <span className="eyebrow">Heute · wer macht was</span>
        <button className="linklike" onClick={() => setUi({ view: 'calendar', calendarMode: 'day', cursor: today })}>
          Tagesansicht <Icon name="arrow-right" size={14} />
        </button>
      </header>
      <div className="today__cols">
        {cols.map((c) => {
          const ev = events.filter((e) => e.owner === c.owner);
          const tk = todo.filter((t) => t.owner === c.owner);
          const open = tk.filter((t) => !t.isDone).length;
          return (
            <div key={c.owner} className={`today__col ${c.owner === 'Beide' ? 'is-shared' : ''}`}>
              <div className="today__head">
                <OwnerMark owner={c.owner} size={14} />
                <b className="ellipsis">{c.label}</b>
                <span className="grow" />
                <span className="today__count num" title="Termine · offene Aufgaben">
                  {ev.length} · {open}
                </span>
              </div>
              <ul className="today__list">
                {ev.map((e) => (
                  <li key={e.id} className={`today__ev ${past(e) ? 'is-past' : ''}`}>
                    <span className="today__time num">{e.allDay ? 'ganzt.' : e.time}</span>
                    <CategoryIcon category={e.category} size={16} />
                    <span className="grow ellipsis">{e.title}</span>
                  </li>
                ))}
                {tk.map((t) => (
                  <li key={t.id} className={`today__task ${t.isDone ? 'is-done' : ''}`}>
                    <label>
                      <input type="checkbox" checked={t.isDone} onChange={(x) => toggleTask(t.id, t.on, x.target.checked)} />
                      <span className="grow">{t.title}</span>
                    </label>
                  </li>
                ))}
                {!ev.length && !tk.length && <li className="today__free">{c.owner === 'Beide' ? 'Noch nichts gemeinsam – Zeit füreinander?' : 'Frei'}</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Upcoming() {
  const setUi = useStore((s) => s.setUi);
  const today = useToday();
  const all = useAllOccurrences(addDays(today, 1), addDays(today, 3));
  return (
    <section className="card stack">
      <header className="section-head">
        <span className="eyebrow">Die nächsten Tage</span>
        <button className="linklike" onClick={() => setUi({ view: 'calendar', calendarMode: 'agenda', cursor: today })}>
          Alle Termine <Icon name="arrow-right" size={14} />
        </button>
      </header>
      <ul className="upcoming">
        {all.slice(0, 6).map((e) => (
          <li key={e.id + e.on} className="upcoming__item">
            <span className="upcoming__when">
              <b>{fmt.relative(e.on, today)}</b>
              <span className="small muted num">{timeRange(e)}</span>
            </span>
            <span className="grow">
              <EventChip e={e} showTime={false} />
            </span>
            <OwnerDot owner={e.owner} />
          </li>
        ))}
      </ul>
      {!all.length && <div className="empty">Nichts geplant – genießt den Freiraum.</div>}
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
      <AlertBanner />
      <Today />
      <div className="home__grid">
        <div className="stack">
          <CompanionCard />
        </div>
        <div className="stack">
          <WeatherPanel />
          <WeatherCheck />
          <Upcoming />
        </div>
        <div className="stack">
          <section className="card stack">
            <header className="section-head">
              <span className="eyebrow">Heute essen wir</span>
              <button className="linklike" onClick={() => setUi({ view: 'meals' })}>
                Essensplan <Icon name="arrow-right" size={14} />
              </button>
            </header>
            <MealSlotBox day={today} slot="Mittag" />
            <MealSlotBox day={today} slot="Abend" />
            <span className="eyebrow">Morgen</span>
            <MealSlotBox day={addDays(today, 1)} slot="Abend" compact />
          </section>
          <button className="tile" onClick={() => setUi({ view: 'shopping' })}>
            <Icon name="cart" />
            <span className="grow">Einkaufsliste</span>
            <b className="num">{shopping}</b>
            <Icon name="arrow-right" size={16} />
          </button>
          <EnergyCheckin day={today} />
        </div>
      </div>
    </div>
  );
}
