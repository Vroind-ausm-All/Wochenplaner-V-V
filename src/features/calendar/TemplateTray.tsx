import { motion } from 'motion/react';
import { TEMPLATES } from '../../data/templates';
import { Pickable } from '../../dnd/Dnd';
import { useDnd } from '../../dnd/state';
import { fmt } from '../../lib/date';
import { useStore } from '../../store/store';
import type { Owner } from '../../store/types';
import { Chips } from '../../ui/Segmented';
import { useCompanion } from '../companion/useCompanion';
import { useOwnerName } from './hooks';

/** Bausteine & Vorschläge zum Ziehen oder Antippen. */
export function TemplateTray() {
  const owner = useDnd((s) => s.owner);
  const name = useOwnerName();
  const report = useCompanion();
  const mutate = useStore((s) => s.mutate);
  const ideas = report.suggestions.filter((s) => s.kind !== 'meal');

  return (
    <aside className="tray" aria-label="Schnellbausteine">
      <div className="tray__section">
        <div className="eyebrow">Schnellbausteine</div>
        <p className="small muted">Ziehen oder antippen – dann Zeit wählen.</p>
        <div className="tray__owner">
          <span className="small muted">Für</span>
          <Chips<Owner> value={owner} onChange={(o) => useDnd.setState({ owner: o })} options={(['Beide', 'Person A', 'Person B'] as Owner[]).map((o) => ({ value: o, label: name(o) }))} />
        </div>
        <div className="tray__list">
          {TEMPLATES.map((t) => (
            <Pickable key={t.id} payload={{ type: 'template', template: t, label: `${t.emoji} ${t.title}` }} className="tpl" title={`${t.title} · ${t.minutes} Min.`}>
              <span className="tpl__emoji">{t.emoji}</span>
              <span className="grow">
                <b>{t.title}</b>
                <span className="small muted">{fmt.duration(t.minutes)}</span>
              </span>
            </Pickable>
          ))}
        </div>
      </div>
      {ideas.length > 0 && (
        <div className="tray__section">
          <div className="eyebrow">Vorschläge vom Begleiter</div>
          <div className="tray__list">
            {ideas.map((s) => (
              <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sugg-wrap">
                <Pickable payload={{ type: 'suggestion', suggestion: s, label: `${s.emoji} ${s.title}` }} className="tpl sugg" title={s.reason}>
                  <span className="tpl__emoji">{s.emoji}</span>
                  <span className="grow">
                    <b>{s.title}</b>
                    <span className="small muted">
                      Vorschlag: {fmt.relative(s.date)} · {s.time}
                    </span>
                  </span>
                </Pickable>
                <button className="btn sm ghost" aria-label="Vorschlag ausblenden" onClick={() => mutate((d) => void (d.dismissed[s.id] = s.date))}>
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
