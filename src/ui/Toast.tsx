import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useStore } from '../store/store';

/** Rückmeldung nach jeder Aktion – mit „Rückgängig“, damit Touch-Fehlgriffe nie wehtun. */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const undo = useStore((s) => s.undo);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useStore.setState({ toast: null }), toast.undo ? 6000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className="toast-host" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="toast" initial={{ y: -30, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}>
            <span>{toast.text}</span>
            {toast.undo && (
              <button className="btn sm" onClick={undo}>
                ↶ Rückgängig
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
