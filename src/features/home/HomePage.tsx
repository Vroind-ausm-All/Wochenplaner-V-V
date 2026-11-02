import { useState } from 'react';
import { findRecipe } from '../../data/recipes';
import { DropZone, Pickable } from '../../dnd/Dnd';
import { addDays, fmt, fromMinutes, toMinutes, weekdayIndex } from '../../lib/date';
import { taskOccurrences, type Occurrence } from '../../lib/recurrence';
import { useNow, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import type { ISODate, Owner } from '../../store/types';
import { Icon, OwnerMark } from '../../ui/Icon';
import { AffirmationCard } from '../affirmations/AffirmationCard';
import { CategoryIcon } from '../calendar/EventChip';
import { useOwnerName, useOwners } from '../calendar/hooks';
import { CompanionSummary } from '../companion/Companion';
import { EnergyCheckin } from '../companion/EnergyCheckin';
import { useAllOccurrences } from '../external/useExternal';
import { AlertBanner } from '../weather/AlertBanner';
import { WeatherCheck } from '../weather/WeatherCheck';
import { WeatherOutlook, WeatherToday } from '../weather/WeatherPanel';
import { QuickAdd, type QuickAddTarget } from './QuickAdd';
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
  const mins = toMinutes(now);
  // Tageszeiten: vormittags Check-in, ab 17 Uhr der Abend, ab 20:30 Uhr schon morgen.
  const evening = mins >= 20 * 60 + 30;
  const lateDay = !evening && mins >= 17 * 60;
  const day = evening ? addDays(today, 1) : today;
  const morning = !evening && mins < 12 * 60;
  const checkin = useStore((s) => s.data.checkins[today]);
  const needsCheckin = morning && !(checkin?.a && checkin?.b);
  const sunday = weekdayIndex(today) === 6 && !evening;
  const setUi = useStore((s) => s.setUi);

  return (
    <div className="home">
      <AlertBanner />
      <WhoDoesWhat day={day} isTomorrow={evening} />

      <section className="zone home__today" aria-label={evening ? 'Morgen' : lateDay ? 'Heute Abend' : 'Heute'}>
        <header className="zone__head">
          <h2 className="zone__title">{evening ? 'Morgen' : lateDay ? 'Heute Abend' : 'Heute'}</h2>
        </header>
        <div className="home__today-grid">
          <div className="home__meals-col">
            <Meals day={day} eveningOnly={lateDay} />
            {lateDay && <FreeEvening />}
          </div>
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
          {!sunday && (
            <button className="linklike" onClick={() => setUi({ compassOpen: true })}>
              Wochenkompass <Icon name="arrow-right" size={14} />
            </button>
          )}
        </header>
        {sunday && (
          <button className="compass-prompt" onClick={() => setUi({ compassOpen: true })}>
            <Icon name="compass" size={24} />
            <span className="grow">
              <b>Sonntag: Zeit für euren Wochenkompass</b>
              <span className="small muted"> · 15 Minuten Rückblick und Ausblick, wer übernimmt was</span>
            </span>
            <Icon name="arrow-right" size={18} />
          </button>
        )}
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

/** Ebene 1: der Tag nach Personen – Person A · Gemeinsam · Person B (und Kind, wenn eingetragen). */
function WhoDoesWhat({ day, isTomorrow }: { day: ISODate; isTomorrow: boolean }) {
  const today = useToday();
  const now = useNow();
  const name = useOwnerName();
  const owners = useOwners();
  const setUi = useStore((s) => s.setUi);
  const tasks = useStore((s) => s.data.tasks);
  const [adding, setAdding] = useState<QuickAddTarget | null>(null);
  const events = useAllOccurrences(day, day).filter((e) => e.on === day);
  const todo = taskOccurrences(tasks, day, day);
  const past = (e: Occurrence) => day === today && !e.allDay && toMinutes(e.time) + e.duration <= toMinutes(now);
  const next = events.filter((e) => !e.allDay && !past(e)).sort((a, b) => a.time.localeCompare(b.time))[0];
  const minutesUntil = next && day === today ? toMinutes(next.time) - toMinutes(now) : null;
  const soon = minutesUntil !== null && minutesUntil <= 30;
  const order: Owner[] = ['Person A', 'Beide', 'Person B', ...(owners.includes('Kind') ? (['Kind'] as Owner[]) : [])];
  const label = (o: Owner) => (o === 'Beide' ? 'Gemeinsam' : name(o));

  return (
    <>
      <section className={`zone zone--hero who ${order.length > 3 ? 'has-child' : ''}`} aria-label={isTomorrow ? 'Morgen – wer macht was' : 'Heute – wer macht was'}>
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
          <p className={`who__next ${soon ? 'is-soon' : ''}`}>
            <span className="eyebrow">{soon ? (minutesUntil! <= 0 ? 'Jetzt' : `In ${minutesUntil} Min.`) : 'Als Nächstes'}</span>
            <b className="num">{next.time}</b> {next.title}
            <span className="who__next-owner">
              <OwnerMark owner={next.owner} size={12} /> {label(next.owner)}
            </span>
          </p>
        )}
        <div className="who__cols">
          {order.map((o) => {
            const ev = events.filter((e) => e.owner === o);
            const done = ev.filter(past);
            const open = ev.filter((e) => !past(e)).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.time.localeCompare(b.time));
            const tk = todo.filter((t) => t.owner === o);
            return (
              <DropZone key={o} target={{ type: 'owner', owner: o, date: day }} label={`Übernimmt: ${label(o)}`} className={`who__col ${o === 'Beide' ? 'is-shared' : ''}`}>
                <div className="who__head">
                  <OwnerMark owner={o} size={14} />
                  <b className="ellipsis">{label(o)}</b>
                </div>
                <ul className="who__list">
                  {open.map((e) =>
                    e.external ? (
                      <li key={e.id} className="who__ev">
                        <span className="who__time num">{e.allDay ? 'ganzt.' : e.time}</span>
                        <Icon name="link" size={18} />
                        <span className="grow">{e.title}</span>
                      </li>
                    ) : (
                      <Pickable key={e.id} as="li" className="who__ev" payload={{ type: 'event', id: e.id, on: e.on, label: e.title }} title="Ziehen oder antippen, dann eine andere Spalte antippen">
                        <span className="who__time num">{e.allDay ? 'ganzt.' : e.time}</span>
                        <CategoryIcon category={e.category} size={18} />
                        <span className="grow">{e.title}</span>
                      </Pickable>
                    ),
                  )}
                  {tk.map((t) => (
                    <Pickable key={t.id} as="li" className={`who__task ${t.isDone ? 'is-done' : ''}`} payload={{ type: 'task', id: t.id, on: t.on, label: t.title }} title="Ziehen oder antippen, dann eine andere Spalte antippen">
                      <input
                        type="checkbox"
                        checked={t.isDone}
                        aria-label={`${t.title} erledigt`}
                        onClick={(x) => x.stopPropagation()}
                        onPointerDown={(x) => x.stopPropagation()}
                        onChange={(x) => toggleTask(t.id, t.on, x.target.checked)}
                      />
                      <span className="grow">{t.title}</span>
                      {t.rotate && <Icon name="repeat" size={14} label="abwechselnd" />}
                    </Pickable>
                  ))}
                  {!open.length && !tk.length && <li className="who__free">{o === 'Beide' ? 'Noch nichts gemeinsam geplant' : 'Frei'}</li>}
                </ul>
                <div className="who__foot">
                  {done.length > 0 && (
                    <span className="who__done small">
                      <Icon name="check" size={14} /> {done.length} erledigt
                    </span>
                  )}
                  <button
                    className="who__add"
                    aria-label={`Neu für ${label(o)}`}
                    onClick={(x) => {
                      x.stopPropagation();
                      setAdding({ owner: o, date: day });
                    }}
                  >
                    <Icon name="plus" size={18} />
                  </button>
                </div>
              </DropZone>
            );
          })}
        </div>
      </section>
      {/* Außerhalb der dunklen Fläche, damit der Dialog die normalen Farben bekommt */}
      <QuickAdd target={adding} onClose={() => setAdding(null)} />
    </>
  );
}

