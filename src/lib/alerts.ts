import type { Location } from '../store/types';

/**
 * Amtliche Unwetterwarnungen des Deutschen Wetterdienstes über Bright Sky (api.brightsky.dev, frei, ohne Konto).
 * Die Felder werden tolerant gelesen, damit kleine Formatänderungen nicht zum Ausfall führen.
 */
export type Severity = 'minor' | 'moderate' | 'severe' | 'extreme';

export interface WeatherAlert {
  id: string;
  severity: Severity;
  event: string;
  headline: string;
  description: string;
  instruction: string;
  onset: number; // ms
  expires: number | null;
  region: string;
}

export const SEVERITY: Record<Severity, { rank: number; label: string; color: string }> = {
  minor: { rank: 1, label: 'Wetterwarnung', color: '#e8c547' },
  moderate: { rank: 2, label: 'Markante Wetterwarnung', color: '#e8913a' },
  severe: { rank: 3, label: 'Unwetterwarnung', color: '#d9452f' },
  extreme: { rank: 4, label: 'Extreme Unwetterwarnung', color: '#8e1c6e' },
};

const str = (...v: unknown[]) => (v.find((x) => typeof x === 'string' && x.trim()) as string | undefined)?.trim() ?? '';
const time = (v: unknown) => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

export function normalizeAlerts(json: unknown): WeatherAlert[] {
  const j = (json ?? {}) as { alerts?: unknown[]; location?: Record<string, unknown> };
  const region = str(j.location?.name, j.location?.district, j.location?.name_short);
  const list = Array.isArray(j.alerts) ? j.alerts : [];
  return list
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    // Übungs- und Testmeldungen nie anzeigen
    .filter((a) => !['test', 'exercise'].includes(str(a.status).toLowerCase()))
    .map((a, i) => {
      const sev = str(a.severity).toLowerCase() as Severity;
      return {
        id: str(a.alert_id, a.id != null ? String(a.id) : '', `alert-${i}`),
        severity: SEVERITY[sev] ? sev : 'minor',
        event: str(a.event_de, a.event_en, a.event),
        headline: str(a.headline_de, a.headline_en, a.headline),
        description: str(a.description_de, a.description_en, a.description),
        instruction: str(a.instruction_de, a.instruction_en, a.instruction),
        onset: time(a.onset) ?? time(a.effective) ?? Date.now(),
        expires: time(a.expires),
        region,
      };
    })
    .filter((a) => a.event || a.headline);
}

/** Gerade gültige oder in den nächsten `withinH` Stunden beginnende Warnungen, schwerste zuerst. */
export function relevantAlerts(alerts: WeatherAlert[], now = Date.now(), withinH = 24) {
  return alerts
    .filter((a) => (a.expires === null || a.expires > now) && a.onset <= now + withinH * 3600_000)
    .sort((a, b) => SEVERITY[b.severity].rank - SEVERITY[a.severity].rank || a.onset - b.onset);
}

/** Überschneidet sich eine Warnung mit einem Zeitraum? */
export const alertCovers = (a: WeatherAlert, start: number, end: number) => a.onset < end && (a.expires === null || a.expires > start);

export async function fetchAlerts(loc: Location, viaServer: boolean, signal?: AbortSignal): Promise<WeatherAlert[]> {
  const q = new URLSearchParams({ lat: String(loc.latitude), lon: String(loc.longitude) });
  const direct = () => fetch(`https://api.brightsky.dev/alerts?${q}`, { signal });
  let r: Response;
  try {
    r = await direct();
  } catch (e) {
    // Direkter Abruf blockiert (z. B. Netzwerkregeln) → über den Heimserver
    if (!viaServer) throw e;
    r = await fetch(`/api/alerts?${q}`, { signal });
  }
  if (!r.ok) throw new Error(`Warndienst antwortet nicht (${r.status})`);
  return normalizeAlerts(await r.json());
}
