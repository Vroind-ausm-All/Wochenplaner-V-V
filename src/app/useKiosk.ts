import { useEffect, useState } from 'react';
import { toMinutes } from '../lib/date';
import { useNow } from '../lib/useClock';
import { useDevice } from '../store/device';
import { BRIGHTNESS, bindFullyEvents, fully } from './fully';

/** Nachtmodus nach Zeitplan, Abdunkeln bei Inaktivität und „Bildschirm dunkel“ mit Tippen zum Aufwecken. */
export function useKiosk() {
  const s = useDevice();
  const now = useNow();
  const [dimmed, setDimmed] = useState(false);
  const [screensaver, setScreensaver] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [manualNight, setManualNight] = useState<boolean | null>(null);

  const n = toMinutes(now), from = toMinutes(s.nightFrom), to = toMinutes(s.nightTo);
  const scheduled = s.nightMode && (from > to ? n >= from || n < to : n >= from && n < to);
  const night = manualNight ?? scheduled;

  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    // Tablet mit Fully Kiosk: nachts auch die Hintergrundbeleuchtung dimmen.
    if (s.tabletControl) fully()?.setScreenBrightness(night ? BRIGHTNESS.night : BRIGHTNESS.day);
  }, [night, s.tabletControl]);

  // Fully meldet „Bildschirm an“ und Bewegung → App aufwecken.
  useEffect(() => {
    if (!s.tabletControl) return;
    bindFullyEvents();
    const onWake = () => {
      // Auch Erinnerungen lösen „wir:wake“ aus – dann soll der Bildschirm wirklich angehen.
      fully()?.turnScreenOn();
      setSleeping(false);
      setDimmed(false);
    };
    window.addEventListener('wir:wake', onWake);
    return () => window.removeEventListener('wir:wake', onWake);
  }, [s.tabletControl]);
  useEffect(() => setManualNight(null), [scheduled]);

  useEffect(() => {
    if (!s.dimAfterMinutes) return;
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setDimmed(false);
      clearTimeout(t);
      t = setTimeout(() => setDimmed(true), s.dimAfterMinutes * 60_000);
    };
    wake();
    const evs = ['pointerdown', 'keydown', 'wheel'];
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [s.dimAfterMinutes]);

  // Bildschirmschoner nach Inaktivität. Erinnerungen wecken ihn auf („wir:wake“).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(t);
      if (s.screensaverAfter) t = setTimeout(() => setScreensaver(true), s.screensaverAfter * 60_000);
    };
    const wake = () => {
      setScreensaver(false);
      arm();
    };
    const show = () => setScreensaver(true);
    arm();
    const evs = ['pointerdown', 'keydown', 'wheel'];
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    window.addEventListener('wir:wake', wake);
    window.addEventListener('wir:screensaver', show);
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, arm));
      window.removeEventListener('wir:wake', wake);
      window.removeEventListener('wir:screensaver', show);
    };
  }, [s.screensaverAfter]);

  /** „Bildschirm dunkel“: mit Fully wirklich aus (App läuft weiter), sonst schwarze Fläche. */
  const sleep = (on: boolean) => {
    const f = s.tabletControl ? fully() : null;
    if (f) {
      if (on) f.turnScreenOff(true);
      else f.turnScreenOn();
    }
    setSleeping(on);
  };

  return {
    night, dimmed, sleeping, screensaver, setSleeping: sleep,
    toggleNight: () => setManualNight(!night),
    closeScreensaver: () => setScreensaver(false),
    wake: () => {
      setDimmed(false);
      sleep(false);
    },
  };
}
