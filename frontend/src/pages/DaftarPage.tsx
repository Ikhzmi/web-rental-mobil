import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';
import LoginBackgroundV4 from '../components/background/LoginBackgroundV4';

// Password validation rules
const passwordRules = [
  { id: 'length', label: 'Minimal 8 karakter', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'Minimal 1 huruf besar', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'number', label: 'Minimal 1 angka', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Minimal 1 karakter khusus (!@#$%)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  const passedRules = passwordRules.filter(rule => rule.test(password)).length;

  if (passedRules === 0) return { level: 0, label: '', color: '' };
  if (passedRules <= 1) return { level: 1, label: 'Lemah', color: 'bg-red-500' };
  if (passedRules <= 2) return { level: 2, label: 'Sedang', color: 'bg-amber-500' };
  if (passedRules <= 3) return { level: 3, label: 'Cukup', color: 'bg-yellow-500' };
  return { level: 4, label: 'Kuat', color: 'bg-emerald-500' };
}

function validatePassword(password: string): string | null {
  for (const rule of passwordRules) {
    if (!rule.test(password)) {
      return rule.label;
    }
  }
  return null;
}

// Phone number validation for Indonesian format
function validatePhone(phone: string): string | null {
  if (!phone) return 'Nomor HP wajib diisi';
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  if (!/^(\+62|62|0)[0-9]{9,12}$/.test(cleanPhone)) {
    return 'Format nomor HP tidak valid (contoh: 081234567890)';
  }
  return null;
}

export default function DaftarPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordError = validatePassword(password);
  const phoneError = touched.noHp ? validatePhone(noHp) : null;
  const passwordStrength = getPasswordStrength(password);
  const canSubmit = nama && email && noHp && !passwordError && !phoneError;

  // Handle email/password registration
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Final validation before submit
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(`Password: ${pwdError}`);
      setLoading(false);
      return;
    }

    const phoneValidation = validatePhone(noHp);
    if (phoneValidation) {
      setError(phoneValidation);
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nama, no_hp: noHp },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // Registration successful - redirect to login with success message
    navigate('/login?registered=true');
  };

  // Handle Google Sign In (for registration via Google)
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
    // If success, browser redirects to Google
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
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>Daftar</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-stone-500'}`}>Buat akun untuk mulai menyewa mobil</p>
        </motion.div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
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
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-stone-600'}`}>Nama Lengkap</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${
                isDark ? 'login-input-dark' : 'login-input-light'
              }`}
              placeholder="Nama sesuai KTP"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
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
            transition={{ delay: 0.25 }}
          >
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-stone-600'}`}>No. HP</label>
            <input
              type="tel"
              required
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, noHp: true }))}
              className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${
                isDark ? 'login-input-dark' : 'login-input-light'
              } ${phoneError ? 'border-red-500/50' : ''}`}
              placeholder="08xxxxxxxxxx"
            />
            {phoneError && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                <X size={12} /> {phoneError}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-stone-600'}`}>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, password: true }))}
              className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${
                isDark ? 'login-input-dark' : 'login-input-light'
              } ${touched.password && passwordError ? 'border-red-500/50' : ''}`}
              placeholder="Minimal 8 karakter"
            />

            {/* Password strength indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        passwordStrength.level >= level
                          ? passwordStrength.color
                          : isDark ? 'bg-white/10' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {passwordStrength.label && (
                  <p className={`text-xs ${
                    passwordStrength.level <= 1 ? 'text-red-400' :
                    passwordStrength.level <= 2 ? 'text-amber-400' :
                    passwordStrength.level <= 3 ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {passwordStrength.label}
                  </p>
                )}
              </div>
            )}

            {/* Password requirements checklist */}
            {password && (
              <div className="mt-2 space-y-1">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <p
                      key={rule.id}
                      className={`text-xs flex items-center gap-1.5 transition-colors ${
                        passed
                          ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                          : isDark ? 'text-white/40' : 'text-stone-400'
                      }`}
                    >
                      {passed ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <X size={12} />
                      )}
                      {rule.label}
                    </p>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Google Sign In Button */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.32 }}
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
            transition={{ delay: 0.34 }}
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
            {googleLoading ? 'Mengalihkan...' : 'Daftar dengan Google'}
          </motion.button>

          <motion.button
            type="submit"
            disabled={loading || !canSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: loading || !canSubmit ? 1 : 1.02 }}
            whileTap={{ scale: loading || !canSubmit ? 1 : 0.98 }}
            className={`mt-2 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              canSubmit
                ? isDark
                  ? 'glass-cta-dark'
                  : 'glass-booking-btn-light'
                : isDark
                  ? 'bg-white/5 text-white/40 cursor-not-allowed'
                  : 'bg-slate-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            {loading && <Loader2 size={16} className={`animate-spin ${isDark ? 'text-white' : 'text-stone-900'}`} />}
            Daftar
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`text-center text-sm mt-6 ${isDark ? 'text-white/40' : 'text-stone-500'}`}
        >
          Sudah punya akun?{' '}
          <Link to="/login" className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Masuk
          </Link>
        </motion.p>
      </motion.div>
    </LoginBackgroundV4>
  );
}
