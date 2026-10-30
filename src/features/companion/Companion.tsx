import { AnimatePresence, motion } from 'motion/react';
import { Pickable } from '../../dnd/Dnd';
import { applyDrop } from '../../dnd/rules';
import { pick } from '../../dnd/state';
import { fmt } from '../../lib/date';
import { useToday } from '../../lib/useClock';
import { WOCHENKOMPASS } from '../../store/defaults';
import { useStore } from '../../store/store';
import { Icon, OwnerMark } from '../../ui/Icon';
import type { CompanionReport, Mood, Suggestion } from './engine';
import { EnergyCheckin } from './EnergyCheckin';
import { DATE_IDEAS } from './ideas';
import { useCompanion } from './useCompanion';
import './companion.css';

/** Wie nah die beiden Kreise des WIR-Zeichens beieinander stehen – die Stimmung des Begleiters als Form. */
const CLOSENESS: Record<Mood, number> = { celebrate: 1, happy: 0.75, calm: 0.5, sleepy: 0.5, concerned: 0.15 };

/** Der Begleiter als ruhiges Zeichen: zwei Kreise, die näher rücken, je mehr gemeinsame Zeit ihr habt. */
export function CompanionMark({ mood, size = 56 }: { mood: Mood; size?: number }) {
  const d = 7 - 5 * CLOSENESS[mood];
  const t = { duration: 0.8, ease: 'easeInOut' } as const;
  return (
    <svg className={`icon companion-mark is-${mood}`} width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.25} aria-hidden>
      <motion.circle cy={16} r={8} initial={false} animate={{ cx: 16 - d }} transition={t} className="companion-mark__a" />
      <motion.circle cy={16} r={8} initial={false} animate={{ cx: 16 + d }} transition={t} className="companion-mark__b" />
    </svg>
  );
}

