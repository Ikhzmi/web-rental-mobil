import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SessionExpiredProvider } from './contexts/SessionExpiredContext';
import { ChatProvider } from './context/ChatContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ComingSoonPage from './components/ComingSoonPage';
import RequireAdmin from './components/RequireAdmin';
import RequireSuperAdmin from './components/RequireSuperAdmin';
import ErrorBoundary from './components/ErrorBoundary';
import { useProfile } from './hooks/useProfile';

/**
 * Preload SEMUA chunk halaman lazy saat browser idle supaya pindah menu
 * TIDAK menampilkan fallback loading (yang bentuknya skeleton dashboard
 * sehingga terlihat seperti "skeleton dashboard terikut" di menu lain).
 * Chunk customer selalu dipreload; chunk admin/superadmin sesuai role.
 */
function RoutePreloader() {
  const { profile } = useProfile();

  useEffect(() => {
    const preload = () => {
      // Customer
      void import('./pages/BookingPage');
      void import('./pages/BookingConfirmationPage');
      void import('./pages/PaymentPage');
      void import('./pages/AkunPesananPage');
      void import('./pages/AkunPesananDetailPage');
      void import('./pages/AkunProfilPage');
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        void import('./pages/admin/AdminDashboardPage');
        void import('./pages/admin/AdminArmadaPage');
        void import('./pages/admin/AdminPesananPage');
        void import('./pages/admin/AdminPesananDetailPage');
        void import('./pages/admin/AdminMessagesPage');
        void import('./pages/admin/AdminCalendarPage');
        void import('./pages/admin/AdminSettingsPage');
        void import('./pages/admin/AdminKeuanganPage');
      }
      if (profile?.role === 'super_admin') {
        void import('./pages/superadmin/SuperAdminDashboardPage');
        void import('./pages/superadmin/SuperAdminBookingsPage');
        void import('./pages/superadmin/SuperAdminTransactionsPage');
        void import('./pages/superadmin/SuperAdminRefundsPage');
        void import('./pages/superadmin/SuperAdminReportsPage');
        void import('./pages/superadmin/SuperAdminInstansiPage');
        void import('./pages/superadmin/SuperAdminAdminPage');
        void import('./pages/superadmin/SuperAdminApprovalPage');
        void import('./pages/superadmin/SuperAdminPencairanPage');
      }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(preload, { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(preload, 2500);
    return () => clearTimeout(t);
  }, [profile?.role]);

  return null;
}

import HomePage from './pages/HomePage';
import ArmadaPage from './pages/ArmadaPage';
import ArmadaDetailPage from './pages/ArmadaDetailPage';
import TentangPage from './pages/TentangPage';
import KontakPage from './pages/KontakPage';
import FaqPage from './pages/FaqPage';
import LoginPage from './pages/LoginPage';
import DaftarPage from './pages/DaftarPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Lazy loaded public pages
const BookingPage = lazy(() => import('./pages/BookingPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const AkunPesananPage = lazy(() => import('./pages/AkunPesananPage'));
const AkunPesananDetailPage = lazy(() => import('./pages/AkunPesananDetailPage'));
const AkunProfilPage = lazy(() => import('./pages/AkunProfilPage'));
const SyaratPage = lazy(() => import('./pages/SyaratPage'));
const PrivasiPage = lazy(() => import('./pages/PrivasiPage'));

// Admin Pages - Lazy loaded (only loaded when admin visits)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminArmadaPage = lazy(() => import('./pages/admin/AdminArmadaPage'));
const AdminPesananPage = lazy(() => import('./pages/admin/AdminPesananPage'));
const AdminPesananDetailPage = lazy(() => import('./pages/admin/AdminPesananDetailPage'));
const AdminMessagesPage = lazy(() => import('./pages/admin/AdminMessagesPage'));
const AdminCalendarPage = lazy(() => import('./pages/admin/AdminCalendarPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminKeuanganPage = lazy(() => import('./pages/admin/AdminKeuanganPage'));

// Super Admin Pages - Lazy loaded (only loaded when super admin visits)
const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const SuperAdminDashboardPage = lazy(() => import('./pages/superadmin/SuperAdminDashboardPage'));
const SuperAdminBookingsPage = lazy(() => import('./pages/superadmin/SuperAdminBookingsPage'));
const SuperAdminTransactionsPage = lazy(() => import('./pages/superadmin/SuperAdminTransactionsPage'));
const SuperAdminRefundsPage = lazy(() => import('./pages/superadmin/SuperAdminRefundsPage'));
const SuperAdminReportsPage = lazy(() => import('./pages/superadmin/SuperAdminReportsPage'));
const SuperAdminInstansiPage = lazy(() => import('./pages/superadmin/SuperAdminInstansiPage'));
const SuperAdminAdminPage = lazy(() => import('./pages/superadmin/SuperAdminAdminPage'));
const SuperAdminApprovalPage = lazy(() => import('./pages/superadmin/SuperAdminApprovalPage'));
const SuperAdminPencairanPage = lazy(() => import('./pages/superadmin/SuperAdminPencairanPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-3 transition-colors duration-300">
      <div className="w-8 h-8 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      <p className="text-xs font-medium text-slate-500 dark:text-white/50">Memuat halaman...</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <SessionExpiredProvider>
                <ChatProvider>
                  <RoutePreloader />
                  <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {/* Admin — layout sendiri, OUTSIDE Layout untuk smooth navigation */}
                    <Route element={<RequireAdmin />}>
                      <Route element={<AdminLayout />}>
                        <Route path="admin" element={<AdminDashboardPage />} />
                        <Route path="admin/armada" element={<AdminArmadaPage />} />
                        <Route
                          path="admin/armada/:id/edit"
                          element={
                            <ComingSoonPage
                              title="Edit Mobil (form penuh)"
                              description="Form edit mobil saat ini ada sebagai modal di halaman Kelola Armada. Halaman terpisah ini (dengan upload foto) belum dibangun."
                              week={5}
                            />
                          }
                        />
                        <Route path="admin/pesanan" element={<AdminPesananPage />} />
                        <Route path="admin/pesanan/:id" element={<AdminPesananDetailPage />} />
                        <Route path="admin/keuangan" element={<AdminKeuanganPage />} />
                        <Route path="admin/refunds" element={<Navigate to="/admin/keuangan?tab=refunds" replace />} />
                        <Route path="admin/messages" element={<AdminMessagesPage />} />
                        <Route path="admin/calendar" element={<AdminCalendarPage />} />
                        <Route path="admin/settings" element={<AdminSettingsPage />} />
                      </Route>
                    </Route>

                    {/* Super Admin — layout sendiri, OUTSIDE Layout */}
                    <Route element={<RequireSuperAdmin />}>
                      <Route element={<SuperAdminLayout />}>
                        <Route path="superadmin" element={<SuperAdminDashboardPage />} />
                        <Route path="superadmin/bookings" element={<SuperAdminBookingsPage />} />
                        <Route path="superadmin/transactions" element={<SuperAdminTransactionsPage />} />
                        <Route path="superadmin/refunds" element={<SuperAdminRefundsPage />} />
                        <Route path="superadmin/reports" element={<SuperAdminReportsPage />} />
                        <Route path="superadmin/instansi" element={<SuperAdminInstansiPage />} />
                        <Route path="superadmin/admin" element={<SuperAdminAdminPage />} />
                        <Route path="superadmin/armada" element={<SuperAdminApprovalPage />} />
                        <Route path="superadmin/armada/approval" element={<Navigate to="/superadmin/armada?tab=approval" replace />} />
                        <Route path="superadmin/pencairan" element={<SuperAdminPencairanPage />} />
                      </Route>
                    </Route>

                    {/* public Layout dengan Nav */}
                    <Route element={<Layout />}>
                      {/* Publik */}
                      <Route index element={<HomePage />} />
                      <Route path="armada" element={<ArmadaPage />} />
                      <Route path="armada/:id" element={<ArmadaDetailPage />} />
                      <Route path="tentang" element={<TentangPage />} />
                      <Route path="kontak" element={<KontakPage />} />
                      <Route path="faq" element={<FaqPage />} />
                      <Route path="syarat" element={<SyaratPage />} />
                      <Route path="privasi" element={<PrivasiPage />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="daftar" element={<DaftarPage />} />
                      <Route path="auth/callback" element={<AuthCallbackPage />} />
                      <Route path="reset-password" element={<ResetPasswordPage />} />

                      {/* Customer */}
                      <Route element={<RequireAuth />}>
                        <Route path="booking/:carId" element={<BookingPage />} />
                        <Route path="booking/:id/konfirmasi" element={<BookingConfirmationPage />} />
                        <Route path="booking/:id/bayar" element={<PaymentPage />} />
                        <Route path="akun" element={<Navigate to="/akun/profil" replace />} />
                        <Route path="akun/pesanan" element={<AkunPesananPage />} />
                        <Route path="akun/pesanan/:id" element={<AkunPesananDetailPage />} />
                        <Route path="akun/profil" element={<AkunProfilPage />} />
                      </Route>

                      {/* 404 */}
                      <Route
                        path="*"
                        element={
                          <ComingSoonPage
                            title="Halaman Tidak Ditemukan"
                            description="URL yang kamu tuju tidak ada di KerenTal Kita."
                          />
                        }
                      />
                    </Route>
                  </Routes>
                </Suspense>
              </ChatProvider>
            </SessionExpiredProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;