import type { ReactNode } from 'react';
import type { Owner } from '../store/types';

/**
 * Piktogramme – ein Satz, eine Sprache: 24er-Raster, 1,5 px Linie, runde Enden, keine Füllungen
 * (Ausnahme: Personen-Marke „A“). Ersetzt alle Emojis. Übersicht: docs/DESIGN.md
 */
const P: Record<string, ReactNode> = {
  // Navigation
  home: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  meal: (
    <>
      <circle cx="13" cy="12" r="6.5" />
      <circle cx="13" cy="12" r="3" />
      <path d="M3.5 4v5.5a1.5 1.5 0 0 0 3 0V4M5 9.5V20" />
    </>
  ),
  wir: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4.5h2.5l2 10h10.5l1.8-7H7" />
      <circle cx="9.5" cy="18.5" r="1.3" />
      <circle cx="16.5" cy="18.5" r="1.3" />
    </>
  ),
  tasks: <path d="M5 6.5l1.5 1.5L9 5.5M5 12.5l1.5 1.5L9 11.5M5 18.5l1.5 1.5L9 17.5M12 7h7M12 13h7M12 19h7" />,
  family: (
    <>
      <path d="M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5" />
      <circle cx="12" cy="12.5" r="2" />
      <path d="M8.5 20c0-2.3 1.6-4 3.5-4s3.5 1.7 3.5 4" />
    </>
  ),
  settings: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" />,

  // Aktionen
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'chevron-left': <path d="M14.5 5.5 8 12l6.5 6.5" />,
  'chevron-right': <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  'chevron-down': <path d="M5.5 9.5 12 16l6.5-6.5" />,
  'arrow-right': <path d="M4 12h15M13 6l6 6-6 6" />,
  edit: <path d="M5 19h3.5L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5" />,
  trash: <path d="M5 7h14M10 4h4M7 7l1 13h8l1-13M10.5 10.5v6M13.5 10.5v6" />,
  undo: <path d="M9 7 5 11l4 4M5 11h9a5 5 0 0 1 0 10h-3" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" />
      <path d="M5 15V5h10" />
    </>
  ),
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  upload: <path d="M12 16V5M7 9.5l5-5 5 5M5 20h14" />,
  refresh: <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5" />,
  repeat: <path d="M17 4.5 19.5 7 17 9.5M4.5 11.5V10a3 3 0 0 1 3-3h12M7 19.5 4.5 17 7 14.5M19.5 12.5V14a3 3 0 0 1-3 3h-12" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  link: <path d="M10 14l4-4M8.5 11.5 6.8 13.2a3 3 0 0 0 4.2 4.2l1.7-1.7M15.5 12.5l1.7-1.7a3 3 0 0 0-4.2-4.2l-1.7 1.7" />,
  logout: <path d="M14 4.5H5v15h9M10 12h10M16.5 8.5 20 12l-3.5 3.5" />,
  power: <path d="M12 3.5v8M7 6.5a7 7 0 1 0 10 0" />,
  bell: <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5L19 18H5zM10 20.5h4" />,
  alert: <path d="M12 4 21 19.5H3zM12 10v4.5M12 17v.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5.5M12 8v.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8h4l1.5-2.5h6L16.5 8h4v11h-17z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20.5s6-5.6 6-10.5a6 6 0 0 0-12 0c0 4.9 6 10.5 6 10.5z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  cloud: <path d="M7.5 18.5h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.5 18.5z" />,
  'cloud-off': <path d="M7.5 18.5h10M17.8 10.5a5.5 5.5 0 0 0-8.3-3.8M7.2 11.7A3.4 3.4 0 0 0 7.5 18.5M4 4l16 16" />,
  sync: <path d="M18.5 9A7 7 0 0 0 6 7.5M5.5 15A7 7 0 0 0 18 16.5M6 4v3.5h3.5M18 20v-3.5h-3.5" />,
  star: <path d="M12 4l2.3 5 5.2.5-3.9 3.5 1.1 5.2L12 15.6l-4.7 2.6 1.1-5.2-3.9-3.5 5.2-.5z" />,
  heart: <path d="M12 19.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.2a4 4 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10z" />,
  quote: <path d="M6 17c2-1 3-3 3-6V7H5v4h4M15 17c2-1 3-3 3-6V7h-4v4h4" />,
  external: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" />
      <path d="M4 10h16M10 15h6M13 12l3 3-3 3" />
    </>
  ),
  move: <path d="M5 12h14M15 8l4 4-4 4M9 8 5 12l4 4" />,
  book: <path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V20" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5M15.5 5.6a3 3 0 0 1 0 5.8M17 13.8c2.1.6 3.5 2.6 3.5 5.2" />
    </>
  ),

  // Kategorien & Bausteine
  leaf: <path d="M5 19c0-8 5-13.5 14-14 0 9-5.5 14-13 14M5 19l7-7" />,
  house: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  pram: (
    <>
      <path d="M4 6h3l2.5 8h9a6 6 0 0 0-6-6V5" />
      <circle cx="10" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  bucket: <path d="M5 8h14l-1.5 12h-11zM5 8a7 3 0 0 1 14 0M9 4.5h6" />,
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" />
      <path d="M9 7.5v-3h6v3M3.5 13h17" />
    </>
  ),
  hourglass: <path d="M6.5 4h11M6.5 20h11M8 4c0 5 8 5 8 8s-8 3-8 8M16 4c0 5-8 5-8 8s8 3 8 8" />,
  walk: <path d="M12 6.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM10 21l2-6 2.5 2.5V21M8 12.5l2.5-4 3.5 1 2.5 3M12.5 15 11 9" />,
  glass: <path d="M7.5 3.5h9l-.5 6a4 4 0 0 1-8 0zM12 13.5V20M8.5 20h7" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M15 9l-2 4.5L9 15l2-4.5z" />
    </>
  ),
  pot: <path d="M4 10h16M5.5 10v6a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-6M2.5 11.5h2M19.5 11.5h2M9.5 6.5c0-1.5 1-1.5 1-3M13.5 6.5c0-1.5 1-1.5 1-3" />,
  run: <path d="M14.5 6a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM5 20.5l3.5-4.5 3 1.5L13 13l3 2.5h3.5M8.5 10.5l3-2 3 1.5-1.5 3M12.5 8.5" />,
  armchair: <path d="M6 11V7.5h12V11M4 11h3v3.5h10V11h3v7.5H4zM6 18.5V20M18 18.5V20" />,
  sparkle: <path d="M12 4c.8 4 2.4 5.6 6.5 6.5-4.1.9-5.7 2.5-6.5 6.5-.8-4-2.4-5.6-6.5-6.5C9.6 9.6 11.2 8 12 4zM18.5 16v4M16.5 18h4" />,
  medical: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  film: (
    <>
      <rect x="4" y="5" width="16" height="14" />
      <path d="M8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4" />
    </>
  ),
  dice: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" />
      <path d="M9 9h.01M15 15h.01M12 12h.01" strokeWidth="2.6" />
    </>
  ),
  chat: <path d="M4.5 5.5h15v10H11l-4 3.5v-3.5H4.5z" />,
  bike: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l3.5-7h6L18 16M9.5 9 12 16h-6M14 6.5h2.5" />
    </>
  ),
  basket: <path d="M4 10h16l-2 9H6zM8 10l3-5.5M16 10l-3-5.5M9 13.5v3M12 13.5v3M15 13.5v3" />,
  sunset: <path d="M4 18h16M7 14.5a5 5 0 0 1 10 0M12 5v3M5.2 8.7l1.6 1.6M18.8 8.7l-1.6 1.6M2.5 14.5h2M19.5 14.5h2" />,
  music: <path d="M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />,
  photo: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 15l4.5-4 4.5 4 2.5-2 4.5 4" />
    </>
  ),

  // Wetter
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  'sun-cloud': (
    <>
      <path d="M8 8.5a3.5 3.5 0 0 1 6.3-1.6M8.5 2.5v1.5M3 8.5h1.5M4.6 4.6l1 1" />
      <path d="M8.5 19.5h9a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9.3 1 3 3 0 0 0 0 6z" />
    </>
  ),
  'moon-cloud': (
    <>
      <path d="M12.5 6.5A4 4 0 0 1 7 10.5 4 4 0 1 0 12.5 6.5z" />
      <path d="M8.5 19.5h9a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9.3 1 3 3 0 0 0 0 6z" />
    </>
  ),
  fog: <path d="M4 9h16M6 13h12M4 17h16" />,
  drizzle: (
    <>
      <path d="M7.5 14.5h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.5 14.5z" />
      <path d="M9 18v.5M13 18v.5M17 18v.5" strokeWidth="2" />
    </>
  ),
  rain: (
    <>
      <path d="M7.5 14.5h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.5 14.5z" />
      <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" />
    </>
  ),
  snow: (
    <>
      <path d="M7.5 14.5h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.5 14.5z" />
      <path d="M9 18.5h.01M13 18.5h.01M17 18.5h.01M11 21h.01M15 21h.01" strokeWidth="2.4" />
    </>
  ),
  storm: (
    <>
      <path d="M7.5 14.5h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.5 14.5z" />
      <path d="M12.5 14.5 10.5 18h3l-2 3.5" />
    </>
  ),
  umbrella: <path d="M3.5 12a8.5 8.5 0 0 1 17 0zM12 12v6a2 2 0 0 0 4 0M12 3.5v1" />,
  wind: <path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7" />,
  drop: <path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z" />,
  thermometer: <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a3.5 3.5 0 1 1-4 0zM12 9v7.5" />,

  // Energie
  'battery-low': (
    <>
      <rect x="3.5" y="7.5" width="15" height="9" />
      <path d="M21 10.5v3M6.5 10.5v3" />
    </>
  ),
  'battery-mid': (
    <>
      <rect x="3.5" y="7.5" width="15" height="9" />
      <path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3M12.5 10.5v3" />
    </>
  ),
  'battery-full': (
    <>
      <rect x="3.5" y="7.5" width="15" height="9" />
      <path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3M12.5 10.5v3M15.5 10.5v3" />
    </>
  ),

  // Essen
  timer: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9.5V13h3M10 3.5h4" />
    </>
  ),
  flame: <path d="M12 20.5a6 6 0 0 0 6-6c0-4.5-4-6-4.5-10.5C10 6.5 8.5 9 8.5 11c-1-.5-1.5-1.5-1.5-2.5C6.5 10 6 12 6 14.5a6 6 0 0 0 6 6z" />,
  meat: (
    <>
      <path d="M12.8 13.6c-2.8-2.6-2.7-6.6-.2-8.6 2.5-2.1 6.3-1.6 7.8 1 1.6 2.6.6 6.1-2 7.7-1.9 1.2-4.1 1.3-5.6-.1z" />
      <path d="M12.8 13.6 8.2 18.2" />
      <circle cx="6.3" cy="17.6" r="1.6" />
      <circle cx="7.6" cy="19.9" r="1.6" />
    </>
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
};

