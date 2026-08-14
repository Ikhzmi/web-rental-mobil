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

  // Handle session expiration — show popup, then sign out
  const handleExpiration = useCallback(() => {
    setIsExpired(true);
    // Sign out from Supabase (but keep popup visible so user sees message)
    supabase.auth.signOut().catch(() => {});
  }, []);

  useEffect(() => {
    // Listen for SESSION_EXPIRED_EVENT dispatched by api.ts on 401
    const handler = () => handleExpiration();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [handleExpiration]);

  useEffect(() => {
    // Also listen for auth state changes (e.g., tab closed elsewhere)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsExpired(false);
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setIsExpired(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = useCallback(async () => {
    setIsExpired(false);
    // Redirect to login with return URL
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