/** Ebene 2: Essen nur zum Lesen – Bearbeiten passiert im Essensplan. */
function Meals({ day, eveningOnly }: { day: ISODate; eveningOnly?: boolean }) {
  const meals = useStore((s) => s.data.meals[day]);
  const setUi = useStore((s) => s.setUi);
  const slots = (['Mittag', 'Abend'] as const).filter((s) => s === 'Abend' || (!eveningOnly && meals?.[s]));
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

/** Abends: Ab wann ist der Tag geschafft? Lädt zu gemeinsamer Zeit ein. */
function FreeEvening() {
  const today = useToday();
  const now = useNow();
  const events = useAllOccurrences(today, today).filter((e) => e.on === today && !e.allDay);
  const ends = events.map((e) => toMinutes(e.time) + e.duration).filter((m) => m > toMinutes(now));
  const shared = events.some((e) => e.category === 'Wir' && toMinutes(e.time) + e.duration > toMinutes(now));
  const from = ends.length ? Math.max(...ends) : toMinutes(now);
  if (from >= 22 * 60) return null;
  return (
    <p className="free-evening">
      <Icon name="wir" size={20} />
      {shared ? 'Heute Abend habt ihr gemeinsame Zeit geplant.' : ends.length ? `Ab ${fromMinutes(Math.ceil(from / 15) * 15)} Uhr ist nichts mehr geplant – Zeit für euch.` : 'Heute Abend ist nichts mehr geplant – Zeit für euch.'}
    </p>
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
