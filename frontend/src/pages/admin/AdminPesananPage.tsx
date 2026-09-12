import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ClipboardList, Search, ChevronRight, Car, Clock } from 'lucide-react';
import { api, type StatusBooking, type AdminBooking } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getBookingStatusWithIcon } from '../../lib/statusConfig';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

// Status labels for next status buttons
const STATUS_LABEL: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'Menunggu Bayar',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const NEXT_STATUS: Record<StatusBooking, StatusBooking[]> = {
  menunggu_pembayaran: ['dikonfirmasi', 'dibatalkan'],
  dikonfirmasi: ['berjalan'],
  berjalan: ['selesai'],
  selesai: [],
  dibatalkan: [],
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status, isDark }: { status: StatusBooking; isDark: boolean }) {
  const config = getBookingStatusWithIcon(status, isDark);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${config.bg}`}>
      <Icon size={10} className="sm:w-3 sm:h-3" />
      {config.label}
    </span>
  );
}

function BookingCard({ booking, index, onStatusChange, isDark }: {
  booking: AdminBooking;
  index: number;
  onStatusChange: (id: string, status: StatusBooking) => void;
  isDark: boolean;
}) {
  const nextOptions = NEXT_STATUS[booking.status] || [];
  const imageUrl = booking.car?.images?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 ${
        isDark
          ? 'sa-glass-dark border border-white/15 hover:border-white/30 hover:shadow-black/70 shadow-xl'
          : 'sa-glass-light border border-white/80 hover:border-white hover:shadow-slate-300/60 shadow-lg'
      }`}
    >
      {/* Media Aspect Header */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-950/20 dark:bg-black/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={booking.car?.nama ?? 'Mobil'}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/60 text-white/30">
            <Car size={32} className="mb-1 opacity-50" />
            <span className="text-[11px]">Foto tidak tersedia</span>
          </div>
        )}
        
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-black/10 to-transparent" />

        {/* Floating Status Badge Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <StatusBadge status={booking.status} isDark={isDark} />
        </div>

        {/* Car Name overlay at bottom left of photo */}
        <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between gap-2">
          <h3 className="font-bold text-white text-base truncate drop-shadow-md">
            {booking.car?.nama ?? 'Armada'}
          </h3>
          {booking.car?.nomorPlat && (
            <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
              {booking.car.nomorPlat}
            </span>
          )}
        </div>
      </div>

      {/* Card Details Body */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div className="space-y-2 text-xs">
          {/* Customer & Date */}
          <div className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
            isDark ? 'bg-white/[0.04] border-white/10 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="font-semibold truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              {booking.profile?.nama ?? 'Customer'}
            </span>
            <span className="text-[11px] opacity-70 flex items-center gap-1 shrink-0">
              <Clock size={11} />
              {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
            </span>
          </div>
        </div>

        {/* Status Actions & Price Row */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div>
            <span className={`text-[10px] uppercase font-semibold tracking-wider block ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Total Biaya</span>
            <span className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatRupiah(Number(booking.totalHarga))}
            </span>
          </div>

          <Link
            to={`/admin/pesanan/${booking.id}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
            }`}
          >
            Detail <ChevronRight size={13} />
          </Link>
        </div>

        {/* Status Transition Action Buttons */}
        {nextOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {nextOptions.map((s: StatusBooking) => (
              <button
                key={s}
                onClick={() => onStatusChange(booking.id, s)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all text-center border ${
                  s === 'dikonfirmasi' || s === 'berjalan' || s === 'selesai'
                    ? isDark
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300'
                    : isDark
                      ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/30'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300'
                }`}
              >
                → {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminPesananPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filterStatus, setFilterStatus] = useState<StatusBooking | ''>('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: bookingsResponse, isLoading, isError } = useQuery({
    queryKey: ['admin-bookings', filterStatus],
    queryFn: () => api.listAdminBookings(filterStatus ? { status: filterStatus } : {}),
  });

  const bookings = bookingsResponse?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusBooking }) =>
      api.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });

  const filteredBookings = search
    ? bookings.filter(b =>
        b.car?.nama?.toLowerCase().includes(search.toLowerCase()) ||
        b.car?.nomorPlat?.toLowerCase().includes(search.toLowerCase()) ||
        b.profile?.nama?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Kelola Pesanan</h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Pantau dan perbarui status transaksi sewa armada Anda
          </p>
        </div>
      </motion.div>

      {/* Stats Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: '', label: 'Semua', count: bookings.length },
          { key: 'menunggu_pembayaran', label: 'Menunggu Bayar', count: statusCounts.menunggu_pembayaran ?? 0 },
          { key: 'dikonfirmasi', label: 'Konfirmasi', count: statusCounts.dikonfirmasi ?? 0 },
          { key: 'berjalan', label: 'Berjalan', count: statusCounts.berjalan ?? 0 },
          { key: 'selesai', label: 'Selesai', count: statusCounts.selesai ?? 0 },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilterStatus(item.key as StatusBooking | '')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border ${
              filterStatus === item.key
                ? isDark
                  ? 'bg-white/10 text-white border-white/30 shadow-md'
                  : 'bg-slate-900 text-white border-slate-900 shadow-md'
                : isDark
                ? 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Cari nama mobil atau customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20'
          }`}
        />
      </div>

      {/* List Grid */}
      {isLoading ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 sm:py-20 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
          }`}>
            <ClipboardList size={32} className="text-red-500 sm:w-10 sm:h-10" />
          </div>
          <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Gagal memuat pesanan</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Silakan refresh halaman</p>
        </motion.div>
      ) : !filteredBookings?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 sm:py-20 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'
          }`}>
            <ClipboardList size={32} className={isDark ? 'text-white/20 sm:w-10 sm:h-10' : 'text-slate-300 sm:w-10 sm:h-10'} />
          </div>
          <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Belum ada pesanan</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Pesanan akan muncul setelah customer melakukan booking</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBookings.map((booking, i) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              index={i}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}