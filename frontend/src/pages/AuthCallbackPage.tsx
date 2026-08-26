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
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const redirectTo = searchParams.get('redirect_to');

      console.log('[AuthCallback] Params:', { token: token ? 'present' : 'missing', type, redirectTo });

      // Jika tidak ada token (misalnya user akses langsung /auth/callback)
      if (!token) {
        console.log('[AuthCallback] No token found, checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // User sudah login, redirect ke home
          setStatus('success');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        } else {
          // User belum login, redirect ke login
          setStatus('error');
          setErrorMessage('Link verifikasi tidak valid atau sudah kedaluwarsa.');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
        return;
      }

      // Ada token - proses verifikasi
      try {
        if (type === 'signup') {
          // Untuk signup confirmation, kita perlu set session dengan token
          // Supabase auto-handles this via getSession() after the redirect

          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error('[AuthCallback] Error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Verifikasi gagal. Silakan coba lagi.');
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 3000);
            return;
          }

          if (data.session) {
            console.log('[AuthCallback] Session established successfully');
            setStatus('success');

            // Tentukan redirect URL
            const targetUrl = redirectTo || '/';

            setTimeout(() => {
              navigate(targetUrl, { replace: true });
            }, 1500);
          } else {
            // Token valid tapi belum ada session - mungkin email sudah terverifikasi
            // atau perlu login manual
            setStatus('success');
            setTimeout(() => {
              navigate('/login?verified=true', { replace: true });
            }, 1500);
          }
        } else if (type === 'recovery') {
          // PENTING: sebelumnya di sini langsung redirect ke /login?reset=true
          // TANPA PERNAH memberi kesempatan user set password baru — sesi
          // recovery yang sudah aktif ini cuma dibuang begitu saja, padahal
          // update password (supabase.auth.updateUser) wajib dipanggil
          // SELAGI sesi recovery masih aktif. Sekarang diarahkan ke halaman
          // khusus yang benar-benar menjalankan itu.
          navigate('/reset-password', { replace: true });
          return;
        } else if (type === 'email_change') {
          // Email change confirmation
          setStatus('success');
          setTimeout(() => {
            navigate('/akun/profil', { replace: true });
          }, 1500);
        } else {
          // Type tidak dikenal
          setStatus('success');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setStatus('error');
        setErrorMessage('Terjadi kesalahan tak terduga.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
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