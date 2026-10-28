import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { accepts, applyDrop } from './rules';
import { pick, useActivePayload, useDnd } from './state';
import { payloadKey, targetKey, type Payload, type Target } from './types';
import './dnd.css';

/** Ziel ist, was unter dem Finger bzw. Mauszeiger liegt – nicht unter der (breiteren) Vorschau. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/**
 * Ein Interaktionsmodell, zwei Wege:
 *  • Drag&Drop – Maus sofort ab 6 px, Touch nach kurzem Halten (220 ms), damit Scrollen frei bleibt.
 *  • Click&Drop – antippen wählt aus, Ziel antippen legt ab. Funktioniert auch mit Tastatur.
 */
export function DndProvider({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const dragging = useDnd((s) => s.dragging);

  const onDragStart = (e: DragStartEvent) => {
    useDnd.setState({ dragging: e.active.data.current as Payload, picked: null });
    navigator.vibrate?.(12);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const p = e.active.data.current as Payload;
    const t = e.over?.data.current as Target | undefined;
    useDnd.setState({ dragging: null, lastDragEnd: Date.now() });
    if (p && t) applyDrop(p, t, useDnd.getState().owner);
  };

  // Escape bricht eine Auswahl ab.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && pick(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => useDnd.setState({ dragging: null })} autoScroll={{ threshold: { x: 0.12, y: 0.15 } }}>
      {children}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.3,1)' }}>
        {dragging ? (
          <motion.div className="drag-ghost" initial={{ scale: 0.9, rotate: 0 }} animate={{ scale: 1.06, rotate: -2 }}>
            {dragging.label}
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface PickableProps {
  payload: Payload;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
  title?: string;
  disabled?: boolean;
}

/** Ziehbar und per Tippen auswählbar. */
export function Pickable({ payload, children, className = '', style, as: Tag = 'div', title, disabled }: PickableProps) {
  const key = payloadKey(payload);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: key, data: payload, disabled });
  const picked = useDnd((s) => s.picked);
  const isPicked = !!picked && payloadKey(picked) === key;

  const onClick = (e: React.MouseEvent) => {
    if (Date.now() - useDnd.getState().lastDragEnd < 300) return e.stopPropagation();
    // Ist schon etwas anderes ausgewählt und liegt dieses Element in einem passenden Ziel,
    // gilt das Tippen dem Ziel (z. B. Rezept auf einen Tag mit Terminen ablegen).
    const host = (e.currentTarget as HTMLElement).parentElement?.closest('.dropzone.can-drop');
    if (picked && !isPicked && host) return;
    e.stopPropagation();
    const pending = useDnd.getState().pendingTarget;
    if (pending && accepts(payload, pending.target)) {
      applyDrop(payload, pending.target, useDnd.getState().owner);
      useDnd.setState({ pendingTarget: null });
      return;
    }
    pick(isPicked ? null : payload);
  };

  return (
    <Tag
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-pressed={isPicked}
      title={title}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onClick(e as unknown as React.MouseEvent);
        else listeners?.onKeyDown?.(e);
      }}
      className={`pickable ${isPicked ? 'is-picked' : ''} ${isDragging ? 'is-dragging' : ''} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}

interface DropZoneProps {
  target: Target;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
  /** Antippen, wenn nichts ausgewählt ist (z. B. neuen Termin anlegen) */
  onEmptyClick?: () => void;
  label?: string;
  /** Ohne `onEmptyClick`: Antippen merkt das Ziel vor, das nächste passende Element landet hier. */
  selectable?: boolean;
}

/** Ablageziel für beide Wege. Zeigt an, ob das aktive Element hier passt. */
export function DropZone({ target, children, className = '', style, as: Tag = 'div', onEmptyClick, label, selectable }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: targetKey(target), data: target });
  const active = useActivePayload();
  const fits = !!active && accepts(active, target);
  const pending = useDnd((s) => s.pendingTarget);
  const isPending = !!pending && targetKey(pending.target) === targetKey(target);

  const onClick = () => {
    const picked = useDnd.getState().picked;
    if (picked) {
      if (accepts(picked, target)) {
        applyDrop(picked, target, useDnd.getState().owner);
        pick(null);
      }
      return;
    }
    if (onEmptyClick) onEmptyClick();
    else if (selectable) useDnd.setState({ pendingTarget: isPending ? null : { target, label: label ?? 'Ziel' } });
  };

  return (
    <Tag
      ref={setNodeRef}
      onClick={onClick}
      aria-label={label}
      className={`dropzone ${fits ? 'can-drop' : ''} ${fits && isOver ? 'is-over' : ''} ${isPending ? 'is-pending' : ''} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}

/** Hinweisleiste während Click&Drop. */
export function PickBanner({ actions }: { actions?: ReactNode }) {
  const picked = useDnd((s) => s.picked);
  const pending = useDnd((s) => s.pendingTarget);
  return (
    <AnimatePresence>
      {pending && !picked && (
        <motion.div key="pending" className="pick-banner" role="status" aria-live="polite" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
          <span className="pick-banner__dot" />
          <span className="grow">
            <b>{pending.label}</b> gewählt – jetzt Rezept antippen
          </span>
          <button className="btn ghost" onClick={() => useDnd.setState({ pendingTarget: null })}>
            Abbrechen
          </button>
        </motion.div>
      )}
      {picked && (
        <motion.div key="picked" className="pick-banner" role="status" aria-live="polite" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
          <span className="pick-banner__dot" />
          <span className="grow">
            <b>{picked.label}</b> ausgewählt – jetzt Ziel antippen
          </span>
          {actions}
          <button className="btn ghost" onClick={() => pick(null)}>
            Abbrechen
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TrashZone() {
  const active = useActivePayload();
  const show = !!active && (active.type === 'event' || active.type === 'meal');
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="trash-wrap">
          <DropZone target={{ type: 'trash' }} className="trash" label="Hier ablegen zum Entfernen">
            🗑 Entfernen
          </DropZone>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
