import { useStore } from '../../store/store';
import type { Owner } from '../../store/types';

/** Eigene Termine, Feiertage und Abo-Termine eines Zeitraums. */
export { useAllOccurrences as useOccurrences } from '../external/useExternal';

/** Anzeigename statt „Person A/B“. */
export function useOwnerName() {
  const { personA, personB } = useStore((s) => s.data.settings);
  return (o: Owner) => (o === 'Person A' ? personA : o === 'Person B' ? personB : 'Beide');
}

export const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?';
