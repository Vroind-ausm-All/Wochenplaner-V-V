import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Pickable } from '../../dnd/Dnd';
import { applyDrop } from '../../dnd/rules';
import { pick } from '../../dnd/state';
import { fmt } from '../../lib/date';
import { useToday } from '../../lib/useClock';
import { WOCHENKOMPASS } from '../../store/defaults';
import { useStore } from '../../store/store';
import { CompanionAvatar } from './CompanionAvatar';
import type { CompanionReport, Suggestion } from './engine';
import { EnergyCheckin } from './EnergyCheckin';
import { DATE_IDEAS } from './ideas';
import { useCompanion } from './useCompanion';
import './companion.css';

/** Sprechblase mit wechselnden Hinweisen. */
function Bubble({ report }: { report: CompanionReport }) {
  const lines = [report.headline, ...report.messages];
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [report.headline]);
  useEffect(() => {
    if (lines.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), 7000);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="bubble" onClick={() => setI((x) => (x + 1) % lines.length)}>
      <AnimatePresence mode="wait">
        <motion.p key={lines[i % lines.length]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {lines[i % lines.length]}
        </motion.p>
      </AnimatePresence>
      {lines.length > 1 && (
        <div className="bubble__dots" aria-hidden>
          {lines.map((_, k) => (
            <span key={k} className={k === i % lines.length ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const mutate = useStore((x) => x.mutate);
  const setUi = useStore((x) => x.setUi);
  const accept = () => applyDrop({ type: 'suggestion', suggestion: s, label: s.title }, { type: 'slot', date: s.date, time: s.time });
  return (
    <motion.article layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }} className={`sugg-card sugg-card--${s.kind}`}>
      <Pickable payload={{ type: 'suggestion', suggestion: s, label: `${s.emoji} ${s.title}` }} className="sugg-card__main">
        <span className="sugg-card__emoji">{s.emoji}</span>
        <div className="grow">
          <b>{s.title}</b>
          <div className="small">
            {fmt.relative(s.date)} · {s.time} Uhr · {fmt.duration(s.duration)}
          </div>
          <p className="small muted">{s.reason}</p>
        </div>
      </Pickable>
      <div className="row wrap">
        <button className="btn sm primary" onClick={accept}>
          ✓ Einplanen
        </button>
        <button
          className="btn sm"
          onClick={() => {
            pick({ type: 'suggestion', suggestion: s, label: `${s.emoji} ${s.title}` });
            setUi({ view: 'calendar', calendarMode: 'week' });
          }}
        >
          Anderer Zeitpunkt
        </button>
        <button className="btn sm ghost" onClick={() => mutate((d) => void (d.dismissed[s.id] = s.date))} aria-label="Ausblenden">
          Nicht jetzt
        </button>
      </div>
    </motion.article>
  );
}

/** Kompakte Karte für die Startseite. */
export function CompanionCard() {
  const report = useCompanion();
  const setUi = useStore((s) => s.setUi);
  return (
    <section className="card companion">
      <div className="companion__head">
        <CompanionAvatar mood={report.mood} size={84} onTap={() => setUi({ view: 'companion' })} />
        <div className="grow">
          <div className="eyebrow">Euer WIR-Begleiter</div>
          <Bubble report={report} />
        </div>
      </div>
      <WirMeter report={report} compact />
      <AnimatePresence initial={false}>
        {report.suggestions.slice(0, 2).map((s) => (
          <SuggestionCard key={s.id} s={s} />
        ))}
      </AnimatePresence>
      <button className="btn sm ghost" onClick={() => setUi({ view: 'companion' })}>
        Alles zur Wir-Zeit →
      </button>
    </section>
  );
}

function Ring({ value, label, sub }: { value: number; label: string; sub: string }) {
  const v = Math.min(1, value);
  return (
    <div className="ring">
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="50" className="ring__bg" />
        <motion.circle cx="60" cy="60" r="50" className="ring__fg" initial={{ pathLength: 0 }} animate={{ pathLength: v }} transition={{ type: 'spring', stiffness: 60, damping: 16 }} style={{ rotate: -90, originX: '60px', originY: '60px' }} />
      </svg>
      <div className="ring__label">
        <b>{label}</b>
        <span className="small muted">{sub}</span>
      </div>
    </div>
  );
}

function WirMeter({ report, compact }: { report: CompanionReport; compact?: boolean }) {
  const { personA, personB } = useStore((s) => s.data.settings);
  const pct = report.wir.minutes / Math.max(1, report.wir.goal);
  return (
    <div className={`wirmeter ${compact ? 'is-compact' : ''}`}>
      <Ring value={pct} label={fmt.duration(report.wir.minutes)} sub={`von ${fmt.duration(report.wir.goal)} Wir-Zeit`} />
      <div className="wirmeter__bars">
        {(
          [
            [personA, report.ich.a],
            [personB, report.ich.b],
          ] as const
        ).map(([n, m]) => (
          <div key={n} className="bar">
            <div className="row small">
              <b className="grow ellipsis">🌿 {n}</b>
              <span>{fmt.duration(m)}</span>
            </div>
            <div className="bar__track">
              <motion.div className="bar__fill" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m / Math.max(1, report.ich.goal)) * 100)}%` }} />
            </div>
          </div>
        ))}
        <div className="row small wrap">
          <span className="badge">{report.nextDate ? `💞 Date ${fmt.relative(report.nextDate.on)}` : report.daysSinceDate != null ? `💞 vor ${report.daysSinceDate} Tagen` : '💞 noch keine Date Night'}</span>
          <span className={`badge ${report.checkinPlanned ? '' : 'warn'}`}>{report.checkinPlanned ? '🧭 Check-in geplant' : '🧭 Check-in fehlt'}</span>
        </div>
      </div>
    </div>
  );
}

/** Ganze Seite „Wir-Zeit“. */
export function CompanionPage() {
  const report = useCompanion();
  const today = useToday();
  const data = useStore((s) => s.data);
  const { mutate, updateSettings } = useStore.getState();
  const [wiggle, setWiggle] = useState(0);
  const s = data.settings;

  return (
    <div className="companion-page">
      <section className="card companion companion--hero">
        <motion.div key={wiggle} animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.5 }}>
          <CompanionAvatar mood={report.mood} size={140} onTap={() => setWiggle((w) => w + 1)} />
        </motion.div>
        <div className="grow stack">
          <div className="eyebrow">WIR-Begleiter · Woche ab {fmt.short(report.week)}</div>
          <Bubble report={report} />
          <WirMeter report={report} />
        </div>
      </section>

      <div className="companion-grid">
        <section className="stack">
          <h2>Vorschläge für diese Woche</h2>
          <p className="small muted">Antippen & „Einplanen“ – oder ziehen bzw. „Anderer Zeitpunkt“ wählen und im Kalender ablegen.</p>
          <AnimatePresence>
            {report.suggestions.map((x) => (
              <SuggestionCard key={x.id} s={x} />
            ))}
          </AnimatePresence>
          {!report.suggestions.length && <div className="empty">Alles gut geplant. Genießt eure Woche! 🌿</div>}
        </section>

        <section className="stack">
          <EnergyCheckin day={today} />
          <div className="card warm">
            <div className="eyebrow">Frage des Tages · 5 Minuten zuhören</div>
            <p className="companion__question">„{report.question}“</p>
          </div>
          <div className="card">
            <div className="eyebrow">Wochenkompass · Sonntag 15 Minuten</div>
            <div className="stack" style={{ marginTop: 8 }}>
              {WOCHENKOMPASS.map((c, i) => (
                <label key={c} className="check">
                  <input type="checkbox" checked={!!data.checks[i]} onChange={(e) => mutate((d) => void (d.checks[i] = e.target.checked))} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => mutate((d) => void (d.checks = d.checks.map(() => false)))}>
              Für nächste Woche zurücksetzen
            </button>
          </div>
        </section>
      </div>

      <section className="stack">
        <h2>Ideen für euch</h2>
        <p className="small muted">Antippen wählt die Idee aus – dann im Kalender eine Zeit antippen. Am Kalender direkt ziehen.</p>
        <div className="ideas">
          {DATE_IDEAS.map((idea) => (
            <Pickable
              key={idea.id}
              className="idea"
              payload={{ type: 'template', label: `${idea.emoji} ${idea.title}`, template: { id: `idea-${idea.id}`, title: idea.title, emoji: idea.emoji, minutes: idea.minutes, category: 'Wir', defaultTime: '19:00' } }}
            >
              <span className="idea__emoji">{idea.emoji}</span>
              <b>{idea.title}</b>
              <span className="small muted">
                {fmt.duration(idea.minutes)} · {idea.place} · {idea.cost}
              </span>
              <span className="small">{idea.text}</span>
            </Pickable>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Eure Ziele</h2>
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
