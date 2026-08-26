import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import LoginBackgroundV4 from '../components/background/LoginBackgroundV4';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const expired = searchParams.get('expired') === 'true';
  const verified = searchParams.get('verified') === 'true';
  const reset = searchParams.get('reset') === 'true';
  const registered = searchParams.get('registered') === 'true';
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { session } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (!session || profileLoading) return;
    if (profile?.role === 'super_admin') {
      window.location.href = '/superadmin';
    } else if (profile?.role === 'admin') {
      window.location.href = '/admin';
    }
  }, [session, profile, profileLoading]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lupa password — sebelumnya tidak ada entry point sama sekali dari
  // halaman ini untuk mulai alur reset password (satu-satunya cara
  // sebelumnya cuma dari halaman Profil, yang perlu login dulu — kontradiktif
  // untuk skenario "lupa password").
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setForgotLoading(false);
    if (resetError) {
      setForgotError(resetError.message);
      return;
    }
    setForgotSent(true);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (googleError) {
      setGoogleLoading(false);
      setError(googleError.message);
    }
    // Jika success, browser akan redirect ke Google, jadi setGoogleLoading
    // tidak akan kembali ke false kecuali ada error
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError, data: authData } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    if (authData?.user) {
      try {
        const profile = await api.getMyProfile();

        setLoading(false);

        if (profile.role === 'super_admin') {
          window.location.href = '/superadmin';
          return;
        }

        if (profile.role === 'admin') {
          window.location.href = '/admin';
          return;
        }
      } catch {
        setLoading(false);
      }
    }

    setLoading(false);
    // Strip expired param before redirecting
    navigate(redirect === '/' ? '/' : redirect, { replace: true });
  };

  return (
    <LoginBackgroundV4>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ transform: 'none', willChange: 'auto' }}
        className={`
          w-full max-w-sm rounded-2xl overflow-hidden p-8
          ${isDark
            ? 'login-card-dark'
            : 'login-card-light'
          }
        `}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>Masuk</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-stone-500'}`}>Lanjutkan ke akun KerenTal Kita kamu</p>
        </motion.div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {expired && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-3 py-2 rounded-xl ${
                isDark
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-amber-50 border border-amber-200 text-amber-600'
              }`}
            >
              Sesi kamu telah berakhir. Silakan login kembali.
            </motion.p>
          )}

          {verified && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-3 py-2 rounded-xl ${
                isDark
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-green-50 border border-green-200 text-green-600'
              }`}
            >
              Email berhasil diverifikasi. Silakan login.
            </motion.p>
          )}

          {reset && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-3 py-2 rounded-xl ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white/70'
                  : 'bg-slate-50 border border-slate-200 text-slate-600'
              }`}
            >
              Password berhasil direset. Silakan login dengan password baru.
            </motion.p>
          )}

          {registered && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-3 py-2 rounded-xl ${
                isDark
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-green-50 border border-green-200 text-green-600'
              }`}
            >
              Akun berhasil dibuat. Silakan login.
            </motion.p>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-3 py-2 rounded-xl ${
                isDark
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {error}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-stone-600'}`}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${
                isDark ? 'login-input-dark' : 'login-input-light'
              }`}
              placeholder="nama@email.com"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs ${isDark ? 'text-white/60' : 'text-stone-600'}`}>Password</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className={`text-xs hover:underline ${isDark ? 'text-white/50 hover:text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Lupa password?
              </button>
            </div>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${
                isDark ? 'login-input-dark' : 'login-input-light'
              }`}
              placeholder="********"
            />
          </motion.div>

          {/* Google Sign In Button */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22 }}
            className="relative"
          >
            <div className={`absolute inset-0 flex items-center ${isDark ? 'text-white/20' : 'text-stone-300'}`}>
              <div className="w-full border-t border-current" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className={`px-2 ${isDark ? 'bg-[#0a0f1a]/90' : 'bg-white/80'}`}>atau</span>
            </div>
          </motion.div>

          <motion.button
            type="button"
            disabled={googleLoading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            whileHover={{ scale: googleLoading ? 1 : 1.02 }}
            whileTap={{ scale: googleLoading ? 1 : 0.98 }}
            onClick={handleGoogleSignIn}
            className={`py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all border ${
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {googleLoading ? (
              <Loader2 size={16} className={`animate-spin ${isDark ? 'text-white' : 'text-stone-700'}`} />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {googleLoading ? 'Mengalihkan...' : 'Masuk dengan Google'}
          </motion.button>

          <motion.button
            type="submit"
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`mt-2 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'glass-cta-dark'
                : 'glass-booking-btn-light'
            }`}
          >
            {loading && <Loader2 size={16} className={`animate-spin ${isDark ? 'text-white' : 'text-slate-900'}`} />}
            Masuk
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-center text-sm mt-6 ${isDark ? 'text-white/40' : 'text-stone-500'}`}
        >
          Belum punya akun?{' '}
          <Link to="/daftar" className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Daftar
          </Link>
        </motion.p>
      </motion.div>

      {/* Modal lupa password */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowForgotModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl overflow-hidden p-6 ${isDark ? 'login-card-dark' : 'login-card-light'}`}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className={`font-playfair italic text-xl ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Reset Password
                </h2>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className={isDark ? 'text-white/40 hover:text-white' : 'text-stone-400 hover:text-stone-700'}
                >
                  <X size={18} />
                </button>
              </div>

              {forgotSent ? (
                <div className="text-center py-4">
                  <Mail size={28} className={`mx-auto mb-3 ${isDark ? 'text-white/40' : 'text-stone-400'}`} />
                  <p className={`text-sm ${isDark ? 'text-white/70' : 'text-stone-600'}`}>
                    Kalau email <strong>{forgotEmail}</strong> terdaftar, link reset password sudah dikirim. Cek inbox (dan folder spam).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-stone-500'}`}>
                    Masukkan email akunmu, kami kirim link untuk buat password baru.
                  </p>
                  {forgotError && (
                    <p className={`text-xs px-3 py-2 rounded-xl ${
                      isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
                    }`}>
                      {forgotError}
                    </p>
                  )}
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${
                      isDark ? 'login-input-dark' : 'login-input-light'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className={`py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${
                      isDark ? 'glass-cta-dark' : 'glass-booking-btn-light'
                    }`}
                  >
                    {forgotLoading && <Loader2 size={16} className="animate-spin" />}
                    Kirim Link Reset
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LoginBackgroundV4>
  );
}