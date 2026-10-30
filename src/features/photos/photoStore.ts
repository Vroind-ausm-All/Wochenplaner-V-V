import { create } from 'zustand';
import { shrinkImage } from '../../lib/image';
import { uid } from '../../lib/id';
import { useSync } from '../../store/sync';

/**
 * Fotos für den Bildschirmschoner. Mit Heimserver liegen sie dort (alle Geräte sehen dieselben, z. B. vom Handy
 * hochgeladen und am Bilderrahmen gezeigt). Ohne Server bleiben sie lokal auf diesem Gerät (IndexedDB).
 */
export interface Photo {
  id: string;
  w: number;
  h: number;
  createdAt: string;
  url: string;
  local?: boolean;
}

interface PhotoState {
  photos: Photo[];
  loading: boolean;
  uploading: number;
  error: string | null;
}

export const usePhotos = create<PhotoState>(() => ({ photos: [], loading: false, uploading: 0, error: null }));

// ---- lokale Ablage ---------------------------------------------------------------------------
interface LocalPhoto {
  id: string;
  blob: Blob;
  w: number;
  h: number;
  createdAt: string;
}

function db(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open('wir-fotos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((ok, fail) => {
    const r = fn(d.transaction('photos', mode).objectStore('photos'));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

const objectUrls = new Map<string, string>();
const localUrl = (p: LocalPhoto) => {
  if (!objectUrls.has(p.id)) objectUrls.set(p.id, URL.createObjectURL(p.blob));
  return objectUrls.get(p.id)!;
};

// ---- gemeinsame Funktionen -------------------------------------------------------------------
const viaServer = () => useSync.getState().connected;

export async function loadPhotos() {
  usePhotos.setState({ loading: true });
  try {
    if (viaServer()) {
      const r = await fetch('/api/photos');
      if (!r.ok) throw new Error('Fotos nicht abrufbar');
      const { photos } = (await r.json()) as { photos: Omit<Photo, 'url'>[] };
      usePhotos.setState({ photos: photos.map((p) => ({ ...p, url: `/api/photos/${p.id}` })), error: null });
    } else {
      const list = (await tx('readonly', (s) => s.getAll())) as LocalPhoto[];
      usePhotos.setState({
        photos: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => ({ id: p.id, w: p.w, h: p.h, createdAt: p.createdAt, url: localUrl(p), local: true })),
        error: null,
      });
    }
  } catch (e) {
    usePhotos.setState({ error: (e as Error).message });
  } finally {
    usePhotos.setState({ loading: false });
  }
}

export async function addPhotos(files: FileList | File[]) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
  usePhotos.setState((s) => ({ uploading: s.uploading + list.length, error: null }));
  let failed = 0;
  for (const f of list) {
    try {
      const { blob, w, h } = await shrinkImage(f);
      if (viaServer()) {
        const r = await fetch(`/api/photos?w=${w}&h=${h}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? 'Hochladen fehlgeschlagen');
      } else {
        await tx('readwrite', (s) => s.put({ id: uid(), blob, w, h, createdAt: new Date().toISOString() } satisfies LocalPhoto));
      }
    } catch (e) {
      failed++;
      usePhotos.setState({ error: (e as Error).message });
    } finally {
      usePhotos.setState((s) => ({ uploading: s.uploading - 1 }));
    }
  }
  await loadPhotos();
  return { added: list.length - failed, failed };
}

export async function removePhoto(p: Photo) {
  if (p.local) {
    await tx('readwrite', (s) => s.delete(p.id));
    const u = objectUrls.get(p.id);
    if (u) URL.revokeObjectURL(u);
    objectUrls.delete(p.id);
  } else {
    await fetch(`/api/photos/${p.id}`, { method: 'DELETE' });
  }
  await loadPhotos();
}

if (typeof window !== 'undefined') window.addEventListener('wir:photos', () => void loadPhotos());
