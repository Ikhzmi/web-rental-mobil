import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';

function LoadingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-3 transition-colors duration-300">
      <div className="w-8 h-8 border-2 border-slate-300 dark:border-white/20 border-t-[#e8702a] rounded-full animate-spin" />
      <p className="text-xs font-medium text-slate-500 dark:text-white/50">Memeriksa akses super admin...</p>
    </div>
  );
}

export default function RequireSuperAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, isSuperAdmin, loading: profileLoading, error } = useProfile();

  // Show loading while session and profile are being checked
  if (sessionLoading || profileLoading) {
    return <LoadingPage />;
  }

  // No session - redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If there was an error fetching profile and no profile data, stay loading/fallback instead of booting immediately
  if (error && !profile) {
    return <LoadingPage />;
  }

  // Not a super_admin - redirect to home
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Has session and is super_admin - render children
  return <Outlet />;
}
