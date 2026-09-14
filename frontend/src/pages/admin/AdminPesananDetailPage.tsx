import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, FileText, ExternalLink, CheckCircle, Car, User, Calendar, MapPin, ShieldCheck, Clock, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError, type StatusBooking, type Booking } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getBookingStatusWithIcon } from '../../lib/statusConfig';

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
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DokumenButton({
  userId,
  tipe,
  isDark,
  isVerified,
  onVerifyChange,
}: {
  userId: string;
  tipe: 'ktp' | 'sim';
  isDark: boolean;
  isVerified?: boolean;
  onVerifyChange?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const { signedUrl } = await api.getDokumenSignedUrl(userId, tipe);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Dokumen belum diunggah');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerify = async () => {
    setVerifying(true);
    try {
      await api.setDokumenVerified(userId, !isVerified);
      if (onVerifyChange) onVerifyChange();
    } catch {
      // Ignore
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 border ${
          isDark
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        Periksa {tipe.toUpperCase()}
        <ExternalLink size={12} className={isDark ? 'text-white/40' : 'text-slate-400'} />
      </button>

      {onVerifyChange && (
        <button
          type="button"
          onClick={handleToggleVerify}
          disabled={verifying}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            isVerified
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
          }`}
        >
          {verifying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          {isVerified ? 'Terverifikasi' : 'Tandai Verifikasi'}
        </button>
      )}

      {error && <p className="text-red-400 text-xs w-full mt-1">{error}</p>}
    </div>
  );
}

function DetailStatusConfirmModal({
  booking,
  targetStatus,
  onClose,
  onConfirm,
  isPending,
  isDark,
}: {
  booking: Booking;
  targetStatus: StatusBooking;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isDark: boolean;
}) {
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

export default function AdminPesananDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmTargetStatus, setConfirmTargetStatus] = useState<StatusBooking | null>(null);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: StatusBooking) => api.updateBookingStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings-all'] });
      setConfirmTargetStatus(null);
    },
  });

  const cardClass = isDark
    ? 'rounded-3xl bg-white/[0.04] border border-white/12 p-6 shadow-xl backdrop-blur-xl'
    : 'rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-lg p-6';

  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-slate-500';
  const borderClass = isDark ? 'border-white/10' : 'border-slate-200';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl animate-pulse space-y-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <div className="h-6 w-48 rounded bg-white/10" />
          <div className="h-4 w-32 rounded bg-white/10" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 p-6 rounded-3xl animate-pulse space-y-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-24 w-full rounded-xl bg-white/10" />
          </div>
          <div className={`lg:col-span-5 p-6 rounded-3xl animate-pulse space-y-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
            <div className="h-5 w-36 rounded bg-white/10" />
            <div className="h-32 w-full rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="py-16 text-center">
        <p className={`mb-3 text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Pesanan tidak ditemukan.</p>
        <Link to="/admin/pesanan" className={isDark ? 'text-white/60 text-sm hover:underline' : 'text-slate-600 text-sm hover:underline'}>
          Kembali ke Kelola Pesanan
        </Link>
      </div>
    );
  }

  const nextOptions = NEXT_STATUS[booking.status] || [];
  const imageUrl = booking.car?.images?.[0]?.url;
  const statusConfig = getBookingStatusWithIcon(booking.status, isDark);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/pesanan')}
        className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
      >
        <ArrowLeft size={16} />
        Kembali ke Kelola Pesanan
      </motion.button>

      {/* Hero Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border ${
          isDark ? 'sa-glass-dark border-white/15 shadow-2xl' : 'sa-glass-light border-white shadow-xl'
        }`}
      >
        <div className="flex items-center gap-5 min-w-0">
          <div className="relative w-32 sm:w-44 aspect-[16/9] rounded-2xl overflow-hidden shrink-0 bg-transparent flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={booking.car?.nama} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <div className={`w-full h-full flex flex-col items-center justify-center rounded-2xl ${
                isDark ? 'bg-white/5 text-white/30' : 'bg-slate-100 text-slate-400'
              }`}>
                <Car size={32} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg}`}>
                <StatusIcon size={12} />
                {STATUS_LABEL[booking.status]}
              </span>
              {booking.car?.nomorPlat && (
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isDark ? 'bg-white/10 text-white/80 border border-white/15' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {booking.car.nomorPlat}
                </span>
              )}
            </div>

            <h1 className={`text-2xl sm:text-3xl font-extrabold truncate ${textClass}`}>
              {booking.car?.nama ?? 'Detail Pesanan'}
            </h1>
            <p className={`text-xs font-mono mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              ID: {booking.id}
            </p>
          </div>
        </div>

        <div className="sm:text-right shrink-0 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/10">
          <span className={`text-xs uppercase font-semibold block ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Total Transaksi</span>
          <span className={`text-2xl sm:text-3xl font-extrabold text-amber-500`}>
            {formatRupiah(Number(booking.totalHarga))}
          </span>
        </div>
      </motion.div>

      {/* Main Grid Content (7 Cols Left, 5 Cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (Details, Documents, Add-ons - 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Customer & Rental Schedule Card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cardClass}
          >
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-blue-500" />
              <h2 className={`font-bold text-sm uppercase tracking-wider ${textClass}`}>Informasi Penyewa & Sewa</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block font-medium mb-1 ${textMutedClass}`}>Penyewa</span>
                <span className={`font-semibold text-sm block ${textClass}`}>{booking.profile?.nama ?? '-'}</span>
                <span className={`block mt-1 ${textMutedClass}`}>{booking.profile?.email}</span>
                <span className={`block ${textMutedClass}`}>{booking.profile?.noHp ?? '-'}</span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block font-medium mb-1 ${textMutedClass}`}>Tanggal Sewa</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                  <Calendar size={13} className="text-emerald-500 shrink-0" />
                  <span>{formatTanggal(booking.tanggalMulai)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Calendar size={13} className="text-rose-500 shrink-0" />
                  <span>{formatTanggal(booking.tanggalSelesai)}</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border sm:col-span-2 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className={`flex items-center gap-1 text-[11px] font-medium mb-1 ${textMutedClass}`}>
                      <MapPin size={12} className="text-blue-500" /> Lokasi Penjemputan
                    </span>
                    <span className={`font-medium ${textClass}`}>{booking.lokasiAmbil}</span>
                  </div>
                  <div>
                    <span className={`flex items-center gap-1 text-[11px] font-medium mb-1 ${textMutedClass}`}>
                      <MapPin size={12} className="text-purple-500" /> Lokasi Pengembalian
                    </span>
                    <span className={`font-medium ${textClass}`}>{booking.lokasiKembali}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Rincian Pembayaran & Addon Card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cardClass}
          >
            <h2 className={`font-bold text-sm uppercase tracking-wider mb-4 ${textClass}`}>Rincian Biaya</h2>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className={textMutedClass}>Harga Dasar Sewa</span>
                <span className={`font-semibold ${textClass}`}>{formatRupiah(Number(booking.hargaDasar))}</span>
              </div>

              {booking.addons?.map((addon) => (
                <div key={addon.id} className="flex justify-between items-center">
                  <span className={textMutedClass}>Add-on ({addon.jenis})</span>
                  <span className={`font-semibold ${textClass}`}>{formatRupiah(Number(addon.harga))}</span>
                </div>
              ))}

              <div className={`pt-3 border-t ${borderClass} flex justify-between items-center text-sm sm:text-base font-extrabold`}>
                <span className={textClass}>Total Biaya Sewa</span>
                <span className="text-amber-500">{formatRupiah(Number(booking.totalHarga))}</span>
              </div>
            </div>
          </motion.section>

          {/* Verifikasi Dokumen Penyewa Card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cardClass}
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-emerald-500" />
              <h2 className={`font-bold text-sm uppercase tracking-wider ${textClass}`}>Verifikasi Dokumen Penyewa</h2>
            </div>
            <p className={`text-xs mb-4 ${textMutedClass}`}>
              Periksa keabsahan KTP dan SIM penyewa sebelum menyetujui penyerahan armada
            </p>
            <div className="flex flex-wrap gap-3">
              <DokumenButton userId={booking.userId} tipe="ktp" isDark={isDark} />
              <DokumenButton userId={booking.userId} tipe="sim" isDark={isDark} />
            </div>
          </motion.section>

        </div>

        {/* Right Column (Status Change Actions & History - 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Ubah Status CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`p-6 rounded-3xl sticky top-24 ${cardClass}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-amber-500" />
              <h2 className={`font-bold text-sm uppercase tracking-wider ${textClass}`}>Aksi Perubahan Status</h2>
            </div>

            {nextOptions.length === 0 ? (
              <div className={`p-4 rounded-2xl text-center text-xs border ${
                isDark ? 'bg-white/[0.03] border-white/10 text-white/50' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                Status <strong className="underline">{STATUS_LABEL[booking.status]}</strong> adalah status akhir transaksi ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className={`text-xs ${textMutedClass}`}>
                  Pilih status berikutnya untuk transaksi sewa ini:
                </p>
                {nextOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setConfirmTargetStatus(s)}
                    disabled={statusMutation.isPending}
                    className={`w-full text-xs sm:text-sm font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all border shadow-sm ${
                      s === 'dikonfirmasi' || s === 'berjalan' || s === 'selesai'
                        ? isDark
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-emerald-600/20'
                        : isDark
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/30'
                          : 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600 shadow-rose-600/20'
                    }`}
                  >
                    → Ubah Status ke "{STATUS_LABEL[s]}"
                  </button>
                ))}
              </div>
            )}

            {/* Riwayat Perubahan Status Section inside Right Card */}
            <div className={`mt-6 pt-5 border-t ${borderClass}`}>
              <h3 className={`text-xs uppercase tracking-wider font-bold mb-3 ${textMutedClass}`}>
                Riwayat Audit Status
              </h3>
              {booking.statusLogs && booking.statusLogs.length > 0 ? (
                <div className="space-y-2">
                  {booking.statusLogs.map((log) => (
                    <div key={log.id} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={isDark ? 'text-white/70' : 'text-slate-700'}>
                        {log.statusLama} → <strong className={textClass}>{log.statusBaru}</strong>
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                        {formatTanggal(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Belum ada perubahan status tercatat.</p>
              )}
            </div>
          </motion.div>

        </div>

      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmTargetStatus && (
          <DetailStatusConfirmModal
            booking={booking}
            targetStatus={confirmTargetStatus}
            onClose={() => setConfirmTargetStatus(null)}
            onConfirm={() => statusMutation.mutate(confirmTargetStatus)}
            isPending={statusMutation.isPending}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
