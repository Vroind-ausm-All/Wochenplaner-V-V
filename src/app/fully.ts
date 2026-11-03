/**
 * Anbindung an „Fully Kiosk Browser“ (Android-Tablet an der Wand).
 * Fully stellt bei aktivierter JavaScript-Schnittstelle (Einstellungen → Advanced Web Settings →
 * „Enable JavaScript Interface“) das Objekt `window.fully` bereit. Damit schaltet die App
 * die Hintergrundbeleuchtung wirklich aus und dimmt nachts. Ohne Fully passiert hier nichts.
 */
interface FullyApi {
  turnScreenOn(): void;
  turnScreenOff(keepAlive?: boolean): void;
  setScreenBrightness(value: number): void;
  bind?(event: string, code: string): void;
}

export const fully = (): FullyApi | null => {
  const f = (globalThis as { fully?: Partial<FullyApi> }).fully;
  return f && typeof f.turnScreenOff === 'function' && typeof f.turnScreenOn === 'function' ? (f as FullyApi) : null;
};

/** Helligkeit 0–255: nachts gedämpft, tagsüber hell genug für einen hellen Raum. */
export const BRIGHTNESS = { day: 200, night: 25 };

let bound = false;
/** Einmalig: Wird der Bildschirm in Fully eingeschaltet (Bewegungsmelder, Berührung), wacht die App auf. */
export function bindFullyEvents() {
  const f = fully();
  if (!f?.bind || bound) return;
  bound = true;
  f.bind('screenOn', "window.dispatchEvent(new Event('wir:wake'))");
  f.bind('onMotion', "window.dispatchEvent(new Event('wir:wake'))");
}
