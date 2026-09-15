import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { checkAndRefreshToken, startSessionHeartbeat } from '../lib/sessionManager';
import SessionExpiredPopup from '../components/SessionExpiredPopup';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionExpiredContextType {
  markExpired: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextType | undefined>(undefined);

// Custom event name — must match the one in api.ts
const SESSION_EXPIRED_EVENT = 'session:expired';
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

  // Handle session expiration — TAPI verifikasi dulu ke Supabase:
  // sinyal expired palsu (race refresh antar tab, 401 sesaat) TIDAK BOLEH
  // memaksa logout. Sign out lokal hanya bila sesi benar-benar tidak ada.
  // Multi-device aman: scope 'local' tidak mengganggu perangkat lain.
  const handleExpiration = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return;
      }
    } catch {
      // Gagal membaca sesi (mis. storage error) — lanjut ke alur expired
    }
    setIsExpired(true);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore local sign out errors
    }
  }, []);

  // Auto-dismiss popup sesi berakhir setelah 5 detik
  useEffect(() => {
    if (isExpired) {
      const timer = setTimeout(() => {
        setIsExpired(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isExpired]);

  // Update activity timestamp ke waktu sekarang
  const recordActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Track user activity (mousemove, keydown, click, scroll, touchstart)
  useEffect(() => {
    let lastUpdate = 0;
    const THROTTLE_MS = 5000; // Throttle ke localStorage maksimal setiap 5 detik

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > THROTTLE_MS) {
        lastUpdate = now;
        recordActivity();
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [recordActivity]);

  // Heartbeat: Selama tab terbuka dan terlihat, perbarui aktivitas secara otomatis setiap 1 menit
  useEffect(() => {
    recordActivity();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        recordActivity();
      }
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivity();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [recordActivity]);

  // Heartbeat keep-alive: selagi tab terlihat, segarkan token proaktif
  // tiap 10 menit supaya sesi tidak pernah kedaluwarsa saat dipakai.
  useEffect(() => {
    return startSessionHeartbeat();
  }, []);

  // Saat tab kembali terlihat/fokus (mis. setelah lama ditinggal), langsung
  // cek & refresh token — mencegah 401 pertama setelah idle panjang.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkAndRefreshToken();
      }
    };
    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, []);

  // Listen for SESSION_EXPIRED_EVENT dispatched by api.ts saat token kedaluwarsa & gagal refresh
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
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setIsExpired(false);
        recordActivity();
      }
    });

    return () => subscription.unsubscribe();
  }, [recordActivity]);

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
