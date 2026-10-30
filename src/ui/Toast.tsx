import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useStore } from '../store/store';
import { Icon } from './Icon';

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
          <motion.div key={toast.id} className="toast" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <span>{toast.text}</span>
            {toast.undo && (
              <button className="btn sm" onClick={undo}>
                <Icon name="undo" size={16} /> Rückgängig
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