export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P) as IconName[];

export function Icon({ name, size = 20, label, className = '', strokeWidth = 1.5 }: { name: IconName | string; size?: number; label?: string; className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {P[name] ?? P.info}
    </svg>
  );
}

/** Das WIR-Zeichen: zwei Kreise – zwei Menschen, ein Plan. `closeness` 0…1 = Abstand → Überlappung. */
export function WirMark({ size = 32, closeness = 0.5, filled = false }: { size?: number; closeness?: number; filled?: boolean }) {
  const d = 7 - 5 * Math.max(0, Math.min(1, closeness)); // Abstand der Mittelpunkte vom Zentrum
  return (
    <svg className="icon wir-mark" width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx={16 - d} cy={16} r={8} fill={filled ? 'currentColor' : 'none'} />
      <circle cx={16 + d} cy={16} r={8} />
    </svg>
  );
}

/** Personen-Marke: ● Person A (gefüllt), ○ Person B (Ring), Beide = WIR-Zeichen. */
export function OwnerMark({ owner, size = 14 }: { owner: Owner | 'Alle'; size?: number }) {
  if (owner === 'Beide' || owner === 'Alle')
    return (
      <svg className="icon owner-mark" width={size * 1.5} height={size} viewBox="0 0 21 14" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <circle cx="7" cy="7" r="5.5" fill="currentColor" />
        <circle cx="14" cy="7" r="5.5" />
      </svg>
    );
  return (
    <svg className="icon owner-mark" width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx="7" cy="7" r="5.5" fill={owner === 'Person A' ? 'currentColor' : 'none'} />
    </svg>
  );
}

/** Nur die Pfade eines Piktogramms – zum Einbetten in eigene SVGs (24er-Raster). */
export function IconGlyph({ name, x = 0, y = 0, size = 24, strokeWidth = 1.5 }: { name: IconName | string; x?: number; y?: number; size?: number; strokeWidth?: number }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="currentColor" strokeWidth={strokeWidth / s} strokeLinecap="round" strokeLinejoin="round">
      {P[name] ?? P.info}
    </g>
  );
}
