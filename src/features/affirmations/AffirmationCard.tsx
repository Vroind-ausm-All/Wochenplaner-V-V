import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { AFFIRMATIONS, dailyIndex, personalize } from './affirmations';
import './affirmation.css';

const ROTATE_MS = 45_000;

const ORBS = Array.from({ length: 9 }, (_, i) => ({
  size: 26 + ((i * 37) % 70),
  left: (i * 23) % 100,
  top: (i * 41) % 100,
  hue: [140, 25, 95, 270, 40][i % 5],
  dur: 14 + (i % 5) * 3,
}));

/** „Gedanke des Tages“ – animiert mit Motion: Wort-für-Wort-Einblendung, schwebende Lichter, Wischen zum Wechseln. */
export function AffirmationCard({ large }: { large?: boolean }) {
  const { personA, personB, quoteOffset } = useStore((s) => s.data.settings);
  const favorites = useStore((s) => s.data.favoriteAffirmations);
  const mutate = useStore((s) => s.mutate);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(() => dailyIndex(new Date(), quoteOffset));
  const [burst, setBurst] = useState(0);
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
  const toggleFav = () => {
    mutate((d) => {
      d.favoriteAffirmations = fav ? d.favoriteAffirmations.filter((x) => x !== a.id) : [...d.favoriteAffirmations, a.id];
    });
    if (!fav) setBurst((b) => b + 1);
  };

  return (
    <section className={`affirm ${large ? 'affirm--large' : ''}`} aria-label="Gedanke des Tages">
      <div className="affirm__orbs" aria-hidden>
        {ORBS.map((o, i) => (
          <motion.span
            key={i}
            className="affirm__orb"
            style={{ width: o.size, height: o.size, left: `${o.left}%`, top: `${o.top}%`, background: `hsl(${o.hue} 45% 70% / .35)` }}
            animate={reduce ? undefined : { x: [0, 18, -12, 0], y: [0, -14, 10, 0], scale: [1, 1.15, 0.92, 1] }}
            transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
          />
        ))}
      </div>
      <motion.div className="affirm__body" drag={reduce ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={onDragEnd}>
        <div className="row">
          <motion.span className="affirm__sun" aria-hidden animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
            ☀
          </motion.span>
          <span className="eyebrow">Unser Gedanke des Tages · {a.theme}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={a.id} className="affirm__quote" initial="hidden" animate="show" exit="exit" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.07 } }, exit: { opacity: 0, y: -10, transition: { duration: 0.25 } } }}>
            {words.map((w, i) => (
              <motion.span
                key={i}
                className="affirm__word"
                variants={{ hidden: { opacity: 0, y: 14, filter: 'blur(6px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 180, damping: 18 } } }}
              >
                {w}{' '}
              </motion.span>
            ))}
          </motion.p>
        </AnimatePresence>
        <div className="row affirm__foot">
          <button className="btn sm ghost" onClick={() => go(-1)} aria-label="Vorheriger Gedanke">
            ‹
          </button>
          <div className="affirm__progress grow" aria-hidden>
            {!reduce && <motion.span key={a.id} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }} />}
          </div>
          <button className="btn sm ghost" onClick={() => go(1)} aria-label="Nächster Gedanke">
            ›
          </button>
          <motion.button className={`affirm__heart ${fav ? 'is-fav' : ''}`} onClick={toggleFav} whileTap={{ scale: 0.8 }} aria-pressed={fav} aria-label="Als Lieblingsgedanke merken">
            {fav ? '♥' : '♡'}
            <AnimatePresence>
              {burst > 0 &&
                Array.from({ length: 6 }, (_, i) => (
                  <motion.span
                    key={`${burst}-${i}`}
                    className="affirm__spark"
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                    animate={{ opacity: 0, x: Math.cos((i / 6) * Math.PI * 2) * 34, y: Math.sin((i / 6) * Math.PI * 2) * 34, scale: 1.2 }}
                    transition={{ duration: 0.7 }}
                  >
                    ♥
                  </motion.span>
                ))}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}
