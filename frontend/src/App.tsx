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
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));

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
              <Route
                path="akun/pesanan"
                element={
                  <ComingSoonPage
                    title="Riwayat Pesanan"
                    description="Daftar pesanan kamu akan tampil di sini."
                    week={6}
                  />
                }
              />
              <Route
                path="akun/pesanan/:id"
                element={
                  <ComingSoonPage
                    title="Detail Pesanan"
                    description="Rincian satu pesanan akan tampil di sini."
                    week={6}
                  />
                }
              />
              <Route
                path="akun/profil"
                element={
                  <ComingSoonPage
                    title="Profil Saya"
                    description="Edit data diri & unggah dokumen KTP/SIM akan ada di sini."
                    week={6}
                  />
                }
              />
            </Route>

            {/* Admin — F9-F12, dijadwalkan Minggu 5 (§13 PRD) */}
            <Route element={<RequireAdmin />}>
              <Route
                path="admin"
                element={
                  <ComingSoonPage
                    title="Dashboard Admin"
                    description="Ringkasan pendapatan, pesanan aktif, dan okupansi armada."
                    week={5}
                  />
                }
              />
              <Route
                path="admin/armada"
                element={
                  <ComingSoonPage
                    title="Kelola Armada"
                    description="CRUD mobil, upload foto, dan status armada."
                    week={5}
                  />
                }
              />
              <Route
                path="admin/armada/:id/edit"
                element={
                  <ComingSoonPage
                    title="Edit Mobil"
                    description="Form edit detail satu mobil."
                    week={5}
                  />
                }
              />
              <Route
                path="admin/pesanan"
                element={
                  <ComingSoonPage
                    title="Kelola Pesanan"
                    description="List pesanan, filter status, dan verifikasi pembayaran."
                    week={5}
                  />
                }
              />
              <Route
                path="admin/pesanan/:id"
                element={
                  <ComingSoonPage
                    title="Detail Pesanan (Admin)"
                    description="Ubah status pesanan & lihat riwayat perubahan."
                    week={5}
                  />
                }
              />
              <Route
                path="admin/pengguna"
                element={
                  <ComingSoonPage
                    title="Kelola Pengguna"
                    description="List customer & admin, nonaktifkan akun bermasalah."
                    week={5}
                  />
                }
              />
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
