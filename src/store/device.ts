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
}

const DEVICE_DEFAULTS = { remindersOnScreen: true, reminderSound: true, reminderFor: 'Alle' as const };

const KEY = 'wir-device-v1';

function load(): DeviceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) return { ...DEVICE_DEFAULTS, ...saved };
  } catch {
    /* ignorieren */
  }
  // Erststart: Werte aus den früher gemeinsamen Einstellungen übernehmen.
  const s = useStore.getState().data.settings;
  return { ...DEVICE_DEFAULTS, dimAfterMinutes: s.dimAfterMinutes ?? 0, nightMode: !!s.nightMode, nightFrom: s.nightFrom ?? '22:30', nightTo: s.nightTo ?? '06:00' };
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
