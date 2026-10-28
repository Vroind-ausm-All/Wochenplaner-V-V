/**
 * Drei-Wege-Abgleich zweier Datenstände mit gemeinsamem Ausgangspunkt (`base`).
 *
 * Grundregel je Wert: Wer etwas gegenüber `base` geändert hat, gewinnt. Haben beide Seiten
 * dasselbe Feld unterschiedlich geändert, gewinnt `local` – das ist die Änderung, die auf
 * diesem Gerät gerade gemacht wurde. Dadurch gehen gleichzeitige Änderungen an *verschiedenen*
 * Einträgen (Handy hakt Milch ab, Tablet plant ein Abendessen) nie verloren.
 *
 *  - Objekte werden schlüsselweise abgeglichen (Essensplan je Tag/Mahlzeit, Einstellungen, Check-ins …).
 *  - Listen mit `id` (Termine, Einkauf, Aufgaben …) werden eintragsweise abgeglichen.
 *    Löscht eine Seite einen Eintrag, den die andere geändert hat, bleibt er erhalten.
 *  - Listen aus einfachen Werten (Favoriten) werden wie Mengen behandelt.
 */

type Json = unknown;
type Obj = Record<string, Json>;

const isObj = (v: Json): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasIds = (a: Json[]) => a.length > 0 && a.every((x) => isObj(x) && typeof x.id === 'string');

export function equal(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as Json[];
    return a.length === bb.length && a.every((x, i) => equal(x, bb[i]));
  }
  const ak = Object.keys(a as Obj).filter((k) => (a as Obj)[k] !== undefined);
  const bk = Object.keys(b as Obj).filter((k) => (b as Obj)[k] !== undefined);
  return ak.length === bk.length && ak.every((k) => equal((a as Obj)[k], (b as Obj)[k]));
}

export function merge3<T>(base: T, local: T, remote: T): T {
  return mergeValue(base, local, remote) as T;
}

function mergeValue(base: Json, local: Json, remote: Json): Json {
  if (equal(local, remote)) return local;
  if (equal(local, base)) return remote;
  if (equal(remote, base)) return local;
  // Beide haben geändert – so fein wie möglich abgleichen.
  if (isObj(local) && isObj(remote)) return mergeObject(isObj(base) ? base : {}, local, remote);
  if (Array.isArray(local) && Array.isArray(remote)) {
    const b = Array.isArray(base) ? base : [];
    if ((hasIds(local) || local.length === 0) && (hasIds(remote) || remote.length === 0) && (hasIds(b) || b.length === 0))
      return mergeById(b as Obj[], local as Obj[], remote as Obj[]);
    if ([...local, ...remote, ...b].every((x) => typeof x !== 'object' || x === null)) {
      // Listen gleicher Länge mit Positionsbedeutung (z. B. Checkliste) feldweise, sonst als Menge.
      if (local.length === remote.length && local.length === b.length) return local.map((x, i) => mergeValue(b[i], x, remote[i]));
      return mergeSet(b, local, remote);
    }
  }
  return local;
}

function mergeObject(base: Obj, local: Obj, remote: Obj): Obj {
  const out: Obj = {};
  for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) {
    const v = mergeValue(base[k], local[k], remote[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function mergeById(base: Obj[], local: Obj[], remote: Obj[]): Obj[] {
  const byId = (l: Obj[]) => new Map(l.map((x) => [x.id as string, x]));
  const b = byId(base), l = byId(local), r = byId(remote);
  const out: Obj[] = [];
  // Reihenfolge des Servers beibehalten, neue lokale Einträge hinten anhängen.
  for (const id of [...r.keys(), ...[...l.keys()].filter((k) => !r.has(k))]) {
    const bv = b.get(id), lv = l.get(id), rv = r.get(id);
    if (lv && rv) out.push(mergeValue(bv, lv, rv) as Obj);
    else if (lv && !rv) {
      // Remote gelöscht? Nur übernehmen, wenn lokal nichts geändert wurde.
      if (!bv || !equal(lv, bv)) out.push(lv);
    } else if (rv && !lv) {
      if (!bv || !equal(rv, bv)) out.push(rv);
    }
  }
  return out;
}

function mergeSet(base: Json[], local: Json[], remote: Json[]): Json[] {
  const removed = new Set([...base.filter((x) => !local.includes(x)), ...base.filter((x) => !remote.includes(x))]);
  return [...new Set([...remote, ...local])].filter((x) => !removed.has(x));
}
