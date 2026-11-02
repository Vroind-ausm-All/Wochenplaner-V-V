import { CARE_CATEGORIES, weekBalance, type Balance } from '../../lib/balance';
import { addDays, fmt, monday, range } from '../../lib/date';
import { occurrences } from '../../lib/recurrence';
import { useToday } from '../../lib/useClock';
import { WOCHENKOMPASS } from '../../store/defaults';
import { useStore } from '../../store/store';
import { Icon, OwnerMark } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useOwnerName } from '../calendar/hooks';
import { useCompanion } from './useCompanion';

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Wer trägt was: Aufgaben (erledigt) und Organisations-Termine je Person, mit Balken im Verhältnis. */
export function BalanceTable({ balance }: { balance: Balance }) {
  const name = useOwnerName();
  const load = (o: keyof Balance) => balance[o].tasks + balance[o].events;
  const max = Math.max(1, load('Person A'), load('Person B'), load('Beide'));
  return (
    <ul className="balance">
      {(['Person A', 'Person B', 'Beide'] as const).map((o) => (
        <li key={o}>
          <span className="balance__who">
            <OwnerMark owner={o} size={12} /> {o === 'Beide' ? 'Gemeinsam' : name(o)}
          </span>
          <span className="balance__nums num">
            {n(balance[o].tasks, 'Aufgabe', 'Aufgaben')}
            {balance[o].tasks ? ` (${balance[o].done} erledigt)` : ''} · {n(balance[o].events, 'Termin', 'Termine')}
          </span>
          <span className="balance__bar" aria-hidden>
            <i style={{ width: `${(load(o) / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Wochenkompass für die 15 Minuten am Sonntag: Rückblick auf diese Woche, Ausblick auf die nächste,
 * dazu die Checkliste aus dem alten Board.
 */
export function WeekCompass() {
  const open = useStore((s) => s.compassOpen);
  const data = useStore((s) => s.data);
  const { setUi, mutate } = useStore.getState();
  const report = useCompanion();
  const today = useToday();
  const name = useOwnerName();
  const close = () => setUi({ compassOpen: false });
  if (!open) return <Sheet open={false} onClose={close} title="" children={null} />;

  const nextWeek = addDays(monday(today), 7);
  const ahead = occurrences(data.events, nextWeek, addDays(nextWeek, 6));
  const nextBalance = weekBalance(data, nextWeek);
  const fullDays = range(nextWeek, 7).filter((d) => ahead.filter((e) => e.on === d && !e.allDay).length >= 4);
  const wirAhead = ahead.filter((e) => e.category === 'Wir').length;
  const careAhead = ahead.filter((e) => CARE_CATEGORIES.includes(e.category) && e.owner === 'Beide').length;

  return (
    <Sheet
      open
      wide
      onClose={close}
      title="Wochenkompass"
      footer={
        <>
          <button
            className="btn"
            onClick={() => {
              close();
              setUi({ view: 'tasks' });
            }}
          >
            <Icon name="tasks" size={18} /> Aufgaben verteilen
          </button>
          <button className="btn" onClick={() => mutate((d) => void (d.checks = d.checks.map(() => false)))}>
            <Icon name="refresh" size={18} /> Checkliste zurücksetzen
          </button>
          <span className="grow" />
          <button className="btn primary" onClick={close}>
            Fertig
          </button>
        </>
      }
    >
      <div className="compass-sheet">
        <section className="zone">
          <h3 className="zone__title">Rückblick · diese Woche</h3>
          <div className="compass-facts">
            <div>
              <span className="eyebrow">Wir-Zeit</span>
              <b className="num">
                {fmt.duration(report.wir.minutes)} <span className="muted">von {fmt.duration(report.wir.goal)}</span>
              </b>
            </div>
            <div>
              <span className="eyebrow">Date Night</span>
              <b>{report.daysSinceDate === null ? 'noch keine' : report.daysSinceDate <= 7 ? 'ja' : `vor ${report.daysSinceDate} Tagen`}</b>
            </div>
          </div>
          <span className="eyebrow">Wer hat was getragen</span>
          <BalanceTable balance={report.balance} />
        </section>

        <section className="zone">
          <h3 className="zone__title">Ausblick · ab {fmt.short(nextWeek)}</h3>
          <ul className="compass-ahead">
            <li>
              <Icon name="calendar" size={18} /> {n(ahead.length, 'Termin', 'Termine')}{fullDays.length ? `, volle Tage: ${fullDays.map(fmt.weekday).join(', ')}` : ', kein Tag ist übervoll'}
            </li>
            <li>
              <Icon name="wir" size={18} /> {wirAhead ? `${wirAhead} × Wir-Zeit geplant` : 'Noch keine Wir-Zeit geplant'}
            </li>
            {careAhead > 0 && (
              <li>
                <Icon name="users" size={18} /> {careAhead} Familien-Termine stehen noch auf „Beide“ – wer übernimmt?
              </li>
            )}
            {(['Person A', 'Person B'] as const).map((o) => (
              <li key={o}>
                <OwnerMark owner={o} size={12} /> {name(o)}: {n(nextBalance[o].tasks, 'Aufgabe', 'Aufgaben')}, {n(nextBalance[o].events, 'Termin', 'Termine')}
              </li>
            ))}
          </ul>
        </section>

        <section className="zone zone--quiet">
          <h3 className="zone__title">Checkliste · 15 Minuten</h3>
          <div className="checklist">
            {WOCHENKOMPASS.map((c, i) => (
              <label key={c} className="check">
                <input type="checkbox" checked={!!data.checks[i]} onChange={(e) => mutate((d) => void (d.checks[i] = e.target.checked))} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
}
