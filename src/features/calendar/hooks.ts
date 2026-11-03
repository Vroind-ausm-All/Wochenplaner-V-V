import { useStore } from '../../store/store';
import { ownersFor, type Owner } from '../../store/types';

/** Eigene Termine, Feiertage und Abo-Termine eines Zeitraums. */
export { useAllOccurrences as useOccurrences } from '../external/useExternal';

/** Anzeigename statt „Person A/B“. */
export function useOwnerName() {
  const { personA, personB, childName } = useStore((s) => s.data.settings);
  return (o: Owner) => (o === 'Person A' ? personA : o === 'Person B' ? personB : o === 'Kind' ? childName?.trim() || 'Kind' : 'Beide');
}

/** Auswahl der Personen – mit Kind, sobald es in den Einstellungen einen Namen hat. */
export function useOwners() {
  const childName = useStore((s) => s.data.settings.childName);
  return ownersFor({ childName });
}

export const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?';
