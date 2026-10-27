import { useEffect } from 'react';
import { create } from 'zustand';
import { cachedForecast, DEFAULT_LOCATION, fetchForecast, isStale, type Forecast } from '../../lib/weather';
import { useStore } from '../../store/store';

interface WeatherState {
  forecast: Forecast | null;
  loading: boolean;
  error: string | null;
}

export const useWeatherStore = create<WeatherState>(() => ({ forecast: null, loading: false, error: null }));

let timer: ReturnType<typeof setInterval> | undefined;

/** Einmal in der App einbinden: lädt beim Start und danach alle 30 Minuten. */
export function useWeatherUpdater() {
  const location = useStore((s) => s.data.settings.location) ?? DEFAULT_LOCATION;
  useEffect(() => {
    const ctrl = new AbortController();
    const cached = cachedForecast(location);
    useWeatherStore.setState({ forecast: cached });
    const load = async () => {
      if (!isStale(useWeatherStore.getState().forecast)) return;
      useWeatherStore.setState({ loading: true });
      try {
        useWeatherStore.setState({ forecast: await fetchForecast(location, ctrl.signal), error: null });
      } catch (e) {
        if (!ctrl.signal.aborted) useWeatherStore.setState({ error: e instanceof Error ? e.message : 'Wetter nicht verfügbar' });
      } finally {
        useWeatherStore.setState({ loading: false });
      }
    };
    void load();
    clearInterval(timer);
    timer = setInterval(load, 5 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [location.latitude, location.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
}

export const useForecast = () => useWeatherStore((s) => s.forecast);
export const useDayWeather = (date: string) => useWeatherStore((s) => s.forecast?.daily.find((d) => d.date === date));
