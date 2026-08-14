import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Loader2,
  CreditCard,
  Smartphone,
  QrCode,
  Shield,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useTheme } from '../hooks/useTheme';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  type: 'va' | 'ewallet' | 'qris' | 'cstore';
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'qris',
    name: 'QRIS',
    icon: <QrCode size={24} />,
    description: 'Scan dengan GoPay, OVO, DANA, ShopeePay, dll',
    type: 'qris',
  },
  {
    id: 'ovo',
    name: 'OVO',
    icon: <Smartphone size={24} />,
    description: 'Bayar dengan OVO (butuh langganan aktif)',
    type: 'ewallet',
  },
];

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
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours} jam ${minutes} menit`;
  if (minutes > 0) return `${minutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}

export default function PaymentPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState('');

  // Fetch booking details
  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  // Create payment with selected method
  const createPaymentMutation = useMutation({
    mutationFn: (paymentMethod: string) =>
      api.createPayment(id!, { paymentMethod }),
    onSuccess: () => {
      setShowPaymentDetails(true);
      paymentStatusQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          alert('Anda tidak memiliki akses ke pesanan ini.');
          navigate('/akun/pesanan');
        } else if (error.status === 400) {
          alert('Pesanan ini tidak dapat dibayar. Status: ' + error.message);
        } else if (error.status === 503) {
          alert('Payment gateway belum dikonfigurasi. Hubungi admin.');
        }
      }
    },
  });

  // Poll payment status
  const paymentStatusQuery = useQuery({
    queryKey: ['booking-payment-status', id],
    queryFn: () => api.getBookingPaymentStatus(id!),
    enabled: !!id && showPaymentDetails,
    refetchInterval: 3000,
  });

  // Update countdown timer
  useEffect(() => {
    if (bookingQuery.data?.expiresAt) {
      const interval = setInterval(() => {
        setCountdown(formatCountdown(bookingQuery.data.expiresAt!));
      }, 1000);
      setCountdown(formatCountdown(bookingQuery.data.expiresAt!));
      return () => clearInterval(interval);
    }
  }, [bookingQuery.data?.expiresAt]);

  // Redirect if booking is confirmed
  useEffect(() => {
    if (paymentStatusQuery.data?.bookingStatus === 'dikonfirmasi') {
      navigate(`/booking/${id}/konfirmasi`);
    }
  }, [paymentStatusQuery.data?.bookingStatus]);

  // Redirect if booking is expired/cancelled
  useEffect(() => {
    if (bookingQuery.data?.status === 'dibatalkan') {
      navigate(`/booking/${id}/konfirmasi`);
    }
  }, [bookingQuery.data?.status]);

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-5';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (bookingQuery.isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <Loader2 size={18} className="animate-spin" />
        <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Memuat...</span>
      </main>
    );
  }

  // Error state
  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-3 text-center px-5 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <AlertCircle size={48} className={isDark ? 'text-white/30' : 'text-slate-300'} />
        <p className={isDark ? 'text-white/60' : 'text-slate-600'}>Pesanan tidak ditemukan.</p>
        <Link to="/akun/pesanan" className={`flex items-center gap-2 text-sm ${isDark ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
          <ArrowLeft size={16} />
          Kembali ke Daftar Pesanan
        </Link>
      </main>
    );
  }

  const booking = bookingQuery.data;
  const paymentData = paymentStatusQuery.data;

  // If payment already created, show payment details
  if (showPaymentDetails || paymentData?.dokuInvoiceId) {
    return (
      <main className={`min-h-screen pt-24 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDark ? 'bg-amber-500/15' : 'bg-amber-100'
            }`}>
              <Clock size={26} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Selesaikan Pembayaran
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Batas waktu: {countdown || 'Loading...'}
            </p>
          </motion.div>

          {/* Payment Status Polling Indicator */}
          {paymentStatusQuery.isFetching && (
            <div className={`text-center text-xs mb-4 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              <Loader2 size={12} className="animate-spin inline mr-1" />
              Memeriksa status pembayaran...
            </div>
          )}

          {/* Payment Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cardClass}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              <h2 className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Petunjuk Pembayaran
              </h2>
            </div>

            {paymentData?.dokuPaymentCode && (
              <div className={`p-4 rounded-xl mb-4 ${
                isDark ? 'bg-white/5' : 'bg-slate-50'
              }`}>
                <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  Kode Pembayaran
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-mono font-bold tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {paymentData.dokuPaymentCode}
                  </span>
                  <button
                    onClick={() => handleCopy(paymentData.dokuPaymentCode!)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
                    }`}
                  >
                    {copied ? (
                      <Check size={18} className="text-emerald-500" />
                    ) : (
                      <Copy size={18} className={isDark ? 'text-white/50' : 'text-slate-400'} />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              {selectedMethod?.includes('va') && (
                <>
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Instruksi Pembayaran:
                    </p>
                    <ol className={`space-y-1 text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      <li>1. Buka aplikasi {selectedMethod.replace('_va', '').toUpperCase()} atau kunjungi ATM</li>
                      <li>2. Pilih menu "Transfer Virtual Account"</li>
                      <li>3. Masukkan nomor Virtual Account di atas</li>
                      <li>4. Masukkan jumlah pembayaran sesuai nominal</li>
                      <li>5. Konfirmasi dan selesaikan pembayaran</li>
                    </ol>
                  </div>
                </>
              )}

              {selectedMethod === 'qris' && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Instruksi Pembayaran:
                  </p>
                  <ol className={`space-y-1 text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    <li>1. Buka aplikasi e-wallet atau m-banking Anda</li>
                    <li>2. Pilih menu "Scan QR" atau "QRIS"</li>
                    <li>3. Scan kode QR yang tersedia</li>
                    <li>4. Pastikan nominal sesuai dengan jumlah pembayaran</li>
                    <li>5. Konfirmasi dan selesaikan pembayaran</li>
                  </ol>
                </div>
              )}

              {(selectedMethod === 'alfamart' || selectedMethod === 'indomaret') && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Instruksi Pembayaran:
                  </p>
                  <ol className={`space-y-1 text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    <li>1. Kunjungi {selectedMethod === 'alfamart' ? 'Alfamart' : 'Indomaret'} terdekat</li>
                    <li>2. Beritahu kasir Anda ingin melakukan pembayaran</li>
                    <li>3. Berikan kode pembayaran: {paymentData?.dokuPaymentCode || 'N/A'}</li>
                    <li>4. Bayarkan jumlah sesuai nominal</li>
                    <li>5. Simpan struk sebagai bukti pembayaran</li>
                  </ol>
                </div>
              )}

              {(selectedMethod === 'shopeepay' || selectedMethod === 'dana' || selectedMethod === 'ovo') && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Instruksi Pembayaran:
                  </p>
                  <ol className={`space-y-1 text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    <li>1. Buka aplikasi {selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)}</li>
                    <li>2. Pilih menu "Bayar" atau "Scan"</li>
                    <li>3. Scan kode QR atau masukkan kode pembayaran</li>
                    <li>4. Konfirmasi dan selesaikan pembayaran</li>
                  </ol>
                </div>
              )}
            </div>
          </motion.div>

          {/* Booking Summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${cardClass} mt-4`}
          >
            <h2 className={`text-xs uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Ringkasan Pesanan
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Mobil</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>{booking.car?.nama ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Tanggal</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  {formatTanggal(booking.tanggalMulai)} - {formatTanggal(booking.tanggalSelesai)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Total Bayar</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatRupiah(Number(booking.totalHarga))}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Note */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`mt-4 text-center text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}
          >
            <p>
              Pembayaran akan diproses otomatis. Halaman ini akan ter-update
              setelah pembayaran berhasil.
            </p>
            <p className="mt-2">
              Tidak perlu upload bukti transfer.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 space-y-3"
          >
            <button
              onClick={() => paymentStatusQuery.refetch()}
              disabled={paymentStatusQuery.isFetching}
              className={`w-full py-3 rounded-full text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              } disabled:opacity-50`}
            >
              {paymentStatusQuery.isFetching ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Memeriksa...
                </span>
              ) : (
                'Periksa Status Pembayaran'
              )}
            </button>

            <Link
              to={`/booking/${id}/konfirmasi`}
              className={`flex items-center justify-center gap-2 text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowLeft size={16} />
              Kembali ke Detail Pesanan
            </Link>
          </motion.div>
        </div>
      </main>
    );
  }

  // Show payment method selection
  return (
    <main className={`min-h-screen pt-24 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDark ? 'bg-orange-500/15' : 'bg-orange-100'
          }`}>
            <CreditCard size={26} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
          </div>
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Pilih Metode Pembayaran
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Pilih metode pembayaran yang tersedia
          </p>
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
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Tanggal</span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>
                {formatTanggal(booking.tanggalMulai)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Durasi</span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>
                {Math.ceil((new Date(booking.tanggalSelesai).getTime() - new Date(booking.tanggalMulai).getTime()) / (1000 * 60 * 60 * 24))} hari
              </span>
            </div>
            <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Bayar</span>
              <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatRupiah(Number(booking.totalHarga))}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${cardClass} mt-4`}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-4 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Metode Pembayaran
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`p-4 rounded-xl text-left transition-all ${
                  selectedMethod === method.id
                    ? isDark
                      ? 'bg-orange-500/20 border-2 border-orange-500'
                      : 'bg-orange-50 border-2 border-orange-500'
                    : isDark
                      ? 'bg-white/5 border border-white/10 hover:border-white/20'
                      : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`mb-2 ${
                  selectedMethod === method.id
                    ? 'text-orange-500'
                    : isDark ? 'text-white/70' : 'text-slate-600'
                }`}>
                  {method.icon}
                </div>
                <p className={`text-xs font-medium ${
                  selectedMethod === method.id
                    ? isDark ? 'text-white' : 'text-slate-900'
                    : isDark ? 'text-white/70' : 'text-slate-700'
                }`}>
                  {method.name}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mt-4 flex items-center gap-2 text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}
        >
          <Shield size={14} />
          <span>Pembayaran aman dengan enkripsi 256-bit</span>
        </motion.div>

        {/* Action */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <button
            onClick={() => selectedMethod && createPaymentMutation.mutate(selectedMethod)}
            disabled={!selectedMethod || createPaymentMutation.isPending}
            className={`w-full py-4 rounded-full text-sm font-medium transition-all ${
              selectedMethod && !createPaymentMutation.isPending
                ? isDark
                  ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                : isDark
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {createPaymentMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Memproses...
              </span>
            ) : (
              'Lanjutkan Pembayaran'
            )}
          </button>

          <Link
            to={`/booking/${id}/konfirmasi`}
            className={`flex items-center justify-center gap-2 mt-3 text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ArrowLeft size={16} />
            Batal
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
