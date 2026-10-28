import { useEffect, useState } from 'react';
import { toMinutes } from '../lib/date';
import { useNow } from '../lib/useClock';
import { useDevice } from '../store/device';

/** Nachtmodus nach Zeitplan, Abdunkeln bei Inaktivität und „Bildschirm dunkel“ mit Tippen zum Aufwecken. */
export function useKiosk() {
  const s = useDevice();
  const now = useNow();
  const [dimmed, setDimmed] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [manualNight, setManualNight] = useState<boolean | null>(null);

  const n = toMinutes(now), from = toMinutes(s.nightFrom), to = toMinutes(s.nightTo);
  const scheduled = s.nightMode && (from > to ? n >= from || n < to : n >= from && n < to);
  const night = manualNight ?? scheduled;

  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
  }, [night]);
  useEffect(() => setManualNight(null), [scheduled]);

  useEffect(() => {
    if (!s.dimAfterMinutes) return;
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setDimmed(false);
      clearTimeout(t);
      t = setTimeout(() => setDimmed(true), s.dimAfterMinutes * 60_000);
    };
    wake();
    const evs = ['pointerdown', 'keydown', 'wheel'];
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [s.dimAfterMinutes]);

  return { night, dimmed, sleeping, setSleeping, toggleNight: () => setManualNight(!night), wake: () => { setDimmed(false); setSleeping(false); } };
}
