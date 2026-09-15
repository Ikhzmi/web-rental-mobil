import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, Check, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';
import LoginBackgroundV4 from '../components/background/LoginBackgroundV4';
import { SkeletonAuthCard } from '../components/Skeleton';

/**
 * Halaman reset password yang menerima token_hash dari URL
 * (diteruskan oleh AuthCallbackPage dari link email Supabase PKCE).
 * Halaman ini yang memanggil verifyOtp untuk membentuk recovery session
 * BARU setelah user mengisi form — bukan otomatis login saat tiba di sini.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Status verifikasi token dari URL
  const [tokenStatus, setTokenStatus] = useState<'pending' | 'valid' | 'invalid'>('pending');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Verifikasi token_hash saat komponen mount
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    if (!tokenHash) {
      // Tidak ada token — cek apakah sudah ada recovery session aktif
      supabase.auth.getSession().then(({ data }) => {
        setTokenStatus(data.session ? 'valid' : 'invalid');
      });
      return;
    }

    // Panggil verifyOtp dengan token_hash untuk membentuk recovery session
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error: otpError }) => {
      if (otpError) {
        console.error('[ResetPassword] verifyOtp error:', otpError);
        setTokenStatus('invalid');
      } else {
        setTokenStatus('valid');
      }
    });
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    // Sesi recovery sementara ini sengaja diputus setelah password diganti,
    // supaya user login ulang secara normal pakai password barunya —
    // mengonfirmasi password barunya benar-benar tersimpan.
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login?reset=true', { replace: true }), 1500);
  };

  const inputClass = `w-full rounded-xl pl-4 pr-11 py-3 text-sm transition-all duration-200 focus:outline-none ${
    isDark ? 'login-input-dark' : 'login-input-light'
  }`;

  // Loading state saat memverifikasi token_hash dari link email
  if (tokenStatus === 'pending') {
    return (
      <LoginBackgroundV4>
        <div className="flex items-center justify-center p-8 w-full">
          <SkeletonAuthCard />
        </div>
      </LoginBackgroundV4>
    );
  }

  // Tidak ada token valid atau link kedaluwarsa
  if (tokenStatus === 'invalid') {
    return (
      <LoginBackgroundV4>
        <div className={`w-full max-w-sm rounded-2xl overflow-hidden p-8 text-center ${isDark ? 'login-card-dark' : 'login-card-light'}`}>
          <h1 className={`font-playfair italic text-2xl mb-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Link tidak valid
          </h1>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-stone-500'}`}>
            Link reset password ini sudah kedaluwarsa atau sudah pernah dipakai. Silakan minta link baru dari halaman Masuk.
          </p>
          <button
            onClick={() => navigate('/login')}
            className={`w-full py-3 rounded-xl font-medium text-sm ${isDark ? 'glass-cta-dark' : 'glass-booking-btn-light'}`}
          >
            Kembali ke Halaman Masuk
          </button>
        </div>
      </LoginBackgroundV4>
    );
  }

  return (
    <LoginBackgroundV4>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-sm rounded-2xl overflow-hidden p-8 ${isDark ? 'login-card-dark' : 'login-card-light'}`}
      >
        {success ? (
          <div className="text-center py-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
              <Check size={22} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            </div>
            <h1 className={`font-playfair italic text-2xl mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Password Diperbarui
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-stone-500'}`}>
              Mengalihkan ke halaman masuk...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/10' : 'bg-stone-100'}`}>
                <Lock size={20} className={isDark ? 'text-white' : 'text-stone-700'} />
              </div>
              <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Password Baru
              </h1>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-stone-500'}`}>
                Masukkan password baru untuk akunmu
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <p className={`text-xs px-3 py-2 rounded-xl ${
                  isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {error}
                </p>
              )}

              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-stone-600'}`}>Password Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Minimal 8 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark ? 'text-white/40 hover:text-white/80' : 'text-stone-400 hover:text-stone-700'
                    }`}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-stone-600'}`}>Konfirmasi Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Ulangi password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark ? 'text-white/40 hover:text-white/80' : 'text-stone-400 hover:text-stone-700'
                    }`}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`mt-2 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  isDark ? 'glass-cta-dark' : 'glass-booking-btn-light'
                }`}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Simpan Password Baru
              </button>
            </form>
          </>
        )}
      </motion.div>
    </LoginBackgroundV4>
  );
}