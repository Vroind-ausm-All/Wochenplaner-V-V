import { useStore } from '../../store/store';
import type { Energy, ISODate } from '../../store/types';
import { Icon, OwnerMark, type IconName } from '../../ui/Icon';
import { energyLabel } from './engine';

const LEVELS: { v: Energy; icon: IconName }[] = [
  { v: 1, icon: 'battery-low' },
  { v: 2, icon: 'battery-mid' },
  { v: 3, icon: 'battery-full' },
];

/** Täglicher Mini-Check-in: Wie viel Energie habt ihr heute? Der Begleiter passt seine Vorschläge an. */
export function EnergyCheckin({ day }: { day: ISODate }) {
  const c = useStore((s) => s.data.checkins[day]) || {};
  const { personA, personB } = useStore((s) => s.data.settings);
  const set = useStore((s) => s.setCheckin);
  return (
    <section className="card energy">
      <span className="eyebrow">Wie geht's euch heute?</span>
      {(
        [
          ['a', 'Person A', personA],
          ['b', 'Person B', personB],
        ] as const
      ).map(([k, o, name]) => (
        <div key={k} className="row energy__row">
          <span className="energy__name">
            <OwnerMark owner={o} size={12} />
            <b className="ellipsis">{name}</b>
          </span>
          <div className="chips">
            {LEVELS.map((l) => (
              <button key={l.v} className="chip energy__chip" aria-pressed={c[k] === l.v} onClick={() => set(day, k, l.v)} title={energyLabel[l.v]}>
                <Icon name={l.icon} size={20} />
                <span className="sr-only">{energyLabel[l.v]}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
