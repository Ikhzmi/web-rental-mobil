import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import SessionExpiredPopup from '../components/SessionExpiredPopup';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionExpiredContextType {
  markExpired: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextType | undefined>(undefined);

// Custom event name — must match the one in api.ts
const SESSION_EXPIRED_EVENT = 'session:expired';
// Timeout 30 menit ketika tidak ada aktivitas/tidak membuka web
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'kerental_last_activity';

export function useSessionExpired() {
  const context = useContext(SessionExpiredContext);
  if (!context) {
    throw new Error('useSessionExpired must be used within SessionExpiredProvider');
  }
  return context;
}

export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const [isExpired, setIsExpired] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle session expiration — show popup, clear activity timestamp, then sign out
  const handleExpiration = useCallback(() => {
    setIsExpired(true);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    supabase.auth.signOut().catch(() => {});
  }, []);

  // Function to check if 30 minutes of inactivity has elapsed
  const checkInactivity = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        return;
      }

      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      const now = Date.now();

      if (lastActivityStr) {
        const lastActivity = parseInt(lastActivityStr, 10);
        if (now - lastActivity >= INACTIVITY_TIMEOUT_MS) {
          handleExpiration();
          return;
        }
      } else {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }
    } catch {
      // Ignore session check errors
    }
  }, [handleExpiration]);

  // Track user activity (mousemove, keydown, click, scroll, touchstart)
  useEffect(() => {
    let lastUpdate = 0;
    const THROTTLE_MS = 5000; // Throttle localStorage update to every 5s max

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > THROTTLE_MS) {
        lastUpdate = now;

        const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          if (now - lastActivity >= INACTIVITY_TIMEOUT_MS) {
            checkInactivity();
            return;
          }
        }
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [checkInactivity]);

  // Periodic check (every 10 seconds) & check on tab visibility or window focus
  useEffect(() => {
    checkInactivity();

    const interval = setInterval(() => {
      checkInactivity();
    }, 10_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [checkInactivity]);

  // Listen for SESSION_EXPIRED_EVENT dispatched by api.ts on 401
  useEffect(() => {
    const handler = () => handleExpiration();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [handleExpiration]);

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsExpired(false);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setIsExpired(false);
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = useCallback(async () => {
    setIsExpired(false);
    const currentPath = location.pathname;
    navigate(`/login?redirect=${encodeURIComponent(currentPath)}&expired=true`);
  }, [navigate, location.pathname]);

  const handleDismiss = useCallback(() => {
    setIsExpired(false);
  }, []);

  return (
    <SessionExpiredContext.Provider value={{ markExpired: () => setIsExpired(true) }}>
      {children}
      <SessionExpiredPopup
        isOpen={isExpired}
        onClose={handleDismiss}
        onLogin={handleLogin}
      />
    </SessionExpiredContext.Provider>
  );
}
