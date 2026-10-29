import { create } from 'zustand';
import type { Time } from './types';
import { useStore } from './store';

/**
 * Einstellungen, die nur für dieses Gerät gelten und nicht mitsynchronisiert werden –
 * das Wanddisplay soll nachts dunkel werden, das Handy nicht.
 */
export interface DeviceSettings {
  dimAfterMinutes: number; // 0 = aus
  nightMode: boolean;
  nightFrom: Time;
  nightTo: Time;
  /** Erinnerungen auf diesem Bildschirm einblenden */
  remindersOnScreen: boolean;
  reminderSound: boolean;
  /** Wessen Erinnerungen dieses Gerät bekommt */
  reminderFor: 'Alle' | 'Person A' | 'Person B';
  /** Bildschirmschoner nach so vielen Minuten ohne Berührung (0 = aus) */
  screensaverAfter: number;
  /** Sekunden je Foto */
  slideSeconds: number;
  /** Uhr, Wetter und nächste Termine über den Fotos */
  screensaverInfo: boolean;
  /** Im Nachtmodus schwarz statt Fotos */
  screensaverNightBlack: boolean;
}

const DEVICE_DEFAULTS = {
  remindersOnScreen: true, reminderSound: true, reminderFor: 'Alle' as const,
  screensaverAfter: 0, slideSeconds: 15, screensaverInfo: true, screensaverNightBlack: true,
};

const KEY = 'wir-device-v1';

function load(): DeviceSettings {
  // Grundwerte: beim Erststart aus den früher gemeinsamen Einstellungen übernommen.
  const s = useStore.getState().data.settings;
  const base: DeviceSettings = { ...DEVICE_DEFAULTS, dimAfterMinutes: s.dimAfterMinutes ?? 0, nightMode: !!s.nightMode, nightFrom: s.nightFrom ?? '22:30', nightTo: s.nightTo ?? '06:00' };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    // Fehlende oder ungültige Felder (ältere Version, Teil-Speicherung) mit Grundwerten auffüllen.
    if (saved && typeof saved === 'object')
      return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, typeof saved[k] === typeof v ? saved[k] : v])) as unknown as DeviceSettings;
  } catch {
    /* ignorieren */
  }
  return base;
}

export const useDevice = create<DeviceSettings>(() => (typeof localStorage === 'undefined' ? { ...DEVICE_DEFAULTS, dimAfterMinutes: 0, nightMode: false, nightFrom: '22:30', nightTo: '06:00' } : load()));

export function updateDevice(p: Partial<DeviceSettings>) {
  useDevice.setState(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(useDevice.getState()));
  } catch {
    /* ignorieren */
  }
}
