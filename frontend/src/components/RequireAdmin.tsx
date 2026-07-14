import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';

function GuardFallback() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#2563eb] rounded-full animate-spin" />
    </div>
  );
}

function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={22} className="text-red-400" />
        </div>
        <h1 className="font-playfair italic text-white text-2xl mb-2">Akses Ditolak</h1>
        <p className="text-white/50 text-sm mb-6">
          Halaman ini khusus admin. Akun kamu tidak punya akses ke sini.
        </p>
        <Link to="/" className="text-[#2563eb] text-sm hover:underline">
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}

/**
 * Dipasang di semua route /admin/* — sebelum ini route admin SAMA SEKALI
 * tidak dijaga (siapa pun, bahkan yang belum login, bisa buka /admin).
 * Cek DUA hal: (1) sudah login sama sekali, (2) role di tabel profiles
 * adalah 'admin' — customer yang login tetap ditolak, bukan cuma
 * dibedakan tampilannya di Nav saja.
 */
export default function RequireAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const { isAdmin, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (sessionLoading || profileLoading) return <GuardFallback />;

  if (!session) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!isAdmin) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}