import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, type StatusBooking } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

const STATUS_LABEL: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const STATUS_BADGE_DARK: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'bg-amber-500/15 text-amber-400',
  dikonfirmasi: 'bg-blue-500/15 text-white/60',
  berjalan: 'bg-purple-500/15 text-purple-400',
  selesai: 'bg-emerald-500/15 text-emerald-400',
  dibatalkan: 'bg-white/10 text-white/40',
};

const STATUS_BADGE_LIGHT: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'bg-amber-100 text-amber-700',
  dikonfirmasi: 'bg-blue-100 text-slate-700',
  berjalan: 'bg-purple-100 text-purple-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-slate-100 text-slate-500',
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AkunPesananPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: api.listMyBookings,
  });

  const listRef = useScrollReveal<HTMLDivElement>({ stagger: 0.07, dependencies: [bookings] });

  const statusBadge = isDark ? STATUS_BADGE_DARK : STATUS_BADGE_LIGHT;

  return (
    <main className={`min-h-screen pt-28 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark
        ? 'bg-[#0a0a0a]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Akun Saya</p>
          <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Riwayat Pesanan
          </h1>
        </motion.div>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center gap-2 py-16 justify-center ${isDark ? 'text-white/50' : 'text-slate-500'}`}
          >
            <Loader2 size={18} className="animate-spin" />
            Memuat riwayat pesanan...
          </motion.div>
        )}

        {isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm px-4 py-3 rounded-lg ${
              isDark
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            Gagal memuat riwayat pesanan.
          </motion.div>
        )}

        {bookings && bookings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <p className={`text-sm mb-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Kamu belum pernah memesan mobil.</p>
            <Link to="/armada" className={`text-sm hover:underline ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              Lihat Armada
            </Link>
          </motion.div>
        )}

        {bookings && bookings.length > 0 && (
          <div ref={listRef} className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.15 }}
              >
                <Link
                  to={`/akun/pesanan/${booking.id}`}
                  className={`flex items-center gap-4 rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                    isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.07] border border-white/10'
                      : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 hover:border-slate-300 hover:shadow-xl'
                  }`}
                >
                  <div className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden ${
                    isDark ? 'bg-white/5' : 'bg-slate-100'
                  }`}>
                    {booking.car?.images?.[0] && (
                      <div
                        className="w-full h-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${booking.car.images[0].url})` }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car?.nama ?? '-'}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${statusBadge[booking.status]}`}
                      >
                        {STATUS_LABEL[booking.status]}
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                      {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
                    </p>
                  </div>

                  <p className={`font-medium text-sm shrink-0 hidden sm:block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatRupiah(Number(booking.totalHarga))}
                  </p>

                  <ChevronRight size={16} className={isDark ? 'text-white/30' : 'text-slate-400'} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
