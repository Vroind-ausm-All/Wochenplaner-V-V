import { motion } from 'motion/react';
import { isValidElement, useId, type ReactNode } from 'react';
import { Icon } from './Icon';

type Opt<T> = { value: T; label: string; icon?: string | ReactNode };

const OptIcon = ({ icon }: { icon: Opt<unknown>['icon'] }) =>
  icon == null ? null : isValidElement(icon) || typeof icon !== 'string' ? <>{icon}</> : <Icon name={icon} size={18} />;

interface Props<T extends string> {
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  label?: string;
}

/** Umschalter: gewählt = gefüllt, die Fläche gleitet ruhig mit (Motion layoutId). */
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  const id = useId();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.span layoutId={`seg-${id}`} className="seg-bg" transition={{ duration: 0.18, ease: 'easeOut' }} />}
          <span className="seg-label">
            <OptIcon icon={o.icon} />
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Auswahl-Chips für Formulare (statt kleiner Selectboxen – besser für Touch). */
export function Chips<T extends string | number>({ value, options, onChange }: { value: T; options: Opt<T>[]; onChange: (v: T) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          <OptIcon icon={o.icon} />
          {o.label}
        </button>
      ))}
    </div>
  );
}
