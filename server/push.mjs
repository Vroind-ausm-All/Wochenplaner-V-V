// Web Push ohne Zusatzpakete: VAPID (RFC 8292) und verschlüsselte Nachrichten (RFC 8291, aes128gcm).
// Funktioniert mit Chrome/Android (FCM), Firefox (Mozilla) und Safari/iOS ≥ 16.4 (als installierte Web-App).
import { createCipheriv, createECDH, createHmac, createPublicKey, generateKeyPairSync, createPrivateKey, randomBytes, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export const b64url = (buf) => Buffer.from(buf).toString('base64url');
export const fromB64url = (s) => Buffer.from(String(s).replace(/=+$/, ''), 'base64url');

/** Schlüsselpaar des Servers: wird einmal erzeugt und im Datenordner gespeichert. */
export function loadVapid(file) {
  if (!existsSync(file)) {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    writeFileSync(file, JSON.stringify(privateKey.export({ format: 'jwk' })), { mode: 0o600 });
  }
  const jwk = JSON.parse(readFileSync(file, 'utf8'));
  const privateKey = createPrivateKey({ key: jwk, format: 'jwk' });
  const pub = createPublicKey(privateKey).export({ format: 'jwk' });
  const publicRaw = Buffer.concat([Buffer.from([4]), fromB64url(pub.x), fromB64url(pub.y)]);
  return { privateKey, publicKey: b64url(publicRaw) };
}

/** Signiertes VAPID-Token für den Push-Dienst des Endpunkts. */
export function vapidHeader(endpoint, vapid, contact, now = Date.now()) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64url(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: contact }));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key: vapid.privateKey, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${vapid.publicKey}`;
}

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** Nutzlast für ein Abo verschlüsseln (RFC 8291). */
export function encrypt(payload, keys, opts = {}) {
  const salt = opts.salt ?? randomBytes(16);
  let ecdh = opts.ecdh;
  if (!ecdh) {
    ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
  }
  const uaPublic = fromB64url(keys.p256dh);
  const authSecret = fromB64url(keys.auth);
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const prkKey = hmac(authSecret, shared);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

/**
 * Eine Nachricht an ein Abo senden. Ergebnis: 'ok', 'gone' (Abo abgelaufen → löschen) oder 'error'.
 */
export async function sendPush(subscription, message, vapid, contact, fetchImpl = fetch) {
  const body = encrypt(JSON.stringify(message), subscription.keys);
  try {
    const r = await fetchImpl(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidHeader(subscription.endpoint, vapid, contact),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '3600',
        Urgency: 'high',
      },
      body,
    });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
