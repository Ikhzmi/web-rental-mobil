import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Halaman callback untuk:
 * 1. Email verification dari Supabase
 * 2. Google OAuth redirect
 *
 * Flow:
 * - Email: User klik link -> redirect ke /auth/callback?token=xxx
 * - Google: OAuth callback -> /auth/callback?provider=google&code=xxx
 * - Kedua flow menggunakan getSessionFromUrl() untuk exchange token
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const redirectTo = searchParams.get('redirect_to');
      const errorParam = searchParams.get('error_description') || searchParams.get('error');

      if (errorParam) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(errorParam);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      console.log('[AuthCallback] Params:', {
        code: code ? 'present' : 'missing',
        token: token ? 'present' : 'missing',
        type,
        redirectTo,
      });

      const redirectUserWithRole = async (accessToken: string, defaultPath: string) => {
        try {
          const { data: { user } } = await supabase.auth.getUser(accessToken);
          if (user?.id) {
            const { data: p } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle();

            if (p?.role === 'super_admin') {
              window.location.href = '/superadmin';
              return;
            }
            if (p?.role === 'admin') {
              window.location.href = '/admin';
              return;
            }
          }

          const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/profiles/me`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (res.ok) {
            const json = await res.json();
            const profile = json?.data || json;
            if (profile?.role === 'super_admin') {
              window.location.href = '/superadmin';
              return;
            }
            if (profile?.role === 'admin') {
              window.location.href = '/admin';
              return;
            }
          }
        } catch (e) {
          console.error('[AuthCallback] Role check error:', e);
        }
        navigate(defaultPath || '/', { replace: true });
      };

      // Flow 1: OAuth PKCE flow (Google OAuth mengirim ?code=xxx)
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('[AuthCallback] exchangeCodeForSession error, falling back to getSession:', error);
            const { data: fallbackData } = await supabase.auth.getSession();
            if (fallbackData.session && isMounted) {
              setStatus('success');
              const sessionToken = fallbackData.session.access_token;
              setTimeout(() => redirectUserWithRole(sessionToken, redirectTo || '/'), 1200);
              return;
            }
            if (isMounted) {
              setStatus('error');
              setErrorMessage(error.message || 'Gagal memproses autentikasi Google.');
              setTimeout(() => navigate('/login', { replace: true }), 3000);
            }
            return;
          }

          if (data.session && isMounted) {
            setStatus('success');
            const sessionToken = data.session.access_token;
            setTimeout(() => redirectUserWithRole(sessionToken, redirectTo || '/'), 1200);
            return;
          }
        } catch (err) {
          console.error('[AuthCallback] Error during code exchange:', err);
        }
      }

      // Flow 2: Email confirmation / recovery
      // Supabase PKCE flow mengirim ?token_hash=xxx&type=recovery
      // Supabase Implicit flow (lama) mengirim ?token=xxx&type=recovery
      const tokenHash = searchParams.get('token_hash');
      const effectiveToken = tokenHash || token;
      const effectiveType = type as 'signup' | 'recovery' | 'email_change' | 'invite' | 'magiclink' | null;

      if (effectiveToken && effectiveType) {
        try {
          if (effectiveType === 'recovery') {
            // JANGAN panggil verifyOtp di sini — itu membuat sesi penuh (auto-login).
            // Teruskan token_hash ke ResetPasswordPage yang akan handle verifikasi
            // dan menampilkan form ganti password tanpa login otomatis.
            const dest = tokenHash
              ? `/reset-password?token_hash=${encodeURIComponent(tokenHash)}`
              : '/reset-password';
            if (isMounted) navigate(dest, { replace: true });
            return;

          } else if (effectiveType === 'signup') {
            if (tokenHash) {
              await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' });
            }
            const { data } = await supabase.auth.getSession();
            if (isMounted) {
              setStatus('success');
              setTimeout(() => navigate(data?.session ? (redirectTo || '/') : '/login?verified=true', { replace: true }), 1500);
            }
            return;

          } else if (effectiveType === 'email_change') {
            if (tokenHash) {
              await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email_change' });
            }
            if (isMounted) {
              setStatus('success');
              setTimeout(() => navigate('/akun/profil', { replace: true }), 1500);
            }
            return;
          }
        } catch (err) {
          console.error('[AuthCallback] Token verification error:', err);
        }
      }

      // Flow 3: Cek sesi yang sudah terbentuk (Implicit OAuth hash atau SDK auto-detect)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        setStatus('success');
        const sessionToken = session.access_token;
        setTimeout(() => redirectUserWithRole(sessionToken, redirectTo || '/'), 1200);
        return;
      }

      // Beri jeda kecil untuk listener onAuthStateChange jika exchange sedang berlangsung
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          if (isMounted) {
            setStatus('success');
            const sessionToken = newSession.access_token;
            setTimeout(() => redirectUserWithRole(sessionToken, redirectTo || '/'), 1000);
          }
        }
      });

      // Timeout fallback jika tidak ada sesi dalam 3.5 detik
      const timeoutId = setTimeout(() => {
        subscription.unsubscribe();
        if (isMounted && status === 'loading') {
          setStatus('error');
          setErrorMessage('Sesi login tidak ditemukan atau telah kedaluwarsa.');
          setTimeout(() => navigate('/login', { replace: true }), 2500);
        }
      }, 3500);

      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center p-8 max-w-md">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <h2 className="text-xl font-semibold text-white mb-2">Memproses...</h2>
            <p className="text-white/60">Mohon tunggu sebentar</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Berhasil!</h2>
            <p className="text-white/60">Mengalihkan ke halaman utama...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Gagal</h2>
            <p className="text-white/60">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}