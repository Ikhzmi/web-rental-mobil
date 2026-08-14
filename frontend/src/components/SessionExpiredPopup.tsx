import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface SessionExpiredPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export default function SessionExpiredPopup({ isOpen, onClose, onLogin }: SessionExpiredPopupProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`
              relative z-[201] w-full max-w-sm mx-4 p-6 rounded-2xl
              ${isDark
                ? 'login-card-dark'
                : 'login-card-light'
              }
            `}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className={`
                absolute top-4 right-4 p-2 rounded-full transition-colors
                ${isDark
                  ? 'text-white/50 hover:text-white hover:bg-white/10'
                  : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }
              `}
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="text-center">
              {/* Icon */}
              <div className={`
                w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
                ${isDark
                  ? 'bg-amber-500/10'
                  : 'bg-amber-100'
                }
              `}>
                <svg
                  className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-500'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Sesi Berakhir
              </h2>

              <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-stone-500'}`}>
                Sesi kamu telah berakhir. Silakan login kembali untuk melanjutkan.
              </p>

              {/* CTA Button */}
              <button
                onClick={onLogin}
                className={`
                  w-full py-3 px-6 rounded-xl font-medium text-sm
                  flex items-center justify-center gap-2
                  transition-all hover:scale-[1.02] active:scale-[0.98]
                  ${isDark
                    ? 'glass-cta-dark'
                    : 'glass-booking-btn-light'
                  }
                `}
              >
                <LogIn size={16} />
                Login Ulang
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
