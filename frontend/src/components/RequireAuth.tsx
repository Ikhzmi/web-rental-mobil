import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';

function GuardFallback() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#2563eb] rounded-full animate-spin" />
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
