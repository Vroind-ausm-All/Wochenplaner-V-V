import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { AFFIRMATIONS, dailyIndex, personalize } from './affirmations';
import './affirmation.css';

const ROTATE_MS = 45_000;

/** „Gedanke des Tages“ – ruhig animiert mit Motion: Wörter blenden nacheinander ein, Wischen wechselt. */
export function AffirmationCard({ large }: { large?: boolean }) {
  const { personA, personB, quoteOffset } = useStore((s) => s.data.settings);
  const favorites = useStore((s) => s.data.favoriteAffirmations);
  const mutate = useStore((s) => s.mutate);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(() => dailyIndex(new Date(), quoteOffset));
  const a = AFFIRMATIONS[index];
  const words = useMemo(() => personalize(a.text, personA, personB).split(' '), [a, personA, personB]);
  const fav = favorites.includes(a.id);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % AFFIRMATIONS.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, reduce]);

  const go = (dir: number) => setIndex((i) => (i + dir + AFFIRMATIONS.length) % AFFIRMATIONS.length);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };
  const toggleFav = () =>
    mutate((d) => {
      d.favoriteAffirmations = fav ? d.favoriteAffirmations.filter((x) => x !== a.id) : [...d.favoriteAffirmations, a.id];
    });

  return (
    <section className={`affirm ${large ? 'affirm--large' : ''}`} aria-label="Gedanke des Tages">
      <motion.div className="affirm__body" drag={reduce ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={onDragEnd}>
        <span className="eyebrow">Gedanke des Tages · {a.theme}</span>
        <AnimatePresence mode="wait">
          <motion.p key={a.id} className="affirm__quote" initial="hidden" animate="show" exit="exit" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.045 } }, exit: { opacity: 0, transition: { duration: 0.2 } } }}>
            {words.map((w, i) => (
              <motion.span key={i} className="affirm__word" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } } }}>
                {w}{' '}
              </motion.span>
            ))}
          </motion.p>
        </AnimatePresence>
        <div className="row affirm__foot">
          <button className="btn sm ghost icon" onClick={() => go(-1)} aria-label="Vorheriger Gedanke">
            <Icon name="chevron-left" />
          </button>
          <div className="affirm__progress grow" aria-hidden>
            {!reduce && <motion.span key={a.id} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }} />}
          </div>
          <button className="btn sm ghost icon" onClick={() => go(1)} aria-label="Nächster Gedanke">
            <Icon name="chevron-right" />
          </button>
          <button className={`btn sm ghost icon affirm__heart ${fav ? 'is-fav' : ''}`} onClick={toggleFav} aria-pressed={fav} aria-label="Als Lieblingsgedanke merken">
            <Icon name="heart" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
