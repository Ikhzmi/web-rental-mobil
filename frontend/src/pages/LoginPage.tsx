import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const revealRef = useScrollReveal<HTMLDivElement>({ y: 16, stagger: 0.1 });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Cek role user dan redirect sesuai role
    if (authData?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

      setLoading(false);

      if (profileData?.role === 'super_admin') {
        navigate('/superadmin');
        return;
      }
    }

    setLoading(false);
    navigate(redirect);
  };

  return (
    <main className={`min-h-screen flex items-center justify-center px-5 py-24 transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <motion.div
        ref={revealRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm sa-glass-light p-8"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Masuk</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Lanjutkan ke akun KerenTal Kita kamu</p>
        </motion.div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-3 py-2 rounded-lg ${
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
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 focus:scale-[1.02] ${
                isDark
                  ? 'glass-input focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
              }`}
              placeholder="nama@email.com"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 focus:scale-[1.02] ${
                isDark
                  ? 'glass-input focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
              }`}
              placeholder="********"
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`mt-1 py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'glass-daftar-btn-dark'
                : 'glass-daftar-btn-light'
            }`}
          >
            {loading && <Loader2 size={16} className={`animate-spin ${!isDark && 'text-[#1F2937]'}`} />}
            Masuk
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-center text-sm mt-6 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
        >
          Belum punya akun?{' '}
          <Link to="/daftar" className={`font-medium hover:underline ${isDark ? 'text-blue-400' : 'text-[#1F2937]'}`}>
            Daftar
          </Link>
        </motion.p>
      </motion.div>
    </main>
  );
}
