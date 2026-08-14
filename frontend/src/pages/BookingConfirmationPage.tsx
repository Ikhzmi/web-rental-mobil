import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useTheme } from '../hooks/useTheme';

const STATUS_LABEL: Record<string, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Sedang Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const STATUS_COLOR_DARK: Record<string, string> = {
  menunggu_pembayaran: 'text-amber-400',
  dikonfirmasi: 'text-emerald-400',
  berjalan: 'text-white/60',
  selesai: 'text-emerald-400',
  dibatalkan: 'text-red-400',
};

const STATUS_COLOR_LIGHT: Record<string, string> = {
  menunggu_pembayaran: 'text-amber-600',
  dikonfirmasi: 'text-emerald-600',
  berjalan: 'text-slate-600',
  selesai: 'text-emerald-600',
  dibatalkan: 'text-red-600',
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCountdown(isoString: string): string {
  const deadline = new Date(isoString);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return 'Kedaluwarsa';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours} jam ${minutes} menit`;
  return `${minutes} menit`;
}

export default function BookingConfirmationPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { id } = useParams<{ id: string }>();
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.checkoutBooking(id!),
    onSuccess: (data) => {
      setInvoiceUrl(data.invoiceUrl);
      setExpiresAt(data.expiresAt);
      setCheckoutStarted(true);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 503) {
        alert('Payment gateway belum dikonfigurasi. Hubungi admin.');
      }
    },
  });

  const paymentStatusQuery = useQuery({
    queryKey: ['booking-payment-status', id],
    queryFn: () => api.getBookingPaymentStatus(id!),
    enabled: !!id && checkoutStarted,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const booking = bookingQuery.data;
    if (booking?.status === 'menunggu_pembayaran' && !checkoutStarted && !checkoutMutation.isPending) {
      checkoutMutation.mutate();
    }
  }, [bookingQuery.data?.id]);

  useEffect(() => {
    if (paymentStatusQuery.data?.bookingStatus === 'dikonfirmasi') {
      bookingQuery.refetch();
    }
  }, [paymentStatusQuery.data?.bookingStatus]);

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-5';

  const statusColor = isDark ? STATUS_COLOR_DARK : STATUS_COLOR_LIGHT;

  if (bookingQuery.isLoading) {
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

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-3 text-center px-5 text-sm transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <p className={isDark ? 'text-white/60' : 'text-slate-600'}>Pesanan tidak ditemukan.</p>
        <Link to="/armada" className={isDark ? 'text-white/60 hover:underline' : 'text-slate-600 hover:underline'}>
          Kembali ke Katalog Armada
        </Link>
      </main>
    );
  }

  const booking = bookingQuery.data;
  const isWaitingPayment = booking.status === 'menunggu_pembayaran';
  const isConfirmed = booking.status === 'dikonfirmasi' || booking.status === 'berjalan' || booking.status === 'selesai';

  return (
    <main className={`min-h-screen pt-24 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark
        ? 'bg-[#0a0a0a]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-lg mx-auto">
        {/* Status Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {isConfirmed ? (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
              <CheckCircle2 size={26} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            </div>
          ) : isWaitingPayment ? (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-amber-500/15' : 'bg-amber-100'}`}>
              <Loader2 size={26} className={isDark ? 'text-amber-400 animate-spin' : 'text-amber-600 animate-spin'} />
            </div>
          ) : (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-500/15' : 'bg-red-100'}`}>
              <AlertCircle size={26} className={isDark ? 'text-red-400' : 'text-red-600'} />
            </div>
          )}
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isConfirmed ? 'Pesanan Dikonfirmasi' : isWaitingPayment ? 'Menunggu Pembayaran' : 'Pesanan Dibatalkan'}
          </h1>
          <p className={`text-sm ${statusColor[booking.status] ?? (isDark ? 'text-white/50' : 'text-slate-500')}`}>
            Status: {STATUS_LABEL[booking.status]}
          </p>
          {booking.status === 'dibatalkan' && (
            <p className={`text-xs mt-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Pembayaran tidak dilakukan dalam waktu yang ditentukan.
            </p>
          )}
        </motion.div>

        {/* Booking Summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cardClass}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Ringkasan Pesanan
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Mobil</span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{booking.car?.nama ?? '-'}</span>
            </div>
            {booking.car?.instansi && (
              <div className="flex justify-between">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Instansi</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>{booking.car.instansi.namaInstansi}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Tanggal Ambil</span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatTanggal(booking.tanggalMulai)}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Tanggal Kembali</span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatTanggal(booking.tanggalSelesai)}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Lokasi Ambil</span>
              <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.lokasiAmbil}</span>
            </div>
            {booking.addons && booking.addons.length > 0 && (
              <div className="flex justify-between">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Add-on</span>
                <span className={`text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {booking.addons.map((a) => a.jenis).join(', ')}
                </span>
              </div>
            )}
            <div className={`border-t pt-2 mt-1 flex justify-between font-medium ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>Total</span>
              <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>{formatRupiah(Number(booking.totalHarga))}</span>
            </div>
          </div>
        </motion.div>

        {/* Payment Section */}
        {isWaitingPayment && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`mt-5 ${cardClass}`}
          >
            <h2 className={`text-xs uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Pembayaran via bayar.gg
            </h2>

            {checkoutMutation.isPending && (
              <div className="text-center py-6">
                <Loader2 size={24} className={`animate-spin mx-auto mb-2 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Membuat invoice pembayaran...</p>
              </div>
            )}

            {checkoutMutation.isError && (
              <div className="text-center py-4">
                <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
                <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Gagal membuat invoice</p>
                <button
                  onClick={() => checkoutMutation.mutate()}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    isDark
                      ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                      : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  }`}
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {invoiceUrl && (
              <div className="space-y-4">
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Selesaikan pembayaran sebelum:
                </p>
                {expiresAt && (
                  <div className={`rounded-lg px-4 py-3 text-center ${
                    isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <p className={`text-lg font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      {formatCountdown(expiresAt)}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {new Date(expiresAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                )}
                <Link
                  to={`/booking/${id}/bayar`}
                  className={`flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-full transition-colors ${
                    isDark
                      ? 'bg-orange-500 hover:bg-orange-400 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                  }`}
                >
                  Pilih Metode Pembayaran
                  <ExternalLink size={16} />
                </Link>
                <p className={`text-xs text-center ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  Pilih metode pembayaran yang tersedia (QRIS, OVO).
                  Setelah berhasil, halaman ini akan otomatis ter-update.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Confirmed - Payment Info */}
        {isConfirmed && booking.status !== 'dibatalkan' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mt-5 rounded-xl p-5 ${
              isDark
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-emerald-50 border border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              <p className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Pembayaran Berhasil</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              Pembayaran sudah kami terima. Mobil siap dijemput sesuai jadwal.
              Instansi terkait akan menghubungi kamu untuk konfirmasi lebih lanjut.
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col sm:flex-row gap-3 mt-5"
        >
          <Link
            to="/akun/pesanan"
            className={`flex-1 text-center text-sm font-medium py-3 rounded-full transition-colors ${
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Lihat Riwayat Pesanan
          </Link>
          <Link
            to="/armada"
            className={`flex-1 text-center text-sm font-medium py-3 rounded-full transition-colors ${
              isDark
                ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                : 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-lg shadow-black/10'
            }`}
          >
            Sewa Mobil Lain
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
