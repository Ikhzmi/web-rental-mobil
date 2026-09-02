import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Search, Car, Clock, Building2, ChevronLeft, ChevronRight, Loader2, X, Mail, Phone, MapPin, User } from 'lucide-react';
import { api, type StatusBooking, type SuperAdminBookingItem } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getBookingStatusWithIcon } from '../../lib/statusConfig';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Baru saja';
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatTanggal(iso);
}

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const config = getBookingStatusWithIcon(status as StatusBooking, isDark);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
}

/**
 * Modal detail booking — sebelumnya SuperAdmin sama sekali tidak bisa
 * drill-down dari daftar booking ke satu booking pun. Read-only (murni
 * pengawasan lintas-instansi, bukan untuk mengubah status — itu tetap
 * wewenang Admin instansi terkait lewat AdminPesananDetailPage).
 */
function BookingDetailModal({ bookingId, onClose, isDark }: { bookingId: string; onClose: () => void; isDark: boolean }) {
  const { data: booking, isLoading } = useQuery({
    queryKey: ['superadmin-booking-detail', bookingId],
    queryFn: () => api.getSuperAdminBookingDetail(bookingId),
  });

  const cardClass = isDark ? 'login-card-dark' : 'login-card-light';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl overflow-hidden my-10 ${cardClass}`}
      >
        <div className={`px-6 py-5 flex items-center justify-between ${isDark ? 'border-b border-white/10' : 'border-b border-[#D4CFC7]/40'}`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Detail Pesanan</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {isLoading || !booking ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  {booking.car?.images?.[0]?.url ? (
                    <img src={booking.car.images[0].url} alt={booking.car.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car size={20} className={isDark ? 'text-white/20' : 'text-slate-300'} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car?.nama}</p>
                  <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    <Building2 size={11} /> {booking.car?.instansi?.namaInstansi}
                  </p>
                </div>
                <span className={`ml-auto shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${getBookingStatusWithIcon(booking.status, isDark).bg}`}>
                  {getBookingStatusWithIcon(booking.status, isDark).label}
                </span>
              </div>

              <div className={`rounded-xl p-4 space-y-2.5 text-sm ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  <User size={13} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                  <span className={isDark ? 'text-white/80' : 'text-slate-700'}>{booking.profile?.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                  <span className={isDark ? 'text-white/80' : 'text-slate-700'}>{booking.profile?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                  <span className={isDark ? 'text-white/80' : 'text-slate-700'}>{booking.profile?.noHp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                  <span className={isDark ? 'text-white/80' : 'text-slate-700'}>{booking.lokasiAmbil} → {booking.lokasiKembali}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Periode Sewa</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
                </span>
              </div>

              {booking.addons && booking.addons.length > 0 && (
                <div>
                  <p className={`text-xs mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Add-on</p>
                  <div className="space-y-1.5">
                    {booking.addons.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span className={isDark ? 'text-white/70' : 'text-slate-600'}>{a.jenis}</span>
                        <span className={isDark ? 'text-white/70' : 'text-slate-600'}>{formatRupiah(Number(a.harga))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-between pt-3 ${isDark ? 'border-t border-white/10' : 'border-t border-slate-200'}`}>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Total</span>
                <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatRupiah(Number(booking.totalHarga))}
                </span>
              </div>

              {booking.payment && (
                <div className={`rounded-xl p-4 text-sm ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <p className={`text-xs mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Pembayaran</p>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-white/70' : 'text-slate-600'}>{booking.payment.metodeBayar}</span>
                    <span className={isDark ? 'text-white/70' : 'text-slate-600'}>{booking.payment.status}</span>
                  </div>
                </div>
              )}

              {booking.statusLogs && booking.statusLogs.length > 0 && (
                <div>
                  <p className={`text-xs mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Riwayat Status</p>
                  <div className="space-y-1.5">
                    {booking.statusLogs.map((log) => (
                      <div key={log.id} className={`text-xs flex items-center gap-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        <span>{log.statusLama} → {log.statusBaru}</span>
                        <span className="opacity-60">· {formatTanggal(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SuperAdminBookingsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filterStatus, setFilterStatus] = useState<StatusBooking | ''>('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Fetch bookings from API
  const { data, isLoading, isError } = useQuery({
    queryKey: ['superadmin-bookings', filterStatus, search, currentPage],
    queryFn: () => api.listSuperAdminBookings({
      status: filterStatus || undefined,
      cari: search || undefined,
      page: currentPage,
      limit: itemsPerPage,
    }),
    placeholderData: (prev) => prev,
  });

  const displayBookings: SuperAdminBookingItem[] = data?.data || [];
  const totalItems = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  // API handles search and pagination server-side
  // displayBookings is already filtered and paginated from API
  const paginatedBookings = displayBookings;

  // Calculate status counts from API response
  const statusCounts = (data?.data ?? []).reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Reset page when filter changes
  const handleFilterChange = (status: StatusBooking | '') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Semua Pesanan
        </h1>
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Kelola semua pesanan di platform
        </p>
      </motion.div>

      {/* Stats Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: '', label: 'Semua', count: displayBookings.length },
          { key: 'menunggu_pembayaran', label: 'Menunggu Bayar', count: statusCounts.menunggu_pembayaran ?? 0 },
          { key: 'dikonfirmasi', label: 'Dikonfirmasi', count: statusCounts.dikonfirmasi ?? 0 },
          { key: 'berjalan', label: 'Berjalan', count: statusCounts.berjalan ?? 0 },
          { key: 'selesai', label: 'Selesai', count: statusCounts.selesai ?? 0 },
          { key: 'dibatalkan', label: 'Dibatalkan', count: statusCounts.dibatalkan ?? 0 },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => handleFilterChange(item.key as StatusBooking | '')}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              filterStatus === item.key
                ? isDark
                  ? 'bg-white/10 text-white border-white/20'
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
          placeholder="Cari mobil, customer, atau instansi..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/30'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
          }`}
        />
      </div>

      {/* Results count */}
      <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
        Menampilkan {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} pesanan
      </p>

      {/* List */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <Loader2 size={48} className={`mx-auto mb-4 animate-spin ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Memuat data...</p>
        </motion.div>
      ) : isError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <ClipboardList size={48} className={`mx-auto mb-4 ${isDark ? 'text-red-400/40' : 'text-red-400'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Gagal memuat data</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Silakan coba lagi nanti</p>
        </motion.div>
      ) : !paginatedBookings.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <ClipboardList size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Tidak ada pesanan</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Pesanan akan muncul di sini</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {paginatedBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedBookingId(booking.id)}
              className={`rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] ${getGlassCardClass(isDark)}`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                      <h3 className={`font-semibold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {booking.car?.nama ?? '-'}
                      </h3>
                      <StatusBadge status={booking.status} isDark={isDark} />
                    </div>

                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      <span className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        {booking.profile?.nama ?? '-'}
                      </span>
                      <span className="hidden xs:inline">•</span>
                      <span className="flex items-center gap-1">
                        <Building2 size={12} className="opacity-60" />
                        {booking.instansi?.nama ?? '-'}
                      </span>
                    </div>

                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="opacity-60" />
                        {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(booking.createdAt)}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <p className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatRupiah(Number(booking.totalHarga))}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className={`flex items-center justify-between mt-6 p-4 rounded-2xl ${getGlassCardClass(isDark)}`}>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
            Halaman {currentPage} dari {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                currentPage === 1
                  ? isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    currentPage === pageNum
                      ? isDark ? 'bg-[#6b5545] text-white' : 'bg-[#6b5545] text-white'
                      : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                currentPage === totalPages
                  ? isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedBookingId && (
          <BookingDetailModal
            bookingId={selectedBookingId}
            onClose={() => setSelectedBookingId(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}