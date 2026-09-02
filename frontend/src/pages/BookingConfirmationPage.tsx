import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Shield,
  Clock,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Zap,
} from 'lucide-react';
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

// ============================================================================
// OFFICIAL VECTOR SVG LOGOS (Authentic Brand Identity)
// ============================================================================

function OVOLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#4C2A86] flex items-center justify-center shadow-sm border border-purple-900/40 shrink-0 px-1">
      <svg viewBox="0 0 100 40" className="h-5 w-auto" fill="none">
        <circle cx="22" cy="20" r="13" stroke="white" strokeWidth="5" />
        <circle cx="22" cy="20" r="5" fill="white" />
        <path d="M43 7 L52 33 L61 7" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="78" cy="20" r="13" stroke="white" strokeWidth="5" />
      </svg>
    </div>
  );
}

function QRISLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#ED1C24] flex items-center justify-center shadow-sm border border-red-700 shrink-0 px-1">
      <span className="font-extrabold text-[12px] text-white tracking-widest leading-none">QRIS</span>
    </div>
  );
}

function BRILogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#00529C] flex items-center justify-center shadow-sm border border-blue-900 shrink-0 px-1">
      <span className="font-black text-[13px] text-white tracking-tighter leading-none">BRI</span>
    </div>
  );
}

function BNILogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#F15A24] flex items-center justify-center shadow-sm border border-orange-700 shrink-0 px-1 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-3 h-3 bg-[#005E6A] rounded-bl-full" />
      <span className="font-black text-[13px] text-white tracking-tighter leading-none">BNI</span>
    </div>
  );
}

function BCALogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#003399] flex items-center justify-center shadow-sm border border-blue-900 shrink-0 px-1">
      <span className="font-black text-[12px] text-white italic tracking-tighter leading-none">BCA</span>
    </div>
  );
}

function MandiriLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#002D62] flex items-center justify-center shadow-sm border border-blue-950 shrink-0 px-1 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-4 h-2 bg-[#FFB81C] rounded-tl-full" />
      <span className="font-extrabold text-[10px] text-white lowercase tracking-tight leading-none">mandiri</span>
    </div>
  );
}

function PermataLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#008A4B] flex items-center justify-center shadow-sm border border-emerald-900 shrink-0 px-1">
      <div className="flex items-center gap-0.5">
        <div className="w-2 h-2 rotate-45 bg-white/90" />
        <span className="font-bold text-[9px] text-white tracking-tight leading-none">Permata</span>
      </div>
    </div>
  );
}

function CIMBLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#7A0026] flex items-center justify-center shadow-sm border border-rose-950 shrink-0 px-1">
      <span className="font-black text-[11px] text-white tracking-tighter leading-none">CIMB</span>
    </div>
  );
}

function MaybankLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#FFC72C] flex items-center justify-center shadow-sm border border-amber-500 shrink-0 px-1">
      <span className="font-black text-[10px] text-black tracking-tight leading-none">Maybank</span>
    </div>
  );
}

function SampoernaLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#0066B2] flex items-center justify-center shadow-sm border border-blue-800 shrink-0 px-1">
      <span className="font-bold text-[8.5px] text-white tracking-tight leading-none">Sampoerna</span>
    </div>
  );
}

function DANALogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#118EEA] flex items-center justify-center shadow-sm border border-blue-600 shrink-0 px-1">
      <span className="font-black text-[11px] text-white tracking-wider leading-none">DANA</span>
    </div>
  );
}

function ShopeePayLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#EE4D2D] flex items-center justify-center shadow-sm border border-orange-600 shrink-0 px-1">
      <span className="font-extrabold text-[9px] text-white tracking-tight leading-none">ShopeePay</span>
    </div>
  );
}

function GoPayLogo() {
  return (
    <div className="w-11 h-8 rounded-lg bg-[#00AED6] flex items-center justify-center shadow-sm border border-cyan-600 shrink-0 px-1">
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-full border-2 border-white" />
        <span className="font-extrabold text-[10px] text-white tracking-tight leading-none">gopay</span>
      </div>
    </div>
  );
}

