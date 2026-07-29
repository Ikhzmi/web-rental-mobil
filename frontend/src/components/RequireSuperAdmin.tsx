import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-medium mb-2">Akses Ditolak</h1>
        <p className="text-white/50 text-sm mb-6">
          Halaman ini hanya bisa diakses oleh Super Admin platform.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2.5 rounded-full transition-colors"
        >
          Kembali ke Beranda
        </a>
      </div>
    </div>
  );
}

export default function RequireSuperAdmin() {
  const { session, loading: sessionLoading } = useSession();
  console.log('RequireSuperAdmin - session:', session?.user?.email, 'loading:', sessionLoading);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: api.getMyProfile,
    enabled: !!session,
  });

  console.log('RequireSuperAdmin - profile:', profile?.role, 'profileLoading:', profileLoading);

  const isSuperAdmin = (profile?.role as string) === 'super_admin';
  const loading = sessionLoading || (!!session && profileLoading);

  console.log('RequireSuperAdmin - isSuperAdmin:', isSuperAdmin, 'loading:', loading);

  if (loading) {
    console.log('RequireSuperAdmin - showing loading');
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#e8702a] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    console.log('RequireSuperAdmin - redirect to login');
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    console.log('RequireSuperAdmin - showing forbidden');
    return <ForbiddenPage />;
  }

  console.log('RequireSuperAdmin - rendering children');
  return <Outlet />;
}
