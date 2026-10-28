import { useMemo } from 'react';
import { useNow, useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { useWeatherStore } from '../weather/useWeather';
import { addDays, monday } from '../../lib/date';
import { externalBetween, useExternalStore } from '../external/useExternal';
import { analyze } from './engine';

export function useCompanion() {
  const data = useStore((s) => s.data);
  const today = useToday();
  const now = useNow();
  const weather = useWeatherStore((s) => s.forecast?.daily);
  const cache = useExternalStore((s) => s.cache);
  // Viertelstündlich neu bewerten reicht – und hält Vorschläge stabil.
  const quarter = now.slice(0, 3) + String(Math.floor(Number(now.slice(3)) / 15) * 15).padStart(2, '0');
  return useMemo(() => {
    const week = monday(today);
    return analyze({ data, today, now: quarter, weather, external: externalBetween(data, cache, week, addDays(week, 6)) });
  }, [data, today, quarter, weather, cache]);
}
