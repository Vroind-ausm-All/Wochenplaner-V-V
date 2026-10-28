import { useMemo } from 'react';
import { occurrences } from '../../lib/recurrence';
import { useStore } from '../../store/store';
import type { ISODate, Owner } from '../../store/types';

export function useOccurrences(from: ISODate, to: ISODate) {
  const events = useStore((s) => s.data.events);
  return useMemo(() => occurrences(events, from, to), [events, from, to]);
}

/** Anzeigename statt „Person A/B“. */
export function useOwnerName() {
  const { personA, personB } = useStore((s) => s.data.settings);
  return (o: Owner) => (o === 'Person A' ? personA : o === 'Person B' ? personB : 'Beide');
}

export const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?';
