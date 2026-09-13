import { useState, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, MessageCircle, Star, Check, Calendar as CalendarIcon, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, type DateRange } from 'react-day-picker';
import { api, ApiError, type StatusBooking } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useTheme } from '../hooks/useTheme';
import { buildWhatsAppLink } from '../lib/businessConfig';

const STATUS_LABEL: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berlangsung',
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
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTanggalShort(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Form ulasan — cuma dirender kalau booking.status === 'selesai'
 */
function ReviewSection({ bookingId, isDark }: { bookingId: string; isDark: boolean }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [komentar, setKomentar] = useState('');

  const { data: reviewStatus, isLoading } = useQuery({
    queryKey: ['booking-review-status', bookingId],
    queryFn: () => api.getBookingReviewStatus(bookingId),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.createReview({ bookingId, rating, komentar: komentar.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-review-status', bookingId] });
    },
  });

  const cardClass = isDark
    ? 'bg-white/[0.04] border border-white/10'
    : 'bg-white/60 backdrop-blur-xl border border-white/80';

  if (isLoading) return null;
  if (!reviewStatus) return null;

  // Sudah pernah diulas
  if (reviewStatus.alreadyReviewed && reviewStatus.review) {
    const r = reviewStatus.review;
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`mt-5 rounded-2xl p-5 ${cardClass}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Check size={14} className="text-emerald-500" />
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Terima kasih atas ulasanmu
          </p>
        </div>
        <div className="flex items-center gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={15}
              className={s <= r.rating ? 'fill-amber-400 text-amber-400' : isDark ? 'text-white/15' : 'text-slate-200'}
            />
          ))}
        </div>
        {r.komentar && (
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{r.komentar}</p>
        )}
      </motion.div>
    );
  }

  if (!reviewStatus.canReview) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`mt-5 rounded-2xl p-5 ${cardClass}`}
    >
      <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Gimana pengalaman sewamu?
      </p>
      <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
        Ulasan ini akan tayang publik dan tidak bisa diubah setelah dikirim.
      </p>

      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`Beri rating ${s} bintang`}
          >
            <Star
              size={26}
              className={
                s <= (hoverRating || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : isDark
                  ? 'text-white/15'
                  : 'text-slate-200'
              }
            />
          </button>
        ))}
      </div>

      <textarea
        value={komentar}
        onChange={(e) => setKomentar(e.target.value)}
        placeholder="Ceritakan pengalamanmu (opsional)"
        rows={3}
        maxLength={1000}
        className={`w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all mb-3 ${
          isDark
            ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
            : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
        }`}
      />

      {submitMutation.isError && (
        <p className="text-red-500 text-xs mb-3">
          {submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Gagal mengirim ulasan'}
        </p>
      )}

      <button
        onClick={() => submitMutation.mutate()}
        disabled={rating === 0 || submitMutation.isPending}
        className={`flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {submitMutation.isPending && <Loader2 size={14} className="animate-spin" />}
        Kirim Ulasan
      </button>
    </motion.div>
  );
}

export default function AkunPesananDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Cancel state
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [alasanPembatalan, setAlasanPembatalan] = useState('');
  const [rekeningRefund, setRekeningRefund] = useState('');

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleRange, setRescheduleRange] = useState<DateRange | undefined>();
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['my-booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelBooking(id!, {
      alasanPembatalan: alasanPembatalan.trim() || undefined,
      rekeningRefund: rekeningRefund.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setShowCancelModal(false);
    },
    onError: (err) => {
      setCancelError(err instanceof ApiError ? err.message : 'Gagal membatalkan pesanan');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!rescheduleRange?.from || !rescheduleRange?.to) throw new Error('Pilih tanggal baru terlebih dahulu');
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return api.rescheduleBooking(id!, fmt(rescheduleRange.from), fmt(rescheduleRange.to));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setShowRescheduleModal(false);
      setRescheduleRange(undefined);
      setRescheduleError(null);
    },
    onError: (err) => {
      setRescheduleError(err instanceof ApiError ? err.message : 'Gagal memproses reschedule');
    },
  });

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] border border-white/10 p-5'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-5';

  const statusBadge = isDark ? STATUS_BADGE_DARK : STATUS_BADGE_LIGHT;

  // Calculate refund amount (3% deduction for dikonfirmasi cancellation)
  const refundEstimasi = booking
    ? booking.status === 'dikonfirmasi'
      ? Math.round(Number(booking.totalHarga) * 0.97)
      : Number(booking.totalHarga)
    : 0;

  if (isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <Loader2 size={18} className="animate-spin" />
        <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Memuat pesanan...</span>
      </main>
    );
  }

  if (isError || !booking) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-3 text-center px-5 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Pesanan tidak ditemukan.</p>
        <Link to="/akun/pesanan" className={isDark ? 'text-white/60 text-sm hover:underline' : 'text-slate-600 text-sm hover:underline'}>
          Kembali ke Riwayat Pesanan
        </Link>
      </main>
    );
  }

  // Check H-1 rule: can only cancel dikonfirmasi if at least 1 day before start
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const mulai = new Date(booking.tanggalMulai);
  mulai.setHours(0, 0, 0, 0);
  const selisihHari = (mulai.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const canCancelDikonfirmasi = booking.status === 'dikonfirmasi' && selisihHari >= 1;

  return (
    <main className={`min-h-screen pt-24 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-lg mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/akun/pesanan')}
          className={`flex items-center gap-1.5 text-sm mb-6 transition-colors ${
            isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft size={16} />
          Kembali ke Riwayat Pesanan
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-1 flex-wrap"
        >
          <h1 className={`font-playfair italic text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car?.nama ?? '-'}</h1>
          {booking.car?.nomorPlat && (
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border tracking-wider ${
              isDark ? 'bg-white/10 text-white border-white/20' : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}>
              {booking.car.nomorPlat}
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full ${statusBadge[booking.status]}`}>
            {STATUS_LABEL[booking.status]}
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={`text-xs mb-6 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
        >
          ID Pesanan: {booking.id}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cardClass}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Ringkasan</h2>
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            {booking.car?.nomorPlat && (
              <>
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Nomor Plat Unit</span>
                <span className={`text-right font-mono font-bold tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car.nomorPlat}</span>
              </>
            )}
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Tanggal Ambil</span>
            <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatTanggal(booking.tanggalMulai)}</span>
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Tanggal Kembali</span>
            <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatTanggal(booking.tanggalSelesai)}</span>
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Lokasi Ambil</span>
            <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.lokasiAmbil}</span>
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Lokasi Kembali</span>
            <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.lokasiKembali}</span>
            <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Harga Dasar</span>
            <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(Number(booking.hargaDasar))}</span>
            {booking.addons?.map((addon) => (
              <Fragment key={addon.id}>
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Add-on: {addon.jenis}</span>
                <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(Number(addon.harga))}</span>
              </Fragment>
            ))}
            <span className={`font-medium pt-2 border-t ${isDark ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'}`}>Total</span>
            <span className={`font-medium text-right pt-2 border-t ${isDark ? 'text-white/60 border-white/10' : 'text-slate-600 border-slate-200'}`}>
              {formatRupiah(Number(booking.totalHarga))}
            </span>
          </div>
        </motion.div>

        {/* Tanya soal pesanan */}
        <motion.a
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          href={buildWhatsAppLink(
            `Halo, saya mau tanya soal pesanan ${booking.car?.nama ?? ''} (ID: ${booking.id.slice(0, 8)}).`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-2xl transition-colors ${
            isDark
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <MessageCircle size={15} />
          Tanya soal pesanan ini
        </motion.a>

        {/* Rating (selesai) */}
        {booking.status === 'selesai' && (
          <ReviewSection bookingId={booking.id} isDark={isDark} />
        )}

        {/* Reschedule (dikonfirmasi only) */}
        {booking.status === 'dikonfirmasi' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`mt-5 rounded-2xl p-5 ${isDark ? 'bg-white/[0.04] border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/80'}`}
          >
            <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Ubah Jadwal Sewa</h3>
            <p className={`text-xs mb-3 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Reschedule hanya bisa dilakukan untuk pesanan yang sudah dikonfirmasi.
            </p>
            <button
              onClick={() => setShowRescheduleModal(true)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                isDark
                  ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              <CalendarIcon size={14} />
              Ganti Tanggal
            </button>
          </motion.div>
        )}

        {/* Cancel (menunggu_pembayaran or dikonfirmasi with H-1 check) */}
        {(booking.status === 'menunggu_pembayaran' || canCancelDikonfirmasi) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
            className={`mt-5 rounded-2xl p-5 ${isDark ? 'bg-white/[0.04] border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/80'}`}
          >
            <button
              onClick={() => { setShowCancelModal(true); setCancelError(null); }}
              className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
            >
              Batalkan Pesanan
            </button>
            {booking.status === 'dikonfirmasi' && (
              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                Pembatalan pesanan dikonfirmasi dikenakan potongan administrasi 3%. Refund diproses dalam 1×24 jam.
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* ─── Reschedule Modal ─── */}
      <AnimatePresence>
        {showRescheduleModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRescheduleModal(false)} />
            <motion.div
              className={`relative z-10 w-full max-w-sm rounded-3xl p-6 shadow-2xl ${
                isDark ? 'bg-[#141414] border border-white/10' : 'bg-white border border-slate-200'
              }`}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Ubah Jadwal Sewa</h3>
                <button onClick={() => setShowRescheduleModal(false)} className={isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'}>
                  <X size={18} />
                </button>
              </div>

              <p className={`text-xs mb-4 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Tanggal saat ini: <strong>{formatTanggalShort(booking.tanggalMulai)} — {formatTanggalShort(booking.tanggalSelesai)}</strong>
              </p>

              <div className={`rounded-2xl overflow-hidden mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <DayPicker
                  mode="range"
                  selected={rescheduleRange}
                  onSelect={setRescheduleRange}
                  disabled={{ before: new Date() }}
                  className={isDark ? 'text-white' : ''}
                />
              </div>

              {rescheduleRange?.from && rescheduleRange?.to && (
                <p className={`text-xs mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Tanggal baru: <strong>{formatTanggalShort(rescheduleRange.from.toISOString())} — {formatTanggalShort(rescheduleRange.to.toISOString())}</strong>
                </p>
              )}

              {rescheduleError && (
                <p className={`text-xs px-3 py-2 rounded-lg mb-3 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {rescheduleError}
                </p>
              )}

              <button
                onClick={() => rescheduleMutation.mutate()}
                disabled={!rescheduleRange?.from || !rescheduleRange?.to || rescheduleMutation.isPending}
                className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-full transition-all disabled:opacity-40 ${
                  isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {rescheduleMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Konfirmasi Ubah Jadwal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Cancel/Refund Modal ─── */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
            <motion.div
              className={`relative z-10 w-full max-w-sm rounded-3xl p-6 shadow-2xl ${
                isDark ? 'bg-[#141414] border border-white/10' : 'bg-white border border-slate-200'
              }`}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Batalkan Pesanan</h3>
                <button onClick={() => setShowCancelModal(false)} className={isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'}>
                  <X size={18} />
                </button>
              </div>

              {/* Info refund jika status dikonfirmasi */}
              {booking.status === 'dikonfirmasi' && (
                <div className={`flex gap-3 p-3.5 rounded-2xl mb-4 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Info Refund</p>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
                      Pembatalan pesanan yang sudah dikonfirmasi dikenakan potongan administrasi <strong>3%</strong>.
                      Estimasi refund: <strong>{formatRupiah(refundEstimasi)}</strong>.
                      Refund akan diproses dalam <strong>1×24 jam</strong> ke rekening yang Anda cantumkan.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    Alasan Pembatalan <span className={isDark ? 'text-white/30' : 'text-slate-400'}>(opsional)</span>
                  </label>
                  <textarea
                    value={alasanPembatalan}
                    onChange={(e) => setAlasanPembatalan(e.target.value)}
                    rows={2}
                    placeholder="Ceritakan alasan pembatalan..."
                    className={`w-full text-sm rounded-xl px-3.5 py-2.5 outline-none resize-none transition-all ${
                      isDark
                        ? 'bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-white/30'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                    }`}
                  />
                </div>

                {booking.status === 'dikonfirmasi' && (
                  <div>
                    <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      Nomor Rekening Refund <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={rekeningRefund}
                      onChange={(e) => setRekeningRefund(e.target.value)}
                      placeholder="Bank - Nomor Rekening - Nama Pemilik"
                      className={`w-full text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all ${
                        isDark
                          ? 'bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-white/30'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                      }`}
                    />
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                      Contoh: BCA - 1234567890 - Budi Santoso
                    </p>
                  </div>
                )}
              </div>

              {cancelError && (
                <p className={`text-xs px-3 py-2 rounded-lg mb-3 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {cancelError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending || (booking.status === 'dikonfirmasi' && !rekeningRefund.trim())}
                  className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full transition-colors disabled:opacity-60 ${
                    isDark
                      ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20'
                      : 'bg-red-100 hover:bg-red-200 text-red-600 border border-red-200'
                  }`}
                >
                  {cancelMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Ya, Batalkan
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className={`px-4 py-2.5 text-sm transition-colors rounded-full ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Tidak
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}