interface PaymentMethodOption {
  id: string;
  name: string;
  badgeText: string;
  category: 'qris_ewallet' | 'va';
  description: string;
  logo: React.ReactNode;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  // QRIS & E-Wallets
  {
    id: 'qris',
    name: 'QRIS (Semua Bank & E-Wallet)',
    badgeText: 'INSTAN',
    category: 'qris_ewallet',
    description: 'Scan via BCA, Mandiri, BRImo, Livin, GoPay, OVO, DANA, dll',
    logo: <QRISLogo />,
  },
  {
    id: 'ovo',
    name: 'OVO',
    badgeText: 'E-WALLET',
    category: 'qris_ewallet',
    description: 'Pembayaran instan via aplikasi OVO',
    logo: <OVOLogo />,
  },
  {
    id: 'dana',
    name: 'DANA',
    badgeText: 'E-WALLET',
    category: 'qris_ewallet',
    description: 'Pembayaran instan via aplikasi DANA',
    logo: <DANALogo />,
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    badgeText: 'E-WALLET',
    category: 'qris_ewallet',
    description: 'Pembayaran instan via aplikasi ShopeePay',
    logo: <ShopeePayLogo />,
  },
  {
    id: 'gopay',
    name: 'GoPay',
    badgeText: 'E-WALLET',
    category: 'qris_ewallet',
    description: 'Pembayaran instan via aplikasi GoPay / Gojek',
    logo: <GoPayLogo />,
  },

  // Virtual Accounts (Bank Transfer)
  {
    id: 'bri_va',
    name: 'BRI Virtual Account',
    badgeText: 'VA BRI',
    category: 'va',
    description: 'Transfer via BRImo, ATM BRI, & Internet Banking',
    logo: <BRILogo />,
  },
  {
    id: 'bni_va',
    name: 'BNI Virtual Account',
    badgeText: 'VA BNI',
    category: 'va',
    description: 'Transfer via BNI Mobile Banking, ATM BNI, & Wondr',
    logo: <BNILogo />,
  },
  {
    id: 'bca_va',
    name: 'BCA (Virtual Account)',
    badgeText: 'VA BCA',
    category: 'va',
    description: 'Transfer via myBCA, BCA Mobile, & KlikBCA',
    logo: <BCALogo />,
  },
  {
    id: 'mandiri_va',
    name: 'Mandiri (Virtual Account)',
    badgeText: 'VA MANDIRI',
    category: 'va',
    description: 'Transfer via Livin by Mandiri & ATM Mandiri',
    logo: <MandiriLogo />,
  },
  {
    id: 'cimb_niaga_va',
    name: 'CIMB Niaga VA',
    badgeText: 'VA CIMB',
    category: 'va',
    description: 'Transfer via OCTO Mobile & ATM CIMB Niaga',
    logo: <CIMBLogo />,
  },
  {
    id: 'permata_va',
    name: 'Permata Virtual Account',
    badgeText: 'VA PERMATA',
    category: 'va',
    description: 'Transfer via PermataMobile X & ATM Permata',
    logo: <PermataLogo />,
  },
  {
    id: 'maybank_va',
    name: 'Maybank Virtual Account',
    badgeText: 'VA MAYBANK',
    category: 'va',
    description: 'Transfer via M2U ID & ATM Maybank',
    logo: <MaybankLogo />,
  },
  {
    id: 'sampoerna_va',
    name: 'Bank Sampoerna VA',
    badgeText: 'VA SAMPOERNA',
    category: 'va',
    description: 'Transfer antar bank via ATM Bersama & BI-FAST',
    logo: <SampoernaLogo />,
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

function getPakasirFee(amount: number, methodId: string): number {
  if (methodId === 'sampoerna_va') return 2000;
  if (methodId.includes('va')) return 3500;
  return Math.max(380, Math.round(amount * 0.007) + 310);
}

export default function BookingConfirmationPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { id } = useParams<{ id: string }>();

  const [selectedMethod, setSelectedMethod] = useState<string>('qris');
  const [activeTab, setActiveTab] = useState<'qris_ewallet' | 'va'>('qris_ewallet');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentNumber, setPaymentNumber] = useState<string | null>(null);
  const [qrisString, setQrisString] = useState<string | null>(null);
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

