import { findRecipe } from '../../data/recipes';
import { addDays, fmt, toMinutes } from '../../lib/date';
import { taskOccurrences, type Occurrence } from '../../lib/recurrence';
import { useNow, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import type { ISODate, Owner } from '../../store/types';
import { Icon, OwnerMark } from '../../ui/Icon';
import { AffirmationCard } from '../affirmations/AffirmationCard';
import { CategoryIcon } from '../calendar/EventChip';
import { useOwnerName } from '../calendar/hooks';
import { CompanionSummary } from '../companion/Companion';
import { EnergyCheckin } from '../companion/EnergyCheckin';
import { useAllOccurrences } from '../external/useExternal';
import { AlertBanner } from '../weather/AlertBanner';
import { WeatherCheck } from '../weather/WeatherCheck';
import { WeatherOutlook, WeatherToday } from '../weather/WeatherPanel';
import './home.css';

/**
 * Startseite in drei Ebenen – das Auge wandert von oben nach unten:
 *   1. Wer macht heute was (dunkle Fläche, einziger Blickfang)
 *   2. Heute: Essen, Wetter, morgens der Energie-Check-in
 *   3. Diese Woche: Wir-Zeit, die nächsten Tage, Wetter-Ausblick (getönte Fläche)
 *   Rand: Gedanke des Tages, Einkaufsliste
 * Ab 20:30 Uhr zeigt die Seite bereits den nächsten Tag.
 */
export function HomePage() {
  const today = useToday();
  const now = useNow();
  const evening = toMinutes(now) >= 20 * 60 + 30;
  const day = evening ? addDays(today, 1) : today;
  const morning = !evening && toMinutes(now) < 12 * 60;
  const checkin = useStore((s) => s.data.checkins[today]);
  const needsCheckin = morning && !(checkin?.a && checkin?.b);

  return (
    <div className="home">
      <AlertBanner />
      <WhoDoesWhat day={day} isTomorrow={evening} />

      <section className="zone home__today" aria-label={evening ? 'Morgen' : 'Heute'}>
        <header className="zone__head">
          <h2 className="zone__title">{evening ? 'Morgen' : 'Heute'}</h2>
        </header>
        <div className="home__today-grid">
          <Meals day={day} />
          <div className="home__weather">
            <span className="eyebrow">Wetter</span>
            <WeatherToday />
          </div>
        </div>
        <WeatherCheck />
        {needsCheckin && <EnergyCheckin day={today} />}
      </section>

      <section className="zone zone--quiet home__week" aria-label="Diese Woche">
        <header className="zone__head">
          <h2 className="zone__title">Diese Woche</h2>
        </header>
        <div className="home__week-grid">
          <div className="home__week-main">
            <span className="eyebrow">Wir-Zeit</span>
            <CompanionSummary />
          </div>
          <div className="home__week-side">
            <span className="eyebrow">Die nächsten Tage</span>
            <NextDays from={addDays(day, 1)} />
            <WeatherOutlook days={3} />
          </div>
        </div>
      </section>

      <footer className="home__edge">
        <AffirmationCard quiet />
        <ShoppingLink />
      </footer>
    </div>
  );
}

const toggleTask = (id: string, on: string, done: boolean) =>
  useStore.getState().mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return;
    t.doneDates = done ? [...new Set([...(t.doneDates || []), on])] : (t.doneDates || []).filter((x) => x !== on);
  });

