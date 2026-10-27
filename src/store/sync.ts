import { create } from 'zustand';
import { useStore, syncHooks } from './store';
import type { PlannerData } from './types';

/**
 * Optionaler Abgleich mit dem Familienserver des alten Boards.
 * Protokoll unverändert: GET /api/status, POST /api/login, GET|PUT /api/state (mit Revision), SSE /api/events.
 */
interface SyncState {
  available: boolean;
  connected: boolean;
  revision: number;
  error: string | null;
}

export const useSync = create<SyncState>(() => ({ available: false, connected: false, revision: 0, error: null }));

let applyingRemote = false;
let sending: Promise<void> = Promise.resolve();
let events: EventSource | null = null;

function applyRemote(state: unknown, revision: number) {
  applyingRemote = true;
  useStore.getState().replaceAll(state, { silent: true });
  applyingRemote = false;
  useSync.setState({ revision });
}

function push(data: PlannerData) {
  const state = structuredClone(data);
  sending = sending.then(async () => {
    try {
      const r = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, revision: useSync.getState().revision }),
      });
      if (r.status === 409) {
        // Jemand anderes war schneller: Serverstand übernehmen.
        const j = await r.json();
        applyRemote(j.state, j.revision);
        useStore.getState().notify('Änderung von einem anderen Gerät übernommen');
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      useSync.setState({ revision: j.revision ?? useSync.getState().revision + 1, error: null });
    } catch {
      useSync.setState({ error: 'Synchronisierung fehlgeschlagen – Änderungen bleiben lokal gespeichert.' });
    }
  });
}

syncHooks.add((d) => {
  if (useSync.getState().connected && !applyingRemote) push(d);
});

function listen() {
  events?.close();
  events = new EventSource('/api/events');
  events.addEventListener('update', async () => {
    try {
      await sending;
      const r = await fetch('/api/state');
      if (!r.ok) return;
      const j = await r.json();
      if (j.revision > useSync.getState().revision) applyRemote(j.state, j.revision);
    } catch {
      /* nächster Versuch beim nächsten Ereignis */
    }
  });
}

async function adopt() {
  const st = await fetch('/api/state');
  if (!st.ok) throw new Error('Daten nicht abrufbar');
  const j = await st.json();
  useSync.setState({ connected: true, error: null, revision: j.revision ?? 0 });
  if (j.state) applyRemote(j.state, j.revision);
  else push(useStore.getState().data);
  listen();
}

export async function discoverServer() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return;
    useSync.setState({ available: true });
    await adopt().catch(() => undefined); // Sitzung evtl. noch gültig
  } catch {
    /* kein Server – lokaler Modus */
  }
}

export async function connect(password: string) {
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (!r.ok) throw new Error('Anmeldung fehlgeschlagen');
  await adopt();
}
