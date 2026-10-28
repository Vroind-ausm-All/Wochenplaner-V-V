import { create } from 'zustand';
import { merge3, equal } from './merge';
import { normalize } from './migrate';
import { useStore, syncHooks } from './store';
import type { PlannerData } from './types';

/**
 * Abgleich mit dem Heimserver (server/server.mjs, kompatibel zum Familienserver des alten Boards).
 *
 * Jedes Gerät merkt sich den zuletzt mit dem Server abgestimmten Stand (`base`) samt Revision.
 * Lokale Änderungen werden sofort gesendet; hat inzwischen ein anderes Gerät gespeichert,
 * antwortet der Server mit 409 und dem neuen Stand. Dann werden beide Seiten per Drei-Wege-Abgleich
 * zusammengeführt (siehe merge.ts) und erneut gesendet – es geht nichts verloren.
 * Ohne Verbindung sammeln sich Änderungen lokal und werden beim nächsten Kontakt nachgeholt.
 */
export interface SyncState {
  /** Ein Heimserver antwortet unter dieser Adresse */
  available: boolean;
  /** angemeldet und abgeglichen */
  connected: boolean;
  needsLogin: boolean;
  /** Live-Verbindung steht */
  online: boolean;
  /** Lokale Änderungen, die der Server noch nicht kennt */
  pending: boolean;
  revision: number;
  lastSync: number | null;
  error: string | null;
  /** Stand dieses Geräts vor der ersten Verbindung (als Sicherung) */
  hasPreSyncBackup: boolean;
}

const META_KEY = 'wir-sync-v1';
const PRE_SYNC_KEY = 'wir-vor-sync';

interface Meta {
  base: PlannerData | null;
  revision: number;
  pending: boolean;
  lastSync: number | null;
}

const readMeta = (): Meta => {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    if (m && typeof m.revision === 'number') return m;
  } catch {
    /* ignorieren */
  }
  return { base: null, revision: 0, pending: false, lastSync: null };
};

let meta = typeof localStorage === 'undefined' ? { base: null, revision: 0, pending: false, lastSync: null } : readMeta();
const hasBackup = () => {
  try {
    return !!localStorage.getItem(PRE_SYNC_KEY);
  } catch {
    return false;
  }
};

export const useSync = create<SyncState>(() => ({
  available: false,
  connected: false,
  needsLogin: false,
  online: false,
  pending: meta.pending,
  revision: meta.revision,
  lastSync: meta.lastSync,
  error: null,
  hasPreSyncBackup: typeof localStorage !== 'undefined' && hasBackup(),
}));

function setMeta(p: Partial<Meta>) {
  meta = { ...meta, ...p };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* Speicher voll – Abgleich läuft trotzdem weiter */
  }
  useSync.setState({ pending: meta.pending, revision: meta.revision, lastSync: meta.lastSync });
}

let applyingRemote = false;
function applyLocal(state: unknown) {
  applyingRemote = true;
  useStore.getState().replaceAll(state, { silent: true });
  applyingRemote = false;
}
const local = () => useStore.getState().data;

// Alle Serverzugriffe laufen nacheinander – so überholen sich Senden und Abholen nie.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = (fn: () => Promise<void>) => (queue = queue.then(fn, fn).catch(() => undefined));

let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 2000;
function retryLater() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    enqueue(pull);
    enqueue(flush);
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 30_000);
}

function lostSession() {
  useSync.setState({ connected: false, needsLogin: true, online: false });
  events?.close();
  events = null;
}

/** Ungesendete lokale Änderungen an den Server schicken. */
async function flush() {
  if (!useSync.getState().connected || !meta.pending) return;
  const sent = structuredClone(local());
  let r: Response;
  try {
    r = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: sent, revision: meta.revision }) });
  } catch {
    useSync.setState({ online: false, error: 'Keine Verbindung – Änderungen werden nachgeholt.' });
    return retryLater();
  }
  if (r.status === 401) return lostSession();
  if (r.status === 409) {
    const j = await r.json();
    reconcile(normalize(j.state), j.revision);
    return flush();
  }
  if (!r.ok) {
    useSync.setState({ error: `Server meldet Fehler ${r.status}` });
    return retryLater();
  }
  const j = await r.json();
  retryDelay = 2000;
  // Während des Sendens weiter bearbeitet? Dann bleibt der Rest „ausstehend“.
  setMeta({ base: sent, revision: j.revision, pending: !equal(local(), sent), lastSync: Date.now() });
  useSync.setState({ error: null, online: true });
  if (meta.pending) enqueue(flush);
}

