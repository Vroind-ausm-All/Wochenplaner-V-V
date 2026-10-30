// Fotoablage für den Bildschirmschoner. Fotos kommen bereits verkleinert aus dem Browser (max. 2048 px).
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS = 2000;

/** Bildformat anhand der ersten Bytes – der angegebene Typ allein reicht nicht. */
export function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export function createPhotoStore(dataDir) {
  const dir = join(dataDir, 'photos');
  const metaFile = join(dir, 'photos.json');
  mkdirSync(dir, { recursive: true });
  /** @type {{ id: string, ext: string, type: string, size: number, w: number, h: number, createdAt: string, caption: string }[]} */
  let list = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : [];
  const save = () => {
    writeFileSync(`${metaFile}.tmp`, JSON.stringify(list));
    renameSync(`${metaFile}.tmp`, metaFile);
  };
  const fileOf = (p) => join(dir, `${p.id}.${p.ext}`);

  return {
    list: () => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    get(id) {
      const p = list.find((x) => x.id === id);
      return p && existsSync(fileOf(p)) ? { ...p, file: fileOf(p), size: statSync(fileOf(p)).size } : null;
    },
    add(buf, { w = 0, h = 0, caption = '' } = {}) {
      const kind = sniff(buf);
      if (!kind) throw Object.assign(new Error('Nur JPEG, PNG oder WebP'), { status: 415 });
      if (list.length >= MAX_PHOTOS) throw Object.assign(new Error(`Höchstens ${MAX_PHOTOS} Fotos – bitte ältere löschen`), { status: 409 });
      const p = { id: randomBytes(9).toString('base64url'), ...kind, size: buf.length, w: Math.max(0, Math.round(w) || 0), h: Math.max(0, Math.round(h) || 0), createdAt: new Date().toISOString(), caption: String(caption).slice(0, 120) };
      writeFileSync(fileOf(p), buf);
      list.push(p);
      save();
      return p;
    },
    remove(id) {
      const p = list.find((x) => x.id === id);
      if (!p) return false;
      rmSync(fileOf(p), { force: true });
      list = list.filter((x) => x.id !== id);
      save();
      return true;
    },
  };
}
