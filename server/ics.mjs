// Kalender-Abos stellvertretend abrufen: Google, iCloud & Co. erlauben keinen direkten Browserzugriff (CORS).
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const CACHE_MS = 15 * 60 * 1000;

/**
 * Adressen, die nie abgerufen werden: der Server selbst und Link-Local (u. a. Cloud-Metadaten).
 * Private Heimnetz-Adressen sind erlaubt – z. B. ein Nextcloud-Kalender auf dem NAS.
 */
function forbidden(ip) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::' || v.startsWith('fe80')) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? forbidden(mapped[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 127 || a === 0 || (a === 169 && b === 254);
}

export function createIcsFetcher({ allowLoopback = false, fetchImpl = fetch } = {}) {
  const cache = new Map();

  async function check(url) {
    if (!['http:', 'https:'].includes(url.protocol)) throw Object.assign(new Error('Nur http(s)-Adressen'), { status: 400 });
    if (allowLoopback) return;
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((x) => x.address);
    if (ips.some(forbidden)) throw Object.assign(new Error('Diese Adresse ist nicht erlaubt'), { status: 400 });
  }

  return async function fetchIcs(raw) {
    let url;
    try {
      url = new URL(String(raw).trim().replace(/^webcals?:\/\//i, 'https://'));
    } catch {
      throw Object.assign(new Error('Ungültige Adresse'), { status: 400 });
    }
    const key = url.href;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.text;

    let res;
    for (let hop = 0; ; hop++) {
      await check(url);
      try {
        res = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'text/calendar, */*' } });
      } catch {
        throw Object.assign(new Error('Kalender nicht erreichbar'), { status: 502 });
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get('location') && hop < 3) {
        url = new URL(res.headers.get('location'), url); // jedes Weiterleitungsziel erneut prüfen
        continue;
      }
      break;
    }
    if (!res.ok) throw Object.assign(new Error(`Kalender antwortet mit ${res.status}`), { status: 502 });

    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('Kalender zu groß (über 5 MB)'), { status: 502 });
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (!/BEGIN:VCALENDAR/i.test(text)) throw Object.assign(new Error('Unter dieser Adresse liegt kein Kalender (iCal/ICS)'), { status: 502 });
    cache.set(key, { at: Date.now(), text });
    return text;
  };
}
