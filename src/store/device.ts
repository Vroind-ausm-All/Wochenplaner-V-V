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
}

const KEY = 'wir-device-v1';

function load(): DeviceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) return saved;
  } catch {
    /* ignorieren */
  }
  // Erststart: Werte aus den früher gemeinsamen Einstellungen übernehmen.
  const s = useStore.getState().data.settings;
  return { dimAfterMinutes: s.dimAfterMinutes ?? 0, nightMode: !!s.nightMode, nightFrom: s.nightFrom ?? '22:30', nightTo: s.nightTo ?? '06:00' };
}

export const useDevice = create<DeviceSettings>(() => (typeof localStorage === 'undefined' ? { dimAfterMinutes: 0, nightMode: false, nightFrom: '22:30', nightTo: '06:00' } : load()));

export function updateDevice(p: Partial<DeviceSettings>) {
  useDevice.setState(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(useDevice.getState()));
  } catch {
    /* ignorieren */
  }
}
