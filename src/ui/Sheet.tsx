import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import './sheet.css';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Modales Blatt: von unten auf Hochkant-Displays, mittig im Querformat. Wischen nach unten schließt. */
export function Sheet({ open, onClose, title, children, footer, wide }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`sheet ${wide ? 'wide' : ''}`}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div className="sheet-grip" onPanEnd={(_, info) => info.offset.y > 80 && onClose()} aria-hidden />
            <header className="sheet-head">
              <h2>{title}</h2>
              <button className="btn icon ghost" onClick={onClose} aria-label="Schließen">
                <Icon name="close" />
              </button>
            </header>
            <div className="sheet-body">{children}</div>
            {footer && <footer className="sheet-foot">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
