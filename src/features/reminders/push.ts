import { create } from 'zustand';
import { updateDevice, useDevice } from '../../store/device';

/** Push-Erinnerungen dieses Geräts (Anmeldung beim Heimserver). */
interface PushState {
  supported: boolean;
  subscribed: boolean;
  busy: boolean;
  error: string | null;
  endpoint: string | null;
}

const ENDPOINT_KEY = 'wir-push-endpoint';
const supported = () => typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const usePush = create<PushState>(() => ({
  supported: supported(),
  subscribed: typeof localStorage !== 'undefined' && !!localStorage.getItem(ENDPOINT_KEY),
  busy: false,
  error: null,
  endpoint: typeof localStorage !== 'undefined' ? localStorage.getItem(ENDPOINT_KEY) : null,
}));

const keyBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

const deviceLabel = () => {
  const ua = navigator.userAgent;
  return /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android-Handy' : 'Android-Tablet') : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows-PC' : 'Gerät';
};

async function register(sub: PushSubscription) {
  const r = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), owner: useDevice.getState().reminderFor, label: deviceLabel() }),
  });
  if (!r.ok) throw new Error('Server hat die Anmeldung abgelehnt');
  localStorage.setItem(ENDPOINT_KEY, sub.endpoint);
  usePush.setState({ subscribed: true, endpoint: sub.endpoint, error: null });
}

export async function enablePush() {
  usePush.setState({ busy: true, error: null });
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Mitteilungen wurden nicht erlaubt – in den Browser- bzw. Systemeinstellungen freigeben.');
    const reg = await navigator.serviceWorker.ready;
    const k = await fetch('/api/push/key');
    if (!k.ok) throw new Error('Bitte zuerst mit dem Heimserver verbinden.');
    const { publicKey } = await k.json();
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    await register(sub);
  } catch (e) {
    usePush.setState({ error: (e as Error).message });
  } finally {
    usePush.setState({ busy: false });
  }
}

export async function disablePush() {
  usePush.setState({ busy: true });
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const endpoint = sub?.endpoint ?? usePush.getState().endpoint;
    await sub?.unsubscribe();
    if (endpoint) await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) }).catch(() => undefined);
  } finally {
    localStorage.removeItem(ENDPOINT_KEY);
    usePush.setState({ subscribed: false, endpoint: null, busy: false });
  }
}

export async function testPush() {
  const endpoint = usePush.getState().endpoint;
  const r = await fetch('/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) });
  if (!r.ok) throw new Error(r.status === 404 ? 'Gerät ist nicht mehr angemeldet – bitte neu einschalten.' : 'Der Push-Dienst hat nicht geantwortet.');
}

/** Wechselt „für wen“, wird die Anmeldung beim Server aktualisiert. */
export async function setReminderFor(v: 'Alle' | 'Person A' | 'Person B') {
  updateDevice({ reminderFor: v });
  if (!usePush.getState().subscribed) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await register(sub).catch(() => undefined);
}
