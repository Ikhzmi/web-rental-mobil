import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * Reusable confirmation modal that replaces browser confirm()
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const styles = {
    danger: { icon: 'text-red-400', iconBg: 'bg-red-500/20', button: 'bg-red-500 hover:bg-red-600 text-white' },
    warning: { icon: 'text-amber-400', iconBg: 'bg-amber-500/20', button: 'bg-amber-500 hover:bg-amber-600 text-white' },
    info: { icon: 'text-blue-400', iconBg: 'bg-blue-500/20', button: 'bg-blue-500 hover:bg-blue-600 text-white' },
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d1424]/95 to-[#0a0f1a]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${styles.iconBg}`}>
                    <AlertTriangle size={20} className={styles.icon} />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-white/70 text-sm leading-relaxed">{message}</p>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-white/[0.02]">
                <button onClick={onClose} disabled={isLoading} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
                  {cancelText}
                </button>
                <button onClick={onConfirm} disabled={isLoading} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${styles.button}`}>
                  {isLoading ? 'Memproses...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmModal;