  // Fetch booking details
  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (method: string) => api.createPayment(id!, { paymentMethod: method }),
    onSuccess: (data) => {
      setPaymentUrl(data.paymentUrl);
      if (data.paymentNumber) setPaymentNumber(data.paymentNumber);
      if (data.qrisString) setQrisString(data.qrisString);
      setShowPaymentLink(true);
      paymentStatusQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 503) {
        alert('Layanan pembayaran sedang dipelihara. Silakan hubungi admin.');
      } else {
        alert('Gagal memproses pembayaran: ' + (error instanceof Error ? error.message : 'Error'));
      }
    },
  });

  // Poll payment status every 3s
  const paymentStatusQuery = useQuery({
    queryKey: ['booking-payment-status', id],
    queryFn: () => api.getBookingPaymentStatus(id!),
    enabled: !!id && bookingQuery.data?.status === 'menunggu_pembayaran',
    refetchInterval: 3000,
  });

  // Sandbox simulation mutation
  const simulateMutation = useMutation({
    mutationFn: () => api.simulateBookingPayment(id!),
    onSuccess: () => {
      paymentStatusQuery.refetch();
      bookingQuery.refetch();
    },
    onError: (err) => {
      alert('Gagal simulasi pembayaran: ' + (err instanceof Error ? err.message : 'Error'));
    },
  });

  useEffect(() => {
    if (paymentStatusQuery.data?.bookingStatus === 'dikonfirmasi') {
      bookingQuery.refetch();
    }
    if (paymentStatusQuery.data?.paymentUrl && !paymentUrl) {
      setPaymentUrl(paymentStatusQuery.data.paymentUrl);
    }
    if (paymentStatusQuery.data?.paymentNumber && !paymentNumber) {
      setPaymentNumber(paymentStatusQuery.data.paymentNumber);
    }
  }, [paymentStatusQuery.data?.bookingStatus, paymentStatusQuery.data?.paymentUrl, paymentStatusQuery.data?.paymentNumber]);

  useEffect(() => {
    if (bookingQuery.data?.expiresAt) {
      const interval = setInterval(() => {
        setCountdown(formatCountdown(bookingQuery.data.expiresAt!));
      }, 1000);
      setCountdown(formatCountdown(bookingQuery.data.expiresAt!));
      return () => clearInterval(interval);
    }
  }, [bookingQuery.data?.expiresAt]);

  const [copiedNominal, setCopiedNominal] = useState(false);

  const handleCopy = (text: string, isNominal = false) => {
    navigator.clipboard.writeText(text);
    if (isNominal) {
      setCopiedNominal(true);
      setTimeout(() => setCopiedNominal(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Countdown progress bar (percentage)
  const getCountdownPercent = (): number => {
    if (!bookingQuery.data?.expiresAt) return 0;
    const deadline = new Date(bookingQuery.data.expiresAt).getTime();
    const created = deadline - 24 * 60 * 60 * 1000; // assume 24h window
    const now = Date.now();
    const elapsed = now - created;
    const total = deadline - created;
    return Math.max(0, Math.min(100, ((total - elapsed) / total) * 100));
  };

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-5';

  const statusColor = isDark ? STATUS_COLOR_DARK : STATUS_COLOR_LIGHT;

  if (bookingQuery.isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <Loader2 size={18} className="animate-spin" />
        <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Memuat pesanan...</span>
      </main>
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-3 text-center px-5 text-sm transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <AlertCircle size={44} className={isDark ? 'text-white/30' : 'text-slate-300'} />
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
  const activeUrl = paymentUrl || paymentStatusQuery.data?.paymentUrl;
  const basePrice = Number(booking.totalHarga);
  const currentFee = getPakasirFee(basePrice, selectedMethod);
  const finalPrice = basePrice + currentFee;

  const currentMethodObj = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
  const isVirtualAccount = selectedMethod.includes('va');

  return (
    <main className={`min-h-screen pt-24 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-lg mx-auto">
        {/* Status Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          {isConfirmed ? (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
              <CheckCircle2 size={32} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            </div>
          ) : isWaitingPayment ? (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-amber-500/15' : 'bg-amber-100'}`}>
              <Clock size={32} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
          ) : (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-500/15' : 'bg-red-100'}`}>
              <AlertCircle size={32} className={isDark ? 'text-red-400' : 'text-red-600'} />
            </div>
          )}
          <h1 className={`font-playfair italic text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isConfirmed ? 'Pesanan Dikonfirmasi' : isWaitingPayment ? 'Selesaikan Pembayaran' : 'Pesanan Dibatalkan'}
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

        {/* ORDER JOURNEY STEPPER */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`${cardClass} mb-5`}
        >
          <h2 className={`text-[11px] uppercase tracking-wider mb-4 font-semibold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Perjalanan Pesanan
          </h2>
          <div className="relative">
            {/* Connecting Line */}
            <div className={`absolute left-4 top-4 bottom-4 w-0.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            {[
              {
                label: 'Pesanan Dibuat',
                sub: 'Data pemesanan berhasil disimpan',
                done: true,
                active: false,
              },
              {
                label: 'Menunggu Pembayaran',
                sub: isWaitingPayment ? `Batas: ${countdown}` : 'Pembayaran diterima',
                done: !isWaitingPayment && booking.status !== 'dibatalkan',
                active: isWaitingPayment,
              },
              {
                label: 'Verifikasi Otomatis',
                sub: isConfirmed ? 'Pembayaran terverifikasi' : 'Berlangsung setelah bayar',
                done: isConfirmed,
                active: false,
              },
              {
                label: 'Mobil Siap Digunakan',
                sub: isConfirmed ? `Ambil tanggal ${formatTanggal(booking.tanggalMulai)}` : 'Menunggu konfirmasi',
                done: booking.status === 'berjalan' || booking.status === 'selesai',
                active: booking.status === 'dikonfirmasi',
              },
            ].map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-4 mb-4 last:mb-0">
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  step.done
                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                    : step.active
                    ? 'bg-amber-500 shadow-md shadow-amber-500/30 animate-pulse'
                    : isDark ? 'bg-white/10 border border-white/20' : 'bg-slate-100 border border-slate-200'
                }`}>
                  {step.done ? (
                    <Check size={14} className="text-white stroke-[2.5]" />
                  ) : step.active ? (
                    <Clock size={13} className="text-white" />
                  ) : (
                    <span className={`text-xs font-bold ${isDark ? 'text-white/30' : 'text-slate-300'}`}>{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-sm font-semibold ${
                    step.done ? (isDark ? 'text-emerald-400' : 'text-emerald-700') :
                    step.active ? (isDark ? 'text-amber-400' : 'text-amber-700') :
                    isDark ? 'text-white/40' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    {step.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Countdown Progress Bar */}
          {isWaitingPayment && countdown && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className={isDark ? 'text-amber-400/80' : 'text-amber-700'}>Sisa waktu pembayaran</span>
                <span className={`font-bold tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{countdown}</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-amber-100'}`}>
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${getCountdownPercent()}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Polling Indicator */}
        {isWaitingPayment && paymentStatusQuery.isFetching && (
          <div className={`text-center text-xs mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            <Loader2 size={12} className="animate-spin inline mr-1.5" />
            Memverifikasi status pembayaran secara otomatis...
          </div>
        )}

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
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Mobil</span>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car?.nama ?? '-'}</span>
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
            <div className={`border-t pt-2 mt-1 flex justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Total Sewa Mobil</span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatRupiah(basePrice)}</span>
            </div>
            {isWaitingPayment && (
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Biaya Layanan Pembayaran</span>
                <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>
                  + {formatRupiah(currentFee)}
                </span>
              </div>
            )}
            <div className={`border-t pt-3 mt-1 flex justify-between items-center ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Tagihan Pembayaran</span>
              <span className={`font-bold text-lg ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                {formatRupiah(isWaitingPayment ? finalPrice : basePrice)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* PAYMENT SECTION - DIRECTLY INTEGRATED IN SINGLE PAGE */}
        {isWaitingPayment && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`mt-5 ${cardClass}`}
          >
            {/* Header Payment */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                <h2 className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  Metode Pembayaran
                </h2>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                Enkripsi 256-bit Aman
              </span>
            </div>

            {/* Method Category Switcher (QRIS & E-Wallet vs Virtual Account) */}
            {!showPaymentLink && (
              <div className="flex rounded-xl p-1 mb-4 bg-black/10 dark:bg-white/5 border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qris_ewallet');
                    setSelectedMethod('qris');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'qris_ewallet'
                      ? isDark
                        ? 'bg-orange-500 text-white shadow'
                        : 'bg-white text-slate-900 shadow'
                      : isDark
                        ? 'text-white/60 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QRIS & E-Wallet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('va');
                    setSelectedMethod('bri_va');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'va'
                      ? isDark
                        ? 'bg-orange-500 text-white shadow'
                        : 'bg-white text-slate-900 shadow'
                      : isDark
                        ? 'text-white/60 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Transfer Bank (Virtual Account)
                </button>
              </div>
            )}

            {/* Payment Method Selection Grid */}
            {!showPaymentLink ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {PAYMENT_METHODS.filter((m) => m.category === activeTab).map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-3 rounded-xl text-left transition-all relative overflow-hidden flex items-center gap-3 ${
                          isSelected
                            ? isDark
                              ? 'bg-orange-500/20 border-2 border-orange-500 shadow-md shadow-orange-500/10'
                              : 'bg-orange-50/90 border-2 border-orange-500 shadow-md shadow-orange-500/10'
                            : isDark
                              ? 'bg-white/5 border border-white/10 hover:border-white/20'
                              : 'bg-white border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {method.logo}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-white/90' : 'text-slate-800')}`}>
                              {method.name}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-tight truncate ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            {method.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => createPaymentMutation.mutate(selectedMethod)}
                  disabled={createPaymentMutation.isPending}
                  className={`w-full py-3.5 rounded-full text-sm font-semibold transition-all mt-3 flex items-center justify-center gap-2 shadow-lg ${
                    createPaymentMutation.isPending
                      ? isDark ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isDark
                        ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25'
                  }`}
                >
                  {createPaymentMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Memproses Pembayaran...
                    </>
                  ) : (
                    <>
                      Bayar Sekarang ({formatRupiah(finalPrice)})
                      <ExternalLink size={16} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Active Payment Link & Instructions Container */
              <div className="space-y-4">
                {isVirtualAccount ? (
                  /* VIRTUAL ACCOUNT DISPLAY */
                  <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-md'}`}>
                    <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-slate-200/50">
                      <div className="flex items-center gap-2.5">
                        {currentMethodObj?.logo}
                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {currentMethodObj?.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                        Virtual Account
                      </span>
                    </div>

                    <p className={`text-xs mb-1.5 font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                      Nomor Rekening Virtual Account:
                    </p>
                    <div className={`p-3 rounded-xl flex items-center justify-between gap-2 mb-3 ${isDark ? 'bg-black/30 border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                      <span className={`font-mono text-base sm:text-lg font-bold tracking-wider ${isDark ? 'text-orange-400' : 'text-slate-900'}`}>
                        {paymentNumber || '123123123'}
                      </span>
                      <button
                        onClick={() => handleCopy(paymentNumber || '123123123')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                          isDark
                            ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                            : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={14} className="text-emerald-500" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Salin VA</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Salin Nominal — tombol terpisah supaya tidak salah nominal */}
                    <div className={`p-2.5 rounded-xl mb-3 ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'} flex justify-between items-center`}>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${isDark ? 'text-orange-400/60' : 'text-orange-500/70'}`}>
                          Transfer tepat nominal ini:
                        </p>
                        <span className={`font-bold text-base ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{formatRupiah(finalPrice)}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(String(finalPrice), true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                          isDark
                            ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                            : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                        }`}
                      >
                        {copiedNominal ? (
                          <>
                            <Check size={14} className="text-emerald-500" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Salin Nominal</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className={`text-[11px] space-y-1.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      <p className="font-semibold text-xs text-orange-500 mb-1">Petunjuk Pembayaran:</p>
                      <p>1. Buka aplikasi Mobile Banking atau ATM bank Anda.</p>
                      <p>2. Pilih menu <strong>Transfer / Bayar → Virtual Account</strong>.</p>
                      <p>3. Masukkan nomor Virtual Account di atas.</p>
                      <p>4. Pastikan nominal transfer persis <strong>{formatRupiah(finalPrice)}</strong>.</p>
                    </div>

                    {/* Tombol Bantuan WhatsApp */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Halo, saya butuh bantuan untuk pembayaran sewa mobil. Booking ID: ${booking.id}, Nominal: ${formatRupiah(finalPrice)}, No. VA: ${paymentNumber || '-'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isDark
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Butuh Bantuan? Hubungi via WhatsApp
                    </a>
                  </div>
                ) : (
                  /* QRIS DISPLAY */
                  <div className={`flex flex-col items-center justify-center p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-md'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {currentMethodObj?.logo}
                      <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Scan QRIS Pembayaran
                      </span>
                    </div>

                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        qrisString || activeUrl || '00020101021226610016ID.CO.QRIS.WWW'
                      )}`}
                      alt="Kode QRIS Pembayaran"
                      className="w-56 h-56 object-contain rounded-xl border-2 border-slate-100 p-2 bg-white shadow-sm"
                    />

                    <p className="text-xs font-bold text-orange-500 mt-2">
                      Total: {formatRupiah(finalPrice)}
                    </p>

                    <p className={`text-[11px] mt-1 text-center ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      Bisa di-scan dari BCA, Mandiri, BRImo, Livin, GoPay, OVO, DANA, ShopeePay, dll.
                    </p>
                  </div>
                )}

                {activeUrl && (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
                      isDark
                        ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25'
                    }`}
                  >
                    Buka Portal Pembayaran Langsung
                    <ExternalLink size={16} />
                  </a>
                )}

                {/* Sandbox Simulation Action Button */}
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-amber-500">Mode Sandbox</span>
                    </div>
                    <span className="text-[10px] text-amber-600/80">Pengujian Pembayaran</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => simulateMutation.mutate()}
                    disabled={simulateMutation.isPending}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center justify-center gap-1.5 shadow"
                  >
                    {simulateMutation.isPending ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Mensimulasikan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Simulasikan Pembayaran Berhasil
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setShowPaymentLink(false)}
                    className={`flex-1 py-2.5 rounded-full text-xs font-medium transition-colors ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 text-white/80'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Ganti Metode Pembayaran
                  </button>
                  <button
                    onClick={() => paymentStatusQuery.refetch()}
                    disabled={paymentStatusQuery.isFetching}
                    className={`px-4 py-2.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 text-white/80'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <RefreshCw size={13} className={paymentStatusQuery.isFetching ? 'animate-spin' : ''} />
                    Cek Status
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Confirmed - Payment Success Info */}
        {isConfirmed && booking.status !== 'dibatalkan' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mt-5 rounded-2xl p-5 ${
              isDark
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-emerald-50 border border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 size={22} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              <p className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Pembayaran Berhasil Dikonfirmasi</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              Pembayaran kamu sudah terverifikasi secara otomatis. Mobil siap digunakan sesuai tanggal sewa.
            </p>
          </motion.div>
        )}

        {/* Navigation Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col sm:flex-row gap-3 mt-6"
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
