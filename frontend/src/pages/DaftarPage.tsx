import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function DaftarPage() {
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
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center px-5 py-24">
        <div ref={revealRef} className="w-full max-w-sm text-center rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-8">
          <h1 className="font-playfair italic text-white text-2xl mb-2">Cek email kamu</h1>
          <p className="text-white/50 text-sm mb-6">
            Kami sudah mengirim tautan konfirmasi ke <span className="text-white">{email}</span>.
            Klik tautan itu untuk mengaktifkan akun sebelum login.
          </p>
          <Link to="/login" className="text-[#2563eb] text-sm hover:underline">
            Kembali ke halaman Masuk
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center px-5 py-24">
      <div ref={revealRef} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-playfair italic text-white text-3xl mb-1">Daftar</h1>
          <p className="text-white/50 text-sm">Buat akun untuk mulai menyewa mobil</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-6 flex flex-col gap-4"
        >
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Nama Lengkap</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40"
              placeholder="Nama sesuai KTP"
            />
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">No. HP</label>
            <input
              type="tel"
              required
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40"
              placeholder="Minimal 8 karakter"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-3 rounded-full transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Daftar
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-[#2563eb] hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