/** Überschrift + nummerierte Hinweise. Kein Karussell: alles auf einen Blick. */
function Notes({ report, limit }: { report: CompanionReport; limit?: number }) {
  const list = limit ? report.messages.slice(0, limit) : report.messages;
  return (
    <div className="notes">
      <p className="notes__headline">{report.headline}</p>
      {list.length > 0 && (
        <ol className="notes__list">
          {list.map((m) => (
            <li key={m.text}>
              <Icon name={m.icon} size={18} />
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SuggestionRow({ s }: { s: Suggestion }) {
  const mutate = useStore((x) => x.mutate);
  const setUi = useStore((x) => x.setUi);
  const accept = () => applyDrop({ type: 'suggestion', suggestion: s, label: s.title }, { type: 'slot', date: s.date, time: s.time });
  return (
    <motion.article layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={`sugg-row sugg-row--${s.kind}`}>
      <Pickable payload={{ type: 'suggestion', suggestion: s, label: s.title }} className="sugg-row__main">
        <Icon name={s.icon} size={24} className="sugg-row__icon" />
        <div className="grow">
          <div className="sugg-row__meta">
            <OwnerMark owner={s.owner} size={11} />
            <span>
              {fmt.relative(s.date)} · {s.time} · {fmt.duration(s.duration)}
            </span>
          </div>
          <b className="sugg-row__title">{s.title}</b>
          <p className="small muted">{s.reason}</p>
        </div>
      </Pickable>
      <div className="row wrap sugg-row__actions">
        <button className="btn sm primary" onClick={accept}>
          <Icon name="check" size={16} /> Einplanen
        </button>
        <button
          className="btn sm"
          onClick={() => {
            pick({ type: 'suggestion', suggestion: s, label: s.title });
            setUi({ view: 'calendar', calendarMode: 'week' });
          }}
        >
          <Icon name="clock" size={16} /> Anderer Zeitpunkt
        </button>
        <button className="btn sm ghost" onClick={() => mutate((d) => void (d.dismissed[s.id] = s.date))}>
          Nicht jetzt
        </button>
      </div>
    </motion.article>
  );
}

/**
 * Fortschrittsring. Das SVG selbst ist um −90° gedreht (Start oben), animiert wird nur die Strichlänge –
 * so liegt die Füllung immer exakt auf der Spur.
 */
export function Ring({ value, label, sub, size = 120 }: { value: number; label: string; sub: string; size?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const stroke = 6;
  const r = 50 - stroke / 2;
  return (
    <div className={`ring ${value >= 1 ? 'is-full' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden className="ring__svg">
        <circle cx="50" cy="50" r={r} className="ring__bg" strokeWidth={stroke} />
        <motion.circle cx="50" cy="50" r={r} className="ring__fg" strokeWidth={stroke} initial={{ pathLength: 0 }} animate={{ pathLength: v }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="ring__label">
        <b className="num">{label}</b>
        <span>{sub}</span>
      </div>
      <span className="sr-only">{Math.round(value * 100)} Prozent</span>
    </div>
  );
}

/** Lineare Leiste, z. B. eigene Zeit je Person. */
function Bar({ value }: { value: number }) {
  return (
    <div className="bar__track">
      <motion.div className="bar__fill" initial={{ scaleX: 0 }} animate={{ scaleX: Math.max(0, Math.min(1, value)) }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

function WirMeter({ report, compact }: { report: CompanionReport; compact?: boolean }) {
  const { personA, personB } = useStore((s) => s.data.settings);
  const pct = report.wir.minutes / Math.max(1, report.wir.goal);
  return (
    <div className={`wirmeter ${compact ? 'is-compact' : ''}`}>
      <Ring value={pct} size={compact ? 104 : 132} label={fmt.duration(report.wir.minutes)} sub={`von ${fmt.duration(report.wir.goal)}`} />
      <div className="wirmeter__facts">
        <div className="fact">
          <span className="fact__label">
            <OwnerMark owner="Beide" size={11} /> Gemeinsam
          </span>
          <span className="num">{Math.round(pct * 100)} %</span>
        </div>
        {(
          [
            ['Person A', personA, report.ich.a],
            ['Person B', personB, report.ich.b],
          ] as const
        ).map(([o, n, m]) => (
          <div key={o} className="fact">
            <span className="fact__label">
              <OwnerMark owner={o} size={11} /> <span className="ellipsis">{n} · eigene Zeit</span>
            </span>
            <span className="num">{fmt.duration(m)}</span>
            <Bar value={m / Math.max(1, report.ich.goal)} />
          </div>
        ))}
        <div className="fact-line">
          <span>
            <Icon name="glass" size={16} /> {report.nextDate ? `Date ${fmt.relative(report.nextDate.on)}` : report.daysSinceDate != null ? `Date vor ${report.daysSinceDate} Tagen` : 'Noch keine Date Night'}
          </span>
          <span className={report.checkinPlanned ? '' : 'is-warn'}>
            <Icon name="compass" size={16} /> {report.checkinPlanned ? 'Check-in geplant' : 'Check-in fehlt'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Wir-Zeit in einer Zeile – für die ruhige Ebene der Startseite: ein Satz, ein Balken, ein Vorschlag, ein Knopf.
 * Alles Weitere liegt auf der Seite „Wir-Zeit“.
 */
export function CompanionSummary() {
  const report = useCompanion();
  const setUi = useStore((s) => s.setUi);
  const pct = report.wir.minutes / Math.max(1, report.wir.goal);
  const next = report.suggestions.find((s) => s.kind !== 'meal');
  return (
    <div className="wir-summary">
      <div className="wir-summary__status">
        <CompanionMark mood={report.mood} size={40} />
        <div className="grow">
          <p className="wir-summary__line">{report.headline}</p>
          <div className="wir-summary__meter">
            <Bar value={pct} />
            <span className="small num">
              {fmt.duration(report.wir.minutes)} von {fmt.duration(report.wir.goal)} gemeinsam
            </span>
          </div>
        </div>
      </div>
      {next && (
        <div className="wir-summary__next">
          <Icon name={next.icon} size={22} />
          <span className="grow">
            <b>{next.title}</b>
            <span className="small muted">
              {' '}
              · {fmt.relative(next.date)}, {next.time}
            </span>
          </span>
          <button className="btn sm" onClick={() => applyDrop({ type: 'suggestion', suggestion: next, label: next.title }, { type: 'slot', date: next.date, time: next.time })}>
            <Icon name="check" size={16} /> Einplanen
          </button>
        </div>
      )}
      <button className="linklike wir-summary__more" onClick={() => setUi({ view: 'companion' })}>
        {report.suggestions.length > 1 ? `Alle ${report.suggestions.length} Vorschläge` : 'Zur Wir-Zeit'} <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

/** Ganze Seite „Wir-Zeit“. */
export function CompanionPage() {
  const report = useCompanion();
  const today = useToday();
  const data = useStore((s) => s.data);
  const { mutate, updateSettings } = useStore.getState();
  const s = data.settings;

  return (
    <div className="companion-page">
      <header className="page-head">
        <span className="eyebrow">Woche ab {fmt.short(report.week)}</span>
        <h2>Wir-Zeit</h2>
      </header>
      <section className="zone zone--hero companion companion--hero" aria-label="Stand der Woche">
        <CompanionMark mood={report.mood} size={96} />
        <Notes report={report} />
        <WirMeter report={report} />
      </section>

      <div className="companion-grid">
        <section className="zone">
          <header className="zone__head">
            <h2 className="zone__title">Vorschläge für diese Woche</h2>
          </header>
          <p className="small muted">„Einplanen“ übernimmt den Vorschlag. Oder ziehen bzw. „Anderer Zeitpunkt“ wählen und im Kalender ablegen.</p>
          <AnimatePresence>
            {report.suggestions.map((x) => (
              <SuggestionRow key={x.id} s={x} />
            ))}
          </AnimatePresence>
          {!report.suggestions.length && <div className="empty">Alles gut geplant. Genießt eure Woche.</div>}
        </section>

        <section className="zone zone--quiet companion-side" aria-label="Für euch beide">
          <EnergyCheckin day={today} />
          <div className="card">
            <span className="eyebrow">Frage des Tages · 5 Minuten zuhören</span>
            <p className="companion__question">
              <Icon name="quote" size={22} /> {report.question}
            </p>
          </div>
          <div className="card">
            <span className="eyebrow">Wochenkompass · Sonntag 15 Minuten</span>
            <div className="checklist">
              {WOCHENKOMPASS.map((c, i) => (
                <label key={c} className="check">
                  <input type="checkbox" checked={!!data.checks[i]} onChange={(e) => mutate((d) => void (d.checks[i] = e.target.checked))} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            <button className="btn sm" style={{ marginTop: 12 }} onClick={() => mutate((d) => void (d.checks = d.checks.map(() => false)))}>
              <Icon name="refresh" size={16} /> Für nächste Woche zurücksetzen
            </button>
          </div>
        </section>
      </div>

      <section className="zone zone--quiet">
        <header className="zone__head">
          <h2 className="zone__title">Ideen für euch</h2>
        </header>
        <p className="small muted">Antippen wählt die Idee aus – dann im Kalender eine Zeit antippen. Am Kalender direkt ziehen.</p>
        <div className="ideas">
          {DATE_IDEAS.map((idea) => (
            <Pickable
              key={idea.id}
              className="idea"
              payload={{ type: 'template', label: idea.title, template: { id: `idea-${idea.id}`, title: idea.title, icon: idea.icon, minutes: idea.minutes, category: 'Wir', defaultTime: '19:00' } }}
            >
              <Icon name={idea.icon} size={24} />
              <b>{idea.title}</b>
              <span className="small muted">
                {fmt.duration(idea.minutes)} · {idea.place} · {idea.cost}
              </span>
              <span className="small">{idea.text}</span>
            </Pickable>
          ))}
        </div>
      </section>

      <section className="zone">
        <header className="zone__head">
          <h2 className="zone__title">Eure Ziele</h2>
        </header>
        <p className="small muted">Keine Leistungstests – nur Orientierung, damit Wir-Zeit nicht im Alltag verschwindet.</p>
        <Slider label="Wir-Zeit pro Woche" value={s.wirGoalMinutes} min={60} max={900} step={30} fmt={fmt.duration} onChange={(v) => updateSettings({ wirGoalMinutes: v })} />
        <Slider label="Eigene Zeit pro Person" value={s.ichGoalMinutes} min={0} max={600} step={30} fmt={fmt.duration} onChange={(v) => updateSettings({ ichGoalMinutes: v })} />
        <Slider label="Date Night spätestens alle" value={s.dateNightEveryDays} min={7} max={42} step={7} fmt={(v) => `${v} Tage`} onChange={(v) => updateSettings({ dateNightEveryDays: v })} />
      </section>
    </div>
  );
}

function Slider({ label, value, min, max, step, fmt: f, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>
        {label}: <b>{f(value)}</b>
      </span>
      <input className="slider" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
