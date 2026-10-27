import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { nowTime, today } from './date';

/** Gemeinsamer Minutentakt für Uhr, „Jetzt“-Linie, Nachtmodus und Begleiter. */
export const useClockStore = create(() => ({ today: today(), now: nowTime(), date: new Date() }));

let started = false;
export function startClock() {
  if (started) return;
  started = true;
  const tick = () => useClockStore.setState({ today: today(), now: nowTime(), date: new Date() });
  setInterval(tick, 15_000);
  document.addEventListener('visibilitychange', tick);
}

export const useToday = () => useClockStore((s) => s.today);
export const useNow = () => useClockStore((s) => s.now);

/** Sekundengenaue Uhr nur für die große Anzeige. */
export function useSeconds() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return d;
}
