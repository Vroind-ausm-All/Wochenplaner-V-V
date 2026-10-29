import { useEffect } from 'react';
import { create } from 'zustand';
import { fetchAlerts, relevantAlerts, type WeatherAlert } from '../../lib/alerts';
import { useClockStore } from '../../lib/useClock';
import { DEFAULT_LOCATION } from '../../lib/weather';
import { useStore } from '../../store/store';
import { useSync } from '../../store/sync';

interface AlertState {
  alerts: WeatherAlert[];
  fetchedAt: number;
  error: string | null;
}

const KEY = 'wir-alerts-v1';
const load = (): AlertState => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s?.alerts) return { ...s, error: null };
  } catch {
    /* ignorieren */
  }
  return { alerts: [], fetchedAt: 0, error: null };
};

export const useAlertStore = create<AlertState>(() => (typeof localStorage === 'undefined' ? { alerts: [], fetchedAt: 0, error: null } : load()));

/** Einmal in der App einbinden: holt Warnungen beim Start und alle 15 Minuten. */
export function useAlertUpdater() {
  const location = useStore((s) => s.data.settings.location) ?? DEFAULT_LOCATION;
  const connected = useSync((s) => s.connected);
  useEffect(() => {
    const ctrl = new AbortController();
    const run = async () => {
      try {
        const alerts = await fetchAlerts(location, connected, ctrl.signal);
        const next = { alerts, fetchedAt: Date.now(), error: null };
        useAlertStore.setState(next);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignorieren */
        }
      } catch (e) {
        if (!ctrl.signal.aborted) useAlertStore.setState({ error: e instanceof TypeError ? 'Warndienst gerade nicht erreichbar' : (e as Error).message });
      }
    };
    void run();
    const t = setInterval(run, 15 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(t);
    };
  }, [location.latitude, location.longitude, connected]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Aktuelle Warnungen (minütlich neu bewertet). */
export function useActiveAlerts(withinH = 24) {
  const alerts = useAlertStore((s) => s.alerts);
  useClockStore((c) => c.now);
  return relevantAlerts(alerts, Date.now(), withinH);
}