/** Ebene 1: der Tag nach Personen – links Person A, mittig gemeinsam, rechts Person B. */
function WhoDoesWhat({ day, isTomorrow }: { day: ISODate; isTomorrow: boolean }) {
  const today = useToday();
  const now = useNow();
  const name = useOwnerName();
  const setUi = useStore((s) => s.setUi);
  const tasks = useStore((s) => s.data.tasks);
  const events = useAllOccurrences(day, day).filter((e) => e.on === day);
  const todo = taskOccurrences(tasks, day, day);
  const past = (e: Occurrence) => day === today && !e.allDay && toMinutes(e.time) + e.duration <= toMinutes(now);
  const next = events.filter((e) => !e.allDay && !past(e)).sort((a, b) => a.time.localeCompare(b.time))[0];
  const cols: { owner: Owner; label: string }[] = [
    { owner: 'Person A', label: name('Person A') },
    { owner: 'Beide', label: 'Gemeinsam' },
    { owner: 'Person B', label: name('Person B') },
  ];

  return (
    <section className="zone zone--hero who" aria-label={isTomorrow ? 'Morgen – wer macht was' : 'Heute – wer macht was'}>
      <header className="zone__head">
        <h2 className="zone__title">
          {isTomorrow ? 'Wer macht morgen was' : 'Wer macht heute was'}
          <small>{fmt.long(day)}</small>
        </h2>
        <button className="linklike" onClick={() => setUi({ view: 'calendar', calendarMode: 'day', cursor: day })}>
          Tagesansicht <Icon name="arrow-right" size={14} />
        </button>
      </header>
      {next && (
        <p className="who__next">
          <span className="eyebrow">Als Nächstes</span>
          <b className="num">{next.time}</b> {next.title}
          <span className="who__next-owner">
            <OwnerMark owner={next.owner} size={12} /> {next.owner === 'Beide' ? 'Gemeinsam' : name(next.owner)}
          </span>
        </p>
      )}
      <div className="who__cols">
        {cols.map((c) => {
          const ev = events.filter((e) => e.owner === c.owner);
          const done = ev.filter(past);
          const open = ev.filter((e) => !past(e)).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.time.localeCompare(b.time));
          const tk = todo.filter((t) => t.owner === c.owner);
          return (
            <div key={c.owner} className={`who__col ${c.owner === 'Beide' ? 'is-shared' : ''}`}>
              <div className="who__head">
                <OwnerMark owner={c.owner} size={14} />
                <b className="ellipsis">{c.label}</b>
              </div>
              <ul className="who__list">
                {open.map((e) => (
                  <li key={e.id} className="who__ev">
                    <span className="who__time num">{e.allDay ? 'ganzt.' : e.time}</span>
                    <CategoryIcon category={e.category} size={18} />
                    <span className="grow">{e.title}</span>
                  </li>
                ))}
                {tk.map((t) => (
                  <li key={t.id} className={`who__task ${t.isDone ? 'is-done' : ''}`}>
                    <label>
                      <input type="checkbox" checked={t.isDone} onChange={(x) => toggleTask(t.id, t.on, x.target.checked)} />
                      <span className="grow">{t.title}</span>
                    </label>
                  </li>
                ))}
                {!open.length && !tk.length && <li className="who__free">{c.owner === 'Beide' ? 'Noch nichts gemeinsam geplant' : 'Frei'}</li>}
              </ul>
              {done.length > 0 && (
                <span className="who__done small">
                  <Icon name="check" size={14} /> {done.length} erledigt
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Ebene 2: Essen nur zum Lesen – Bearbeiten passiert im Essensplan. */
function Meals({ day }: { day: ISODate }) {
  const meals = useStore((s) => s.data.meals[day]);
  const setUi = useStore((s) => s.setUi);
  const slots = (['Mittag', 'Abend'] as const).filter((s) => s === 'Abend' || meals?.[s]);
  return (
    <div className="home__meals">
      {slots.map((slot) => {
        const m = meals?.[slot];
        const r = m && findRecipe(m);
        return (
          <div key={slot} className="meal-line">
            <span className="eyebrow">{slot === 'Abend' ? 'Abendessen' : 'Mittagessen'}</span>
            {m ? (
              <button className="meal-line__name" onClick={() => (r ? setUi({ recipeOpen: r.id }) : setUi({ view: 'meals' }))}>
                {m.name}
                {r && (
                  <span className="small muted num">
                    {' '}
                    · {r.minutes} Min.{m.together ? ' · zusammen kochen' : ''}
                  </span>
                )}
              </button>
            ) : (
              <button className="meal-line__empty" onClick={() => setUi({ view: 'meals' })}>
                Noch nichts geplant <Icon name="arrow-right" size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Ebene 3: die nächsten drei Tage, je Tag eine Zeile. */
function NextDays({ from }: { from: ISODate }) {
  const all = useAllOccurrences(from, addDays(from, 2));
  const days = [0, 1, 2].map((i) => addDays(from, i));
  const setUi = useStore((s) => s.setUi);
  return (
    <ul className="next-days">
      {days.map((d) => {
        const list = all.filter((e) => e.on === d);
        return (
          <li key={d}>
            <button type="button" onClick={() => setUi({ view: 'calendar', calendarMode: 'day', cursor: d })}>
              <span className="next-days__day">{fmt.weekday(d)}</span>
              <span className="next-days__items">
                {list.slice(0, 3).map((e) => (
                  <span key={e.id} className="next-days__item">
                    <OwnerMark owner={e.owner} size={10} />
                    <span className="num">{e.allDay ? '' : e.time}</span> <span className="ellipsis">{e.title}</span>
                  </span>
                ))}
                {list.length > 3 && <span className="small muted">+{list.length - 3} weitere</span>}
                {!list.length && <span className="muted">frei</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ShoppingLink() {
  const open = useStore((s) => s.data.shopping.filter((x) => !x.done).length);
  const setUi = useStore((s) => s.setUi);
  return (
    <button className="home__shop" onClick={() => setUi({ view: 'shopping' })}>
      <Icon name="cart" size={18} /> Einkauf <b className="num">{open}</b>
    </button>
  );
}
