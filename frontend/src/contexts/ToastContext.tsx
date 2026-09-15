import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { onSessionExpired } from '../lib/api';
import { useTheme } from '../hooks/useTheme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  showSessionExpired: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const getToastIcon = (type: ToastType, isDark: boolean) => {
  switch (type) {
    case 'success': return <CheckCircle size={20} className={isDark ? "text-emerald-400" : "text-emerald-500"} />;
    case 'error': return <XCircle size={20} className={isDark ? "text-red-400" : "text-red-500"} />;
    case 'warning': return <AlertCircle size={20} className={isDark ? "text-amber-400" : "text-amber-500"} />;
    case 'info': return <Info size={20} className={isDark ? "text-white/60" : "text-blue-500"} />;
  }
};

const getToastBorder = (type: ToastType, isDark: boolean) => {
  if (isDark) {
    switch (type) {
      case 'success': return 'border-emerald-500/30';
      case 'error': return 'border-red-500/30';
      case 'warning': return 'border-amber-500/30';
      case 'info': return 'border-white/20';
    }
  } else {
    switch (type) {
      case 'success': return 'border-emerald-500/40';
      case 'error': return 'border-red-500/40';
      case 'warning': return 'border-amber-500/40';
      case 'info': return 'border-blue-500/30';
    }
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen for session expired events from API - tampilkan notifikasi toast tanpa paksa hard redirect
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      const id = `toast-session-${Date.now()}`;
      const newToast: Toast = {
        id,
        type: 'warning',
        title: 'Sesi Berakhir',
        message: 'Sesi login telah berakhir. Silakan login kembali.',
      };
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss setelah 5 detik
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast: Toast = { id, type, title, message };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSessionExpired = useCallback(() => {
    const id = `toast-session-${Date.now()}`;
    const newToast: Toast = {
      id,
      type: 'warning',
      title: 'Sesi Berakhir',
      message: 'Silakan login kembali untuk melanjutkan.',
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss setelah 5 detik
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, showSessionExpired }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl animate-slide-in ${
            isDark 
              ? `sa-glass-dark text-white shadow-black/50 ${getToastBorder(toast.type, true)}` 
              : `sa-glass-light text-slate-900 shadow-slate-900/10 ${getToastBorder(toast.type, false)}`
          }`}
        >
          <div className="shrink-0 mt-0.5">{getToastIcon(toast.type, isDark)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{toast.title}</p>
            {toast.message && (
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className={`shrink-0 transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export default ToastProvider;
