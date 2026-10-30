import type { PlannerData } from './types';
import { DEFAULT_SETTINGS, WOCHENKOMPASS, seed } from './defaults';

export const STORAGE_KEY = 'wir-wochenplaner-v1';
/** Schlüssel des alten Single-File-Boards (WIR 4–9). */
export const LEGACY_KEY = 'wir-board-4-v1';

const arrays = ['events', 'shopping', 'inventory', 'tasks', 'documents', 'baby', 'favoriteAffirmations', 'favoriteRecipes', 'calendars'] as const;

/**
 * Bringt beliebige gespeicherte Stände (altes Board, Export-Datei, Server) in die aktuelle Form.
 * Unbekannte Felder bleiben erhalten, fehlende werden ergänzt.
 */
export function normalize(raw: unknown): PlannerData {
  const base = seed();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Partial<PlannerData> & Record<string, unknown>;
  const out = { ...base, ...d } as PlannerData;
  for (const k of arrays) if (!Array.isArray(d[k])) (out as unknown as Record<string, unknown>)[k] = k === 'events' || k === 'shopping' ? [] : base[k];
  if (!d.meals || typeof d.meals !== 'object') out.meals = {};
  if (!d.checkins || typeof d.checkins !== 'object') out.checkins = {};
  if (!d.dismissed || typeof d.dismissed !== 'object') out.dismissed = {};
  if (!Array.isArray(d.checks)) out.checks = WOCHENKOMPASS.map(() => false);
  out.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  out.events = out.events.map((e) => ({
    ...e,
    duration: Number(e.duration) || 60,
    time: e.time || '12:00',
    repeat: e.repeat || 'none',
    reminder: e.reminder || 'none',
    owner: e.owner || 'Beide',
    category: e.category || 'Termin',
    allDay: !!e.allDay,
  }));
  return out;
}

export function isValidBackup(v: unknown): boolean {
  return !!v && typeof v === 'object' && Array.isArray((v as PlannerData).events) && Array.isArray((v as PlannerData).shopping);
}

/** Lädt den lokalen Stand; beim ersten Start wird das alte Board automatisch übernommen. */
export function loadLocal(storage: Pick<Storage, 'getItem'> = localStorage): { data: PlannerData; migrated: boolean } {
  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current) return { data: normalize(JSON.parse(current)), migrated: false };
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) return { data: normalize(JSON.parse(legacy)), migrated: true };
  } catch {
    /* defekter Speicher → Neustart mit Beispieldaten */
  }
  return { data: seed(), migrated: false };
}
