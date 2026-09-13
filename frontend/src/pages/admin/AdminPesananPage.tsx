import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Search, ChevronRight, Car, Clock, LayoutGrid, List, AlertTriangle, X, Loader2, CheckCircle } from 'lucide-react';
import { api, type StatusBooking, type AdminBooking } from '../../lib/api';
import { formatRupiah, formatCompactRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getBookingStatusWithIcon } from '../../lib/statusConfig';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

// Status labels for status transitions and buttons
const STATUS_LABEL: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'Menunggu Konfirmasi / Bayar',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const NEXT_STATUS: Record<StatusBooking, StatusBooking[]> = {
  menunggu_pembayaran: ['dikonfirmasi', 'dibatalkan'],
  dikonfirmasi: ['berjalan', 'dibatalkan'],
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

interface ConfirmTarget {
  booking: AdminBooking;
  targetStatus: StatusBooking;
}

function StatusConfirmModal({
  target,
  onClose,
  onConfirm,
  isPending,
  isDark,
}: {
  target: ConfirmTarget;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isDark: boolean;
}) {
  const { booking, targetStatus } = target;
  const currentLabel = STATUS_LABEL[booking.status];
  const targetLabel = STATUS_LABEL[targetStatus];

  const isDanger = targetStatus === 'dibatalkan';
  const isSuccess = targetStatus === 'dikonfirmasi' || targetStatus === 'selesai';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${
          isDark ? 'bg-zinc-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl flex items-center justify-center ${
            isDanger
              ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              : isSuccess
              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
          }`}>
            <AlertTriangle size={24} />
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-bold mb-1">Konfirmasi Perubahan Status</h3>
        <p className={`text-xs sm:text-sm mb-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          Apakah Anda yakin ingin mengubah status pesanan ini dari <strong className="underline">{currentLabel}</strong> menjadi <strong className="underline">{targetLabel}</strong>?
        </p>

        {/* Ringkasan Pesanan */}
        <div className={`p-3.5 rounded-2xl text-xs space-y-2 mb-6 border ${
          isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between">
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Armada</span>
            <span className="font-semibold">{booking.car?.nama} {booking.car?.nomorPlat ? `(${booking.car.nomorPlat})` : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Penyewa</span>
            <span className="font-semibold">{booking.profile?.nama}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Total Biaya</span>
            <span className="font-bold text-amber-500">{formatRupiah(Number(booking.totalHarga))}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              isDark ? 'border-white/10 hover:bg-white/5 text-white/80' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Ya, Ubah Status
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GridBookingCard({ booking, index, onRequestStatusChange, isDark }: {
  booking: AdminBooking;
  index: number;
  onRequestStatusChange: (booking: AdminBooking, status: StatusBooking) => void;
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
      {/* Media Aspect Header — 16:9 ratio */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-950/20 dark:bg-black/30">
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
            <span className={`font-extrabold text-sm sm:text-base truncate block max-w-[120px] sm:max-w-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="hidden sm:inline">{formatRupiah(Number(booking.totalHarga))}</span>
              <span className="sm:hidden">{formatCompactRupiah(Number(booking.totalHarga))}</span>
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
                onClick={() => onRequestStatusChange(booking, s)}
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

function HorizontalBookingCard({ booking, index, onRequestStatusChange, isDark }: {
  booking: AdminBooking;
  index: number;
  onRequestStatusChange: (booking: AdminBooking, status: StatusBooking) => void;
  isDark: boolean;
}) {
  const nextOptions = NEXT_STATUS[booking.status] || [];
  const imageUrl = booking.car?.images?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`p-4 sm:p-5 rounded-3xl transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isDark
          ? 'sa-glass-dark border border-white/15 hover:border-white/30 shadow-lg'
          : 'sa-glass-light border border-white/80 hover:border-white shadow-md'
      }`}
    >
      {/* Left: Thumbnail & Info */}
      <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
        {/* Transparent Background 16:9 Thumbnail Wrapper */}
        <div className="relative w-28 sm:w-36 aspect-[16/9] rounded-2xl overflow-hidden shrink-0 bg-transparent flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={booking.car?.nama} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center rounded-2xl ${
              isDark ? 'bg-white/5 text-white/30' : 'bg-slate-100 text-slate-400'
            }`}>
              <Car size={24} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={`font-bold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {booking.car?.nama ?? 'Armada'}
            </h3>
            {booking.car?.nomorPlat && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                isDark ? 'bg-white/10 text-white/80 border border-white/15' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {booking.car.nomorPlat}
              </span>
            )}
          </div>

          <p className={`text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            {booking.profile?.nama ?? 'Customer'} {booking.profile?.noHp ? `(${booking.profile.noHp})` : ''}
          </p>

          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <StatusBadge status={booking.status} isDark={isDark} />
            <span className={`opacity-60 flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
              <Clock size={11} />
              {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Pricing & Action Buttons */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10 gap-3 shrink-0">
        <div className="sm:text-right">
          <span className={`text-[10px] uppercase font-semibold block ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Total Biaya</span>
          <span className={`font-extrabold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {formatRupiah(Number(booking.totalHarga))}
          </span>
        </div>

        <div className="flex items-center gap-2">
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

          {nextOptions.map((s) => (
            <button
              key={s}
              onClick={() => onRequestStatusChange(booking, s)}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all border ${
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
      </div>
    </motion.div>
  );
}

export default function AdminPesananPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filterStatus, setFilterStatus] = useState<StatusBooking | ''>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'horizontal'>('grid');
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  const queryClient = useQueryClient();

  // Fetch ALL bookings for calculating accurate, fixed status counts across tab changes
  const { data: bookingsResponse, isLoading, isError } = useQuery({
    queryKey: ['admin-bookings-all'],
    queryFn: () => api.listAdminBookings({ limit: 100 }),
  });

  const allBookings = bookingsResponse?.data ?? [];

  // Compute status counts from allBookings so tab counts stay 100% static & accurate
  const statusCounts = allBookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  // Filter client side by active filter tab & search query
  const filteredBookings = allBookings.filter(b => {
    const matchesStatus = filterStatus ? b.status === filterStatus : true;
    const matchesSearch = search
      ? b.car?.nama?.toLowerCase().includes(search.toLowerCase()) ||
        b.car?.nomorPlat?.toLowerCase().includes(search.toLowerCase()) ||
        b.profile?.nama?.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusBooking }) =>
      api.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings-all'] });
      setConfirmTarget(null);
    },
  });

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
            Pantau dan perbarui status transaksi sewa armada Anda dengan konfirmasi cepat
          </p>
        </div>

        {/* Layout Toggle Buttons */}
        <div className={`flex items-center p-1 rounded-2xl border self-start sm:self-auto ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setViewMode('grid')}
            title="Tampilan Grid Card"
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid'
                ? isDark
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('horizontal')}
            title="Tampilan Horizontal Card"
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'horizontal'
                ? isDark
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List size={15} />
            <span className="hidden sm:inline">Horizontal</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: '', label: 'Semua', count: allBookings.length },
          { key: 'menunggu_pembayaran', label: 'Menunggu Bayar', count: statusCounts.menunggu_pembayaran ?? 0 },
          { key: 'dikonfirmasi', label: 'Konfirmasi', count: statusCounts.dikonfirmasi ?? 0 },
          { key: 'berjalan', label: 'Berjalan', count: statusCounts.berjalan ?? 0 },
          { key: 'selesai', label: 'Selesai', count: statusCounts.selesai ?? 0 },
          { key: 'dibatalkan', label: 'Dibatalkan', count: statusCounts.dibatalkan ?? 0 },
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
          placeholder="Cari nama mobil, plat nomor, atau penyewa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20'
          }`}
        />
      </div>

      {/* Booking List Container */}
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBookings.map((booking, i) => (
            <GridBookingCard
              key={booking.id}
              booking={booking}
              index={i}
              onRequestStatusChange={(b, status) => setConfirmTarget({ booking: b, targetStatus: status })}
              isDark={isDark}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBookings.map((booking, i) => (
            <HorizontalBookingCard
              key={booking.id}
              booking={booking}
              index={i}
              onRequestStatusChange={(b, status) => setConfirmTarget({ booking: b, targetStatus: status })}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmTarget && (
          <StatusConfirmModal
            target={confirmTarget}
            onClose={() => setConfirmTarget(null)}
            onConfirm={() => statusMutation.mutate({ id: confirmTarget.booking.id, status: confirmTarget.targetStatus })}
            isPending={statusMutation.isPending}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}