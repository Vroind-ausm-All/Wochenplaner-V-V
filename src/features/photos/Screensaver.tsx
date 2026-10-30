import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { addDays, fmt } from '../../lib/date';
import { useSeconds, useToday } from '../../lib/useClock';
import { weatherIcon, weatherLabel } from '../../lib/weather';
import { useDevice } from '../../store/device';
import { useStore } from '../../store/store';
import { AFFIRMATIONS, dailyIndex, personalize } from '../affirmations/affirmations';
import { useAllOccurrences } from '../external/useExternal';
import { alertIcon } from '../weather/AlertBanner';
import { useActiveAlerts } from '../weather/useAlerts';
import { useWeatherStore } from '../weather/useWeather';
import { loadPhotos, usePhotos, type Photo } from './photoStore';
import './screensaver.css';
import { Icon, WirMark } from '../../ui/Icon';

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Zufällige, aber pro Foto feste Richtung für Schwenk und Zoom. */
function kenBurns(id: string) {
  const h = hash(id);
  const dir = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]][h % 6];
  const zoomIn = h % 2 === 0;
  return {
    from: { scale: zoomIn ? 1.04 : 1.16, x: `${dir[0] * -2}%`, y: `${dir[1] * -2}%` },
    to: { scale: zoomIn ? 1.16 : 1.04, x: `${dir[0] * 2}%`, y: `${dir[1] * 2}%` },
  };
}

function Slide({ photo, seconds, landscape }: { photo: Photo; seconds: number; landscape: boolean }) {
  const reduce = useReducedMotion();
  const kb = kenBurns(photo.id);
  // Passt das Seitenverhältnis gar nicht (Hochkantfoto auf Querformat), ganz zeigen und Hintergrund weich füllen.
  const ratio = photo.w && photo.h ? photo.w / photo.h : 1.5;
  const contain = landscape ? ratio < 0.9 : ratio > 1.4;
  return (
    <motion.div className="ss__slide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }}>
      {contain && <img className="ss__backdrop" src={photo.url} alt="" aria-hidden />}
      <motion.img
        className={`ss__img ${contain ? 'is-contain' : ''}`}
        src={photo.url}
        alt=""
        initial={reduce || contain ? false : kb.from}
        animate={reduce || contain ? undefined : kb.to}
        transition={{ duration: seconds + 2, ease: 'linear' }}
      />
    </motion.div>
  );
}

function Info() {
  const d = useSeconds();
  const today = useToday();
  const forecast = useWeatherStore((s) => s.forecast);
  const alerts = useActiveAlerts();
  const list = useAllOccurrences(today, addDays(today, 1));
  const nowHm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const next = list.filter((e) => !e.external && (e.on > today || e.allDay || e.time >= nowHm)).slice(0, 3);
  return (
    <div className="ss__info">
      <div>
        <div className="ss__clock">{nowHm}</div>
        <div className="ss__date">{fmt.long(today)}</div>
      </div>
      <div className="ss__side">
        {forecast && (
          <div className="ss__wx" title={weatherLabel(forecast.current.code)}>
            <Icon name={weatherIcon(forecast.current.code, forecast.current.isDay)} size={36} strokeWidth={1.25} /> {Math.round(forecast.current.temp)}°
          </div>
        )}
        {alerts[0] && (
          <div className="ss__alert">
            <Icon name={alertIcon(alerts[0].event)} size={18} /> {alerts[0].event.charAt(0)}
            {alerts[0].event.slice(1).toLowerCase()}
          </div>
        )}
        {next.map((e) => (
          <div key={e.id + e.on} className="ss__event">
            <span>{e.on === today ? (e.allDay ? 'Heute' : e.time) : `Morgen${e.allDay ? '' : ` ${e.time}`}`}</span> {e.title}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ruhebildschirm: Fotos als Diashow, sonst ein ruhiger Verlauf mit dem Gedanken des Tages. */
export function Screensaver({ night, onClose }: { night: boolean; onClose: () => void }) {
  const device = useDevice();
  const photos = usePhotos((s) => s.photos);
  const { personA, personB, quoteOffset } = useStore((s) => s.data.settings);
  const [i, setI] = useState(0);
  const [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const [hint, setHint] = useState(true);
  const black = night && device.screensaverNightBlack;

  useEffect(() => {
    void loadPhotos();
    const t = setTimeout(() => setHint(false), 3500);
    const onResize = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Reihenfolge einmal pro Start mischen, damit nicht immer dieselben Fotos zuerst kommen.
  const order = useMemo(() => [...photos].sort(() => Math.random() - 0.5), [photos.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (order.length < 2 || black) return;
    const t = setInterval(() => setI((x) => (x + 1) % order.length), device.slideSeconds * 1000);
    return () => clearInterval(t);
  }, [order.length, device.slideSeconds, black]);

  // Nächstes Foto vorladen
  useEffect(() => {
    const n = order[(i + 1) % Math.max(1, order.length)];
    if (n) new Image().src = n.url;
  }, [i, order]);

  const current = order[i % Math.max(1, order.length)];
  const quote = personalize(AFFIRMATIONS[dailyIndex(new Date(), quoteOffset)].text, personA, personB);

  return (
    <motion.div className={`ss ${black ? 'is-black' : ''}`} role="dialog" aria-label="Bildschirmschoner – antippen zum Zurückkehren" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} onPointerDown={onClose}>
      {!black && (
        <AnimatePresence>
          {current ? (
            <Slide key={current.id} photo={current} seconds={device.slideSeconds} landscape={landscape} />
          ) : (
            <motion.div key="calm" className="ss__calm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <WirMark size={72} closeness={0.6} />
              <p className="ss__quote">„{quote}“</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      {(device.screensaverInfo || black) && <Info />}
      <AnimatePresence>{hint && <motion.div className="ss__hint" exit={{ opacity: 0 }}>Antippen, um zum Planer zurückzukehren</motion.div>}</AnimatePresence>
    </motion.div>
  );
}