/** Stand anderer Geräte holen und einarbeiten. */
async function pull() {
  if (!useSync.getState().connected) return;
  let r: Response;
  try {
    r = await fetch('/api/state');
  } catch {
    useSync.setState({ online: false });
    return retryLater();
  }
  if (r.status === 401) return lostSession();
  if (!r.ok) return;
  const j = await r.json();
  if (j.revision === meta.revision) return;
  if (!j.state) return setMeta({ revision: j.revision, pending: true });
  reconcile(normalize(j.state), j.revision);
}

/** Serverstand mit dem lokalen Stand zusammenführen. */
function reconcile(remote: PlannerData, revision: number) {
  if (!meta.pending || !meta.base) {
    applyLocal(remote);
    setMeta({ base: remote, revision, pending: false, lastSync: Date.now() });
    return;
  }
  const merged = normalize(merge3(meta.base, local(), remote));
  applyLocal(merged);
  setMeta({ base: remote, revision, pending: !equal(merged, remote), lastSync: Date.now() });
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
syncHooks.add(() => {
  if (applyingRemote) return;
  if (!meta.pending) setMeta({ pending: true });
  if (!useSync.getState().connected) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => enqueue(flush), 300);
});

let events: EventSource | null = null;
function listen() {
  events?.close();
  events = new EventSource('/api/events');
  events.addEventListener('open', () => useSync.setState({ online: true, error: null }));
  // „hello“ kommt nach jedem (Wieder-)Verbinden: verpasste Änderungen holen, eigene nachreichen.
  events.addEventListener('hello', () => {
    enqueue(pull);
    enqueue(flush);
  });
  events.addEventListener('update', (e) => {
    const rev = JSON.parse((e as MessageEvent).data || '{}').revision;
    if (rev !== meta.revision) enqueue(pull);
  });
  events.addEventListener('error', () => useSync.setState({ online: false }));
}

/** Erstverbindung bzw. Wiederaufnahme nach Neustart der App. */
async function adopt() {
  const st = await fetch('/api/state');
  if (st.status === 401) {
    useSync.setState({ needsLogin: true, connected: false });
    return;
  }
  if (!st.ok) throw new Error('Daten nicht abrufbar');
  const j = await st.json();
  useSync.setState({ connected: true, needsLogin: false, online: true, error: null });
  if (meta.base) {
    // Dieses Gerät war schon verbunden: Offline-Änderungen behalten und abgleichen.
    if (j.state) reconcile(normalize(j.state), j.revision);
    else setMeta({ revision: j.revision, pending: true });
  } else if (j.state) {
    // Neues Gerät: gemeinsamen Stand übernehmen, bisherigen Gerätestand sichern.
    try {
      localStorage.setItem(PRE_SYNC_KEY, JSON.stringify(local()));
      useSync.setState({ hasPreSyncBackup: true });
    } catch {
      /* ignorieren */
    }
    applyLocal(j.state);
    setMeta({ base: normalize(j.state), revision: j.revision, pending: false, lastSync: Date.now() });
  } else {
    // Leerer Server: dieses Gerät bringt den ersten Stand mit.
    setMeta({ revision: j.revision, pending: true });
  }
  listen();
  enqueue(flush);
}

export async function discoverServer() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return;
    useSync.setState({ available: true });
    await enqueue(adopt);
  } catch {
    /* kein Server – lokaler Modus */
  }
}

export async function connect(password: string) {
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (r.status === 429) throw new Error('Zu viele Versuche – bitte 15 Minuten warten.');
  if (!r.ok) throw new Error('Passwort stimmt nicht');
  await enqueue(adopt);
  if (!useSync.getState().connected) throw new Error('Anmeldung fehlgeschlagen');
}

export async function disconnect() {
  await fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
  events?.close();
  events = null;
  useSync.setState({ connected: false, needsLogin: true, online: false });
}

export function downloadPreSyncBackup() {
  const raw = localStorage.getItem(PRE_SYNC_KEY);
  if (!raw) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  a.download = 'wir-geraetestand-vor-verbindung.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    enqueue(pull);
    enqueue(flush);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') enqueue(pull);
  });
}
