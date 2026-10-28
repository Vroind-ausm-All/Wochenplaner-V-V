import { create } from 'zustand';
import type { ISODate, Owner, Time } from '../store/types';
import type { Payload, Target } from './types';

interface DndState {
  /** Per Tippen ausgewähltes Element (Click&Drop) */
  picked: Payload | null;
  /** Gerade gezogenes Element (Drag&Drop) */
  dragging: Payload | null;
  /** Für wen neue Bausteine gelten */
  owner: Owner;
  /** Rückfrage beim Verschieben eines Serientermins */
  seriesMove: { id: string; from: ISODate; to: ISODate; time: Time | null } | null;
  lastDragEnd: number;
  /** Umgekehrter Weg: erst Ziel antippen (z. B. „Abend am Mittwoch“), dann das Rezept. */
  pendingTarget: { target: Target; label: string } | null;
}

export const useDnd = create<DndState>(() => ({ picked: null, dragging: null, owner: 'Beide', seriesMove: null, lastDragEnd: 0, pendingTarget: null }));

export const pick = (p: Payload | null) => useDnd.setState({ picked: p, pendingTarget: null });
/** Das aktive Element – egal ob gezogen oder angetippt. */
export const useActivePayload = () => useDnd((s) => s.dragging ?? s.picked);
