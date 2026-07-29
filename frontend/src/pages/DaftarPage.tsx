import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

export default function DaftarPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const revealRef = useScrollReveal<HTMLDivElement>({ y: 16, stagger: 0.1, dependencies: [done] });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // `options.data` masuk ke `raw_user_meta_data` di auth.users, lalu
    // dibaca trigger `on_auth_user_created` (lihat prisma/sql di backend)
    // untuk mengisi kolom nama & no_hp di tabel profiles secara otomatis.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nama, no_hp: noHp } },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className={`min-h-screen flex items-center justify-center px-5 py-24 transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <motion.div
          ref={revealRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center p-8 sa-glass-light"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}
          >
            <svg className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </motion.div>
          <h1 className={`font-playfair italic text-2xl mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Cek email kamu</h1>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Kami sudah mengirim tautan konfirmasi ke <span className={isDark ? 'text-white' : 'text-slate-900'}>{email}</span>.
            Klik tautan itu untuk mengaktifkan akun sebelum login.
          </p>
          <Link to="/login" className={`text-sm hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            Kembali ke halaman Masuk
          </Link>
        </motion.div>
      </main>
    );
  }

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
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Daftar</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Buat akun untuk mulai menyewa mobil</p>
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
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nama Lengkap</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className={`w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 focus:scale-[1.02] ${
                isDark
                  ? 'glass-input focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
              }`}
              placeholder="Nama sesuai KTP"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
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
            transition={{ delay: 0.25 }}
          >
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. HP</label>
            <input
              type="tel"
              required
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              className={`w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 focus:scale-[1.02] ${
                isDark
                  ? 'glass-input focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
              }`}
              placeholder="08xxxxxxxxxx"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
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
              placeholder="Minimal 8 karakter"
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`mt-1 py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'glass-daftar-btn-dark'
                : 'glass-daftar-btn-light'
            }`}
          >
            {loading && <Loader2 size={16} className={`animate-spin ${!isDark && 'text-[#1F2937]'}`} />}
            Daftar
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`text-center text-sm mt-6 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
        >
          Sudah punya akun?{' '}
          <Link to="/login" className={`font-medium hover:underline ${isDark ? 'text-blue-400' : 'text-[#1F2937]'}`}>
            Masuk
          </Link>
        </motion.p>
      </motion.div>
    </main>
  );
}
