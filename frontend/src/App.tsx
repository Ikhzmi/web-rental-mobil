import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SessionExpiredProvider } from './contexts/SessionExpiredContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ComingSoonPage from './components/ComingSoonPage';
import RequireAdmin from './components/RequireAdmin';
import RequireSuperAdmin from './components/RequireSuperAdmin';
import ErrorBoundary from './components/ErrorBoundary';

import HomePage from './pages/HomePage';
import ArmadaPage from './pages/ArmadaPage';
import ArmadaDetailPage from './pages/ArmadaDetailPage';
import TentangPage from './pages/TentangPage';
import KontakPage from './pages/KontakPage';
import FaqPage from './pages/FaqPage';
import LoginPage from './pages/LoginPage';
import DaftarPage from './pages/DaftarPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

// Lazy loaded public pages
const BookingPage = lazy(() => import('./pages/BookingPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const AkunPesananPage = lazy(() => import('./pages/AkunPesananPage'));
const AkunPesananDetailPage = lazy(() => import('./pages/AkunPesananDetailPage'));
const AkunProfilPage = lazy(() => import('./pages/AkunProfilPage'));

// Admin Pages - Lazy loaded (only loaded when admin visits)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminArmadaPage = lazy(() => import('./pages/admin/AdminArmadaPage'));
const AdminPesananPage = lazy(() => import('./pages/admin/AdminPesananPage'));
const AdminPesananDetailPage = lazy(() => import('./pages/admin/AdminPesananDetailPage'));

// Super Admin Pages - Lazy loaded (only loaded when super admin visits)
const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const SuperAdminDashboardPage = lazy(() => import('./pages/superadmin/SuperAdminDashboardPage'));
const SuperAdminBookingsPage = lazy(() => import('./pages/superadmin/SuperAdminBookingsPage'));
const SuperAdminTransactionsPage = lazy(() => import('./pages/superadmin/SuperAdminTransactionsPage'));
const SuperAdminReportsPage = lazy(() => import('./pages/superadmin/SuperAdminReportsPage'));
const SuperAdminInstansiPage = lazy(() => import('./pages/superadmin/SuperAdminInstansiPage'));
const SuperAdminAdminPage = lazy(() => import('./pages/superadmin/SuperAdminAdminPage'));
const SuperAdminApprovalPage = lazy(() => import('./pages/superadmin/SuperAdminApprovalPage'));
const SuperAdminPencairanPage = lazy(() => import('./pages/superadmin/SuperAdminPencairanPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
                        <Route path="admin/messages" element={
                          <ComingSoonPage title="Messages" description="Pusat pesan dan notifikasi" />
                        } />
                        <Route path="admin/calendar" element={
                          <ComingSoonPage title="Calendar" description="Kalender booking dan jadwal" />
                        } />
                        <Route path="admin/settings" element={
                          <ComingSoonPage title="Settings" description="Pengaturan akun dan preferensi" />
                        } />
                      </Route>
                    </Route>

                    {/* Super Admin — layout sendiri, OUTSIDE Layout */}
                    <Route element={<RequireSuperAdmin />}>
                      <Route element={<SuperAdminLayout />}>
                        <Route path="superadmin" element={<SuperAdminDashboardPage />} />
                        <Route path="superadmin/bookings" element={<SuperAdminBookingsPage />} />
                        <Route path="superadmin/transactions" element={<SuperAdminTransactionsPage />} />
                        <Route path="superadmin/reports" element={<SuperAdminReportsPage />} />
                        <Route path="superadmin/instansi" element={<SuperAdminInstansiPage />} />
                        <Route path="superadmin/admin" element={<SuperAdminAdminPage />} />
                        <Route path="superadmin/armada/approval" element={<SuperAdminApprovalPage />} />
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
                      <Route path="login" element={<LoginPage />} />
                      <Route path="daftar" element={<DaftarPage />} />
                      <Route path="auth/callback" element={<AuthCallbackPage />} />

                      {/* Customer */}
                      <Route element={<RequireAuth />}>
                        <Route path="booking/:carId" element={<BookingPage />} />
                        <Route path="booking/:id/konfirmasi" element={<BookingConfirmationPage />} />
                        <Route path="booking/:id/bayar" element={<PaymentPage />} />
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
              </SessionExpiredProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
