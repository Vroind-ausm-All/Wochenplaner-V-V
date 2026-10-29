import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../lib/date';
import { dueReminders, forWhom, type DueReminder } from '../../lib/reminders';
import { useDevice } from '../../store/device';
import { useStore } from '../../store/store';
import './reminders.css';
import { Icon } from '../../ui/Icon';

const SHOWN_KEY = 'wir-reminders-shown';
const SNOOZE_KEY = 'wir-reminders-snoozed';
const TICK_MS = 15_000;

const readMap = (k: string): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(k) || '{}');
  } catch {
    return {};
  }
};
const writeMap = (k: string, m: Record<string, number>) => {
  const now = Date.now();
  for (const [key, t] of Object.entries(m)) if (now - t > 3 * 864e5) delete m[key];
  try {
    localStorage.setItem(k, JSON.stringify(m));
  } catch {
    /* ignorieren */
  }
};

/** Sanfter Zwei-Klang über Web Audio – kein Audio-Asset nötig. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [659.25, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.2);
    });
    setTimeout(() => void ctx.close(), 2000);
  } catch {
    /* ohne Ton weiter */
  }
}

export const whenLabel = (r: DueReminder) => (r.minutesBefore === 1440 ? 'Morgen' : r.minutesBefore === 60 ? 'In 1 Std.' : `In ${r.minutesBefore} Min.`);

/**
 * Zeigt fällige Erinnerungen auf jedem geöffneten Gerät – ideal für den Bilderrahmen.
 * Merkt sich je Gerät, was schon angezeigt wurde. „Später“ erinnert 10 Minuten danach erneut.
 */
export function ReminderCenter() {
  const events = useStore((s) => s.data.events);
  const names = useStore((s) => s.data.settings);
  const device = useDevice();
  const [open, setOpen] = useState<DueReminder[]>([]);
  const last = useRef(Date.now() - TICK_MS);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!device.remindersOnScreen) return;
    const tick = () => {
      const now = Date.now();
      const shown = readMap(SHOWN_KEY);
      const snoozed = readMap(SNOOZE_KEY);
      const fresh = dueReminders(eventsRef.current, last.current, now).filter((r) => !shown[r.key] && forWhom(r.event.owner, device.reminderFor));
      last.current = now;
      // Zurückgestellte Erinnerungen, deren Zeit gekommen ist
      const again = Object.entries(snoozed)
        .filter(([, until]) => until <= now)
        .map(([key]) => {
          delete snoozed[key];
          const [id, on, before] = key.split('|');
          const ev = eventsRef.current.find((e) => e.id === id);
          return ev ? { key, at: now, event: ev, on, minutesBefore: Number(before) } : null;
        })
        .filter((x): x is DueReminder => !!x);
      writeMap(SNOOZE_KEY, snoozed);
      const all = [...fresh, ...again];
      if (!all.length) return;
      for (const r of fresh) shown[r.key] = now;
      writeMap(SHOWN_KEY, shown);
      setOpen((o) => [...o.filter((x) => !all.some((a) => a.key === x.key)), ...all]);
      window.dispatchEvent(new Event('wir:wake')); // Bildschirmschoner beenden, damit man es sieht
      if (device.reminderSound) chime();
      // Liegt die App im Hintergrund, zusätzlich als Systemmitteilung (sofern erlaubt).
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted')
        navigator.serviceWorker?.ready.then((reg) => all.forEach((r) => reg.showNotification(`${whenLabel(r)}: ${r.event.title}`, { tag: r.key, body: r.event.allDay ? 'ganztags' : `${r.event.time} Uhr` }))).catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, TICK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [device.remindersOnScreen, device.reminderSound, device.reminderFor]);

  const close = (key: string) => setOpen((o) => o.filter((x) => x.key !== key));
  const snooze = (key: string) => {
    const m = readMap(SNOOZE_KEY);
    m[key] = Date.now() + 10 * 60_000;
    writeMap(SNOOZE_KEY, m);
    close(key);
  };
  const who = (o: string) => (o === 'Person A' ? names.personA : o === 'Person B' ? names.personB : null);

  return (
    <div className="reminders" aria-live="assertive">
      <AnimatePresence>
        {open.map((r) => (
          <motion.div key={r.key} className="reminder" role="alert" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Icon name="bell" size={28} className="reminder__bell" />
            <div className="grow">
              <div className="reminder__when">{whenLabel(r)}</div>
              <b className="reminder__title">{r.event.title}</b>
              <div className="small muted">
                {r.minutesBefore === 1440 ? fmt.long(r.on) : r.event.allDay ? 'ganztags' : `${r.event.time} Uhr`}
                {who(r.event.owner) ? ` · ${who(r.event.owner)}` : ''}
              </div>
            </div>
            <div className="reminder__actions">
              <button className="btn sm primary" onClick={() => close(r.key)}>
                OK
              </button>
              {r.minutesBefore !== 1440 && (
                <button className="btn sm" onClick={() => snooze(r.key)}>
                  In 10 Min.
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
