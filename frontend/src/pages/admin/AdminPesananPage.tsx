import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ClipboardList, Search, ChevronRight, Car, Clock } from 'lucide-react';
import { api, type StatusBooking } from '../../lib/api';
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
  booking: any;
  index: number;
  onStatusChange: (id: string, status: StatusBooking) => void;
  isDark: boolean;
}) {
  const bookingTyped = booking as { status: StatusBooking };
  const nextOptions = NEXT_STATUS[bookingTyped.status] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -2 }}
      className={`group rounded-2xl overflow-hidden transition-all duration-300 ${getGlassCardClass(isDark)}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Car Image */}
          <div className={`w-full sm:w-20 h-24 sm:h-20 rounded-xl overflow-hidden shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            {booking.car?.images?.[0]?.url ? (
              <img src={booking.car.images[0].url} alt={booking.car.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car size={24} className={isDark ? 'text-white/20' : 'text-slate-300'} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className={`font-semibold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car?.nama ?? '-'}</h3>
              <StatusBadge status={booking.status} isDark={isDark} />
            </div>

            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
                {booking.profile?.nama}
              </span>
              <span className="hidden xs:inline">•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="opacity-60" />
                {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
              </span>
            </div>

            {/* Status Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {nextOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nextOptions.map((s: StatusBooking) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(booking.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        s === 'dikonfirmasi' || s === 'berjalan' || s === 'selesai'
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                          : isDark
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                      }`}
                    >
                      → {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price & Detail */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
            <p className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(Number(booking.totalHarga))}</p>
            <Link
              to={`/admin/pesanan/${booking.id}`}
              className={`flex items-center gap-1 text-xs sm:text-sm hover:underline ${isDark ? 'text-white/60' : 'text-slate-600'}`}
            >
              Detail <ChevronRight size={14} />
            </Link>
          </div>
        </div>
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
        </div>
      </motion.div>

      {/* Stats Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: '', label: 'Semua', count: bookings.length },
          { key: 'pending', label: 'Pending', count: statusCounts.pending ?? 0 },
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
                  ? 'bg-white/10 text-white/60 border-white/20'
                  : 'bg-blue-100 text-slate-700 border-slate-300'
                : isDark
                ? 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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

      {/* List */}
      {isLoading ? (
        <SkeletonList count={4} />
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
        <div className="space-y-3 sm:space-y-4">
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
