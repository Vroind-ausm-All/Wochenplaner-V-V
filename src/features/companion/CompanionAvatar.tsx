import { motion, useReducedMotion } from 'motion/react';
import type { Mood } from './engine';

const COLORS: Record<Mood, [string, string]> = {
  calm: ['#9cc3a4', '#608369'],
  happy: ['#f3c58f', '#e2a66f'],
  celebrate: ['#f5a3a0', '#e07a73'],
  concerned: ['#b9c4e0', '#7d8fbf'],
  sleepy: ['#8d99b8', '#4f5c7c'],
};
const MOUTH: Record<Mood, string> = {
  calm: 'M40 66 Q50 72 60 66',
  happy: 'M38 64 Q50 78 62 64',
  celebrate: 'M36 62 Q50 84 64 62 Z',
  concerned: 'M40 70 Q50 66 60 70',
  sleepy: 'M44 68 Q50 70 56 68',
};

/** „Wiri“ – der kleine WIR-Begleiter. Atmet, blinzelt, reagiert auf die Wochenlage. */
export function CompanionAvatar({ mood, size = 96, onTap }: { mood: Mood; size?: number; onTap?: () => void }) {
  const reduce = useReducedMotion();
  const [c1, c2] = COLORS[mood];
  const sleepy = mood === 'sleepy';
  return (
    <motion.button
      type="button"
      className="avatar"
      onClick={onTap}
      aria-label="WIR-Begleiter"
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.9, rotate: -6 }}
      animate={reduce ? undefined : mood === 'celebrate' ? { y: [0, -8, 0], rotate: [0, -4, 4, 0] } : { scale: [1, 1.04, 1] }}
      transition={{ duration: mood === 'celebrate' ? 1.6 : 4.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <radialGradient id={`g-${mood}`} cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset=".35" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </radialGradient>
        </defs>
        <motion.path
          d="M50 6 C76 6 94 24 94 50 C94 76 76 94 50 94 C24 94 6 76 6 50 C6 24 24 6 50 6 Z"
          fill={`url(#g-${mood})`}
          animate={reduce ? undefined : { d: ['M50 6 C76 6 94 24 94 50 C94 76 76 94 50 94 C24 94 6 76 6 50 C6 24 24 6 50 6 Z', 'M50 8 C78 4 96 26 92 52 C90 78 74 96 48 92 C22 90 4 74 8 48 C10 22 26 10 50 8 Z', 'M50 6 C76 6 94 24 94 50 C94 76 76 94 50 94 C24 94 6 76 6 50 C6 24 24 6 50 6 Z'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Wangen */}
        <circle cx="28" cy="60" r="6" fill="#fff" opacity=".25" />
        <circle cx="72" cy="60" r="6" fill="#fff" opacity=".25" />
        {/* Augen: blinzeln alle paar Sekunden */}
        {[36, 64].map((x) => (
          <motion.ellipse
            key={x}
            cx={x}
            cy={sleepy ? 50 : 46}
            rx="5"
            ry={sleepy ? 1.4 : 6}
            fill="#23382b"
            style={{ originY: '46px' }}
            animate={reduce || sleepy ? undefined : { scaleY: [1, 1, 0.1, 1] }}
            transition={{ duration: 4.2, times: [0, 0.9, 0.95, 1], repeat: Infinity, delay: x === 64 ? 0.03 : 0 }}
          />
        ))}
        <motion.path d={MOUTH[mood]} stroke="#23382b" strokeWidth="3.5" strokeLinecap="round" fill={mood === 'celebrate' ? '#23382b' : 'none'} initial={false} animate={{ d: MOUTH[mood] }} />
        {sleepy && (
          <motion.text x="74" y="24" fontSize="14" fill="#fff" animate={reduce ? undefined : { y: [24, 14], opacity: [1, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
            z
          </motion.text>
        )}
      </svg>
    </motion.button>
  );
}
