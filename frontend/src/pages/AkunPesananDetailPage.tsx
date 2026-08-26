import { useState, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, MessageCircle, Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
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

/**
 * Form ulasan — cuma dirender kalau booking.status === 'selesai' (dicek
 * juga di server, ini bukan satu-satunya lapisan validasi). Setelah
 * terkirim tidak bisa diedit/dihapus (keputusan produk), jadi UI langsung
 * masuk mode "sudah diulas" tanpa opsi ubah.
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

  // Sudah pernah diulas — tampilkan ringkasan, tidak ada tombol edit/hapus.
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
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['my-booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelBooking(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setConfirmingCancel(false);
    },
    onError: (err) => {
      setCancelError(err instanceof ApiError ? err.message : 'Gagal membatalkan pesanan');
    },
  });

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] border border-white/10 p-5'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-5';

  const statusBadge = isDark ? STATUS_BADGE_DARK : STATUS_BADGE_LIGHT;

  if (isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <Loader2 size={18} className="animate-spin" />
        <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Memuat pesanan...</span>
      </main>
    );
  }

  if (isError || !booking) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-3 text-center px-5 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Pesanan tidak ditemukan.</p>
        <Link to="/akun/pesanan" className={isDark ? 'text-white/60 text-sm hover:underline' : 'text-slate-600 text-sm hover:underline'}>
          Kembali ke Riwayat Pesanan
        </Link>
      </main>
    );
  }

  return (
    <main className={`min-h-screen pt-24 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark
        ? 'bg-[#0a0a0a]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
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
          className="flex items-center gap-3 mb-1"
        >
          <h1 className={`font-playfair italic text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car?.nama ?? '-'}</h1>
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

        {/* Tanya soal pesanan ini — link WA dengan konteks booking sudah
            terisi otomatis (nomor pesanan, nama mobil), supaya admin bisa
            langsung tahu pesanan mana yang dimaksud tanpa customer perlu
            jelaskan ulang dari nol. */}
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

        {booking.status === 'selesai' && (
          <ReviewSection bookingId={booking.id} isDark={isDark} />
        )}

        {booking.status === 'menunggu_pembayaran' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`mt-5 rounded-2xl p-5 ${isDark ? 'bg-white/[0.04] border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/80'}`}
          >
            {!confirmingCancel ? (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
              >
                Batalkan Pesanan
              </button>
            ) : (
              <div>
                <p className={`text-sm mb-3 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Yakin batalkan pesanan ini?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-60 ${
                      isDark
                        ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400'
                        : 'bg-red-100 hover:bg-red-200 text-red-600'
                    }`}
                  >
                    {cancelMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Ya, Batalkan
                  </button>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    className={`text-sm px-4 py-2 transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Tidak
                  </button>
                </div>
                {cancelError && <p className="text-red-500 text-xs mt-2">{cancelError}</p>}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}