import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const revealRef = useScrollReveal<HTMLDivElement>({ y: 16, stagger: 0.1 });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate(redirect);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center px-5 py-24">
      <div ref={revealRef} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-playfair italic text-white text-3xl mb-1">Masuk</h1>
          <p className="text-white/50 text-sm">Lanjutkan ke akun KerenTal Kita kamu</p>
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
            <label className="text-white/60 text-xs mb-1.5 block">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-3 rounded-full transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Masuk
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          Belum punya akun?{' '}
          <Link to="/daftar" className="text-[#2563eb] hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}
