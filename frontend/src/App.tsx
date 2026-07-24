import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ComingSoonPage from './components/ComingSoonPage';
import RequireAdmin from './components/RequireAdmin';

import HomePage from './pages/HomePage';
import ArmadaPage from './pages/ArmadaPage';
import ArmadaDetailPage from './pages/ArmadaDetailPage';
import TentangPage from './pages/TentangPage';
import KontakPage from './pages/KontakPage';
import FaqPage from './pages/FaqPage';
import LoginPage from './pages/LoginPage';
import DaftarPage from './pages/DaftarPage';


const BookingPage = lazy(() => import('./pages/BookingPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminArmadaPage = lazy(() => import('./pages/admin/AdminArmadaPage'));
const AdminPesananPage = lazy(() => import('./pages/admin/AdminPesananPage'));
const AdminPesananDetailPage = lazy(() => import('./pages/admin/AdminPesananDetailPage'));
const AdminPenggunaPage = lazy(() => import('./pages/admin/AdminPenggunaPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));
const AkunPesananPage = lazy(() => import('./pages/AkunPesananPage'));
const AkunPesananDetailPage = lazy(() => import('./pages/AkunPesananDetailPage'));
const AkunProfilPage = lazy(() => import('./pages/AkunProfilPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#2563eb] rounded-full animate-spin" />
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
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

            {/* Customer — F6 sudah dibangun; F7/F8 masih Minggu 6 (§13 PRD) */}
            <Route element={<RequireAuth />}>
              <Route path="booking/:carId" element={<BookingPage />} />
              <Route path="booking/:id/konfirmasi" element={<BookingConfirmationPage />} />
              <Route path="akun/pesanan" element={<AkunPesananPage />} />
              <Route path="akun/pesanan/:id" element={<AkunPesananDetailPage />} />
              <Route path="akun/profil" element={<AkunProfilPage />} />
            </Route>

            {/* Admin */}
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
                <Route path="admin/pengguna" element={<AdminPenggunaPage />} />
              </Route>
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
