import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { onSessionExpired } from '../lib/api';

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

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <CheckCircle size={20} className="text-emerald-400" />;
    case 'error': return <XCircle size={20} className="text-red-400" />;
    case 'warning': return <AlertCircle size={20} className="text-amber-400" />;
    case 'info': return <Info size={20} className="text-white/60" />;
  }
};

const getToastBg = (type: ToastType) => {
  switch (type) {
    case 'success': return 'bg-emerald-500/20 border-emerald-500/30';
    case 'error': return 'bg-red-500/20 border-red-500/30';
    case 'warning': return 'bg-amber-500/20 border-amber-500/30';
    case 'info': return 'bg-white/10 border-white/20';
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen for session expired events from API
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      const id = `toast-session-${Date.now()}`;
      const newToast: Toast = {
        id,
        type: 'warning',
        title: 'Sesi Berakhir',
        message: 'Silakan login kembali untuk melanjutkan.',
      };
      setToasts((prev) => [...prev, newToast]);

      // Redirect after showing toast
      setTimeout(() => {
        window.location.href = '/login?expired=true';
      }, 2500);
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

    setTimeout(() => {
      window.location.href = '/login?expired=true';
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, showSessionExpired }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${getToastBg(toast.type)}`}
        >
          <div className="shrink-0 mt-0.5">{getToastIcon(toast.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">{toast.title}</p>
            {toast.message && (
              <p className="text-white/70 text-xs mt-0.5">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 text-white/50 hover:text-white transition-colors"
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
