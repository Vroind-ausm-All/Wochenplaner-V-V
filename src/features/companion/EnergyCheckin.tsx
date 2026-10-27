import { motion } from 'motion/react';
import { useStore } from '../../store/store';
import type { Energy, ISODate } from '../../store/types';
import { energyLabel } from './engine';

const LEVELS: { v: Energy; icon: string }[] = [
  { v: 1, icon: '🪫' },
  { v: 2, icon: '🔋' },
  { v: 3, icon: '⚡' },
];

/** Täglicher Mini-Check-in: Wie viel Energie habt ihr heute? Der Begleiter passt seine Vorschläge an. */
export function EnergyCheckin({ day }: { day: ISODate }) {
  const c = useStore((s) => s.data.checkins[day]) || {};
  const { personA, personB } = useStore((s) => s.data.settings);
  const set = useStore((s) => s.setCheckin);
  return (
    <section className="card energy">
      <div className="eyebrow">Wie geht's euch heute?</div>
      {(
        [
          ['a', personA],
          ['b', personB],
        ] as const
      ).map(([k, name]) => (
        <div key={k} className="row energy__row">
          <b className="energy__name ellipsis">{name}</b>
          <div className="chips">
            {LEVELS.map((l) => (
              <motion.button key={l.v} whileTap={{ scale: 0.85 }} className="chip" aria-pressed={c[k] === l.v} onClick={() => set(day, k, l.v)} title={energyLabel[l.v]}>
                <span aria-hidden>{l.icon}</span>
                <span className="sr-only">{energyLabel[l.v]}</span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
