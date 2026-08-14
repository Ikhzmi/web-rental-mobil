import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';

function LoadingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#e8702a] rounded-full animate-spin" />
    </div>
  );
}

export default function RequireSuperAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  // Show loading while session and profile are being checked
  if (sessionLoading || profileLoading) {
    return <LoadingPage />;
  }

  // No session - redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Not a super_admin - redirect to home
  if (profile?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  // Has session and is super_admin - render children
  return <Outlet />;
}
