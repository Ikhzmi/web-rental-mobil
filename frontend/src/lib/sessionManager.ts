import { supabase } from './supabase';

// Session management constants
export const SESSION_EXPIRED_EVENT = 'session:expired';
const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 menit sebelum expired
const LAST_ACTIVITY_KEY = 'kerental_last_activity';
const LAST_TOKEN_CHECK_KEY = 'kerental_last_token_check';

// Mutex untuk refresh token
let refreshPromise: Promise<string | null> | null = null;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

/**
 * Proactive token refresh dengan retry logic
 * Mencoba refresh token sebelum benar-benar expired
 */
export async function refreshSessionToken(): Promise<string | null> {
  // Jika sudah ada refresh yang sedang berjalan, tunggu hasilnya
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.warn('[SessionManager] Token refresh failed:', error?.message);
        
        // Retry jika belum mencapai max attempts
        if (refreshAttempts < MAX_REFRESH_ATTEMPTS) {
          refreshAttempts++;
          await new Promise(resolve => setTimeout(resolve, 1000 * refreshAttempts)); // exponential backoff
          refreshPromise = null; // Reset promise untuk retry
          return refreshSessionToken(); // Recursive retry
        }
        
        refreshAttempts = 0;
        return null;
      }
      
      refreshAttempts = 0;
      console.log('[SessionManager] Token refreshed successfully');
      localStorage.setItem(LAST_TOKEN_CHECK_KEY, Date.now().toString());
      return data.session.access_token;
    } catch (err) {
      console.error('[SessionManager] Token refresh error:', err);
      refreshAttempts = 0;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Cek apakah token perlu di-refresh secara proaktif
 * Dipanggil saat user activity terdeteksi
 */
export async function checkAndRefreshToken(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      return false;
    }

    // Ambil expiry dari session
    const expiresAt = data.session.expires_at;
    if (!expiresAt) {
      return true; // Token valid, tidak perlu refresh
    }

    const expiryTime = expiresAt * 1000; // Convert ke milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // Jika token akan expired dalam 10 menit, refresh sekarang
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
      console.log('[SessionManager] Token expiring soon, refreshing proactively...');
      const newToken = await refreshSessionToken();
      return newToken !== null;
    }

    // Token sudah expired
    if (timeUntilExpiry <= 0) {
      console.warn('[SessionManager] Token already expired');
      return false;
    }

    return true; // Token masih valid
  } catch (err) {
    console.error('[SessionManager] Error checking token:', err);
    return false;
  }
}

/**
 * Record user activity dan trigger proactive refresh jika perlu
 */
export async function recordActivityAndRefresh(): Promise<void> {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  
  // Cek terakhir kali token dicek
  const lastCheck = localStorage.getItem(LAST_TOKEN_CHECK_KEY);
  const now = Date.now();
  
  // Cek token setiap 5 menit saat ada aktivitas
  if (!lastCheck || now - parseInt(lastCheck) > 5 * 60 * 1000) {
    await checkAndRefreshToken();
  }
}

/**
 * Dispatch session expired event
 */
export function dispatchSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/**
 * Subscribe to session expired event
 */
export function onSessionExpired(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

/**
 * Session heartbeat - ping session setiap interval untuk keep-alive
 */
export function startSessionHeartbeat(intervalMs: number = 10 * 60 * 1000): () => void {
  const interval = setInterval(async () => {
    if (document.visibilityState === 'visible') {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await checkAndRefreshToken();
      }
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
