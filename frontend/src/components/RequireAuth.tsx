import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';

function GuardFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-3 transition-colors duration-300">
      <div className="w-8 h-8 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      <p className="text-xs font-medium text-slate-500 dark:text-white/50">Memeriksa sesi login...</p>
    </div>
  );
}

/**
 * Dipasang di route yang butuh login (F6 booking, F7 riwayat, F8 profil).
 * Redirect ke /login?redirect=<path asal> kalau belum ada sesi Supabase
 * — persis pola yang sama dipakai ArmadaDetailPage saat klik "Sewa
 * Sekarang", supaya perilakunya konsisten di seluruh app.
 */
export default function RequireAuth() {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) return <GuardFallback />;

  if (!session) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}
