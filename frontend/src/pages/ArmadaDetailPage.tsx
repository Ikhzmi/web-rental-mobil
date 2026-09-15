import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Gauge,
  Users,
  ArrowLeft,
  CheckCircle,
  Building2,
  Calendar as CalendarIcon,
  ShieldCheck,
  Star,
  Wind,
  Music,
  Sparkles,
  Fuel,
  FileText,
  Check,
  Info,
  MapPin,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api, type Kategori, type TipeSewa } from '../lib/api';
import { Skeleton, SkeletonCalendarGrid } from '../components/Skeleton';
import { useTheme } from '../hooks/useTheme';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { useChat } from '../context/ChatContext';
import { sanitizeHtml } from '../lib/sanitize';
import { parseWibDate } from '../lib/dates';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const KATEGORI_LABEL: Record<Kategori, string> = {
  city_car: 'City Car',
  hatchback: 'Hatchback',
  suv: 'SUV',
  mpv: 'MPV',
  minibus: 'Minibus',
  pickup: 'Pickup',
  mewah: 'Mewah',
  electric: 'Electric',
};

const TIPE_SEWA_BADGE: Record<TipeSewa, { label: string; className: string }> = {
  lepas_kunci: { label: 'Bisa Lepas Kunci', className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' },
  dengan_sopir: { label: 'Wajib dengan Sopir', className: 'bg-blue-500/20 text-blue-300 border border-blue-400/30' },
  keduanya: {
    label: 'Lepas Kunci / Dengan Sopir',
    className: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
  },
};

function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}

/**
 * Helper parser dinamis untuk mengekstrak fasilitas & keunggulan dari deskripsi
 * dan atribut asli armada tanpa hardcoding teks palsu.
 */
function parseFacilities(deskripsi: string | null | undefined, kategori: string, transmisi: string, kursi: number) {
  const items: { text: string; icon: typeof Sparkles }[] = [];

  // Tambahkan fitur utama berdasarkan atribut fisik mobil
  items.push({ text: `Transmisi ${transmisi === 'manual' ? 'Manual' : 'Matic'} Responsi`, icon: Gauge });
  items.push({ text: `Kapasitas ${kursi} Kursi Penumpang`, icon: Users });
  items.push({ text: `Kategori ${KATEGORI_LABEL[kategori as Kategori] ?? kategori}`, icon: Sparkles });
  items.push({ text: 'Perlindungan Asuransi Unit', icon: ShieldCheck });

  if (deskripsi) {
    // Ekstrak baris atau frasa dari deskripsi jika ada
    const cleanText = deskripsi.replace(/<[^>]*>?/gm, '');
    const lines = cleanText.split(/[\n,;•-]+/).map(s => s.trim()).filter(s => s.length > 3 && s.length < 50);
    
    lines.forEach(line => {
      if (items.length < 8 && !items.some(it => it.text.toLowerCase() === line.toLowerCase())) {
        let icon = Check;
        const lower = line.toLowerCase();
        if (lower.includes('ac') || lower.includes('dingin') || lower.includes('blower')) icon = Wind;
        else if (lower.includes('audio') || lower.includes('bluetooth') || lower.includes('musik')) icon = Music;
        else if (lower.includes('irit') || lower.includes('bbm') || lower.includes('bensin')) icon = Fuel;
        else if (lower.includes('bersih') || lower.includes('rawat') || lower.includes('wangi')) icon = Sparkles;
        items.push({ text: line, icon });
      }
    });
  }

  return items;
}

export default function ArmadaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin, isAdmin } = useProfile();
  const fromPath = (location.state as any)?.from;
  const fromLabel = (location.state as any)?.fromLabel;
  const sectionRef = useRef<HTMLElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { startChatWithRental } = useChat();
  const [activeImage, setActiveImage] = useState(0);
  const [range, setRange] = useState<DateRange | undefined>();

  const carQuery = useQuery({
    queryKey: ['car', id],
    queryFn: () => api.getCar(id!),
    enabled: !!id,
  });

  const availabilityQuery = useQuery({
    queryKey: ['car-availability', id],
    queryFn: () => api.getCarAvailability(id!),
    enabled: !!id,
    // Ketersediaan harus selalu segar saat halaman dibuka — cache basi
    // (staleTime global 30 dtk) membuat tanggal yang baru terbooking orang
    // lain masih terlihat hitam padahal backend akan menolaknya.
    staleTime: 0,
  });

  const reviewsQuery = useQuery({
    queryKey: ['car-reviews', id],
    queryFn: () => api.listReviews(id!),
    enabled: !!id,
  });

  const reviews = reviewsQuery.data ?? [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const elements = sectionRef.current.querySelectorAll('.animate-section');
      gsap.fromTo(
        elements,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  const { session, loading: sessionLoading } = useSession();

  // Preload chunk halaman booking sejak awal supaya klik pertama
  // "Sewa Sekarang" tidak menampilkan fallback loading (blackscreen)
  // karena lazy chunk belum terunduh.
  useEffect(() => {
    void import('./BookingPage');
  }, []);

  // Preload ulang saat user mengarah/menyentuh CTA — mencakup kasus
  // preload awal terlewat (mis. klik < 1 detik setelah halaman dibuka).
  const preloadBookingChunk = () => {
    void import('./BookingPage');
  };

  const handleSewaSekarang = () => {
    try {
      let from = range?.from;
      let to = range?.to;

      // Jika user belum memilih tanggal di kalender detail armada, buat default hari ini
      if (!from) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        from = today;
        to = today;
      } else if (from && !to) {
        to = from;
      }

      const finalTo = to ?? from;
      const serializedRange = {
        from: from.toISOString(),
        to: finalTo.toISOString(),
      };

      if (id) {
        localStorage.setItem(`booking_range_${id}`, JSON.stringify(serializedRange));
      }

      // Use centralized session state to avoid races with onAuthStateChange.
      // Jangan paksa redirect ke login selagi sesi masih loading — user yang
      // sudah login akan terpental ke /login lalu balik lagi (terlihat
      // seperti blackscreen pada klik pertama). Biarkan RequireAuth yang
      // memutuskan setelah loading selesai.
      if (sessionLoading) {
        navigate(`/booking/${id}`, { state: { range: serializedRange } });
        return;
      }
      if (!session) {
        const redirectPath = `/booking/${id}`;
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      navigate(`/booking/${id}`, { state: { range: serializedRange } });
    } catch (err) {
      console.error('handleSewaSekarang error:', err);
    }
  };

  const handleChatRental = async () => {
    if (!car) return;
    try {
      if (!session) {
        const redirectPath = `/armada/${car.id}`;
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }
      await startChatWithRental(car);
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  const car = carQuery.data;
  const bookedRanges = availabilityQuery.data ?? [];

  // Helper: parse tanggal booking backend ke tanggal kalender WIB.
  // Jadwal tersimpan 01:00–23:00 WIB; 01:00 WIB = 18:00 UTC di hari
  // sebelumnya, jadi ambil bagian YYYY-MM-DD mentah dari ISO akan
  // menggeser blokir merah 1 hari lebih awal (tanggal terbooking terlihat
  // hitam tapi ditolak backend). parseWibDate memakai tanggal WIB.
  const parseLocalDate = (dateStr: string) => parseWibDate(dateStr);

  // Hitung durasi dan harga sewa jika user memilih range tanggal di kalender
  const rentalCalculation = useMemo(() => {
    if (!range?.from || !car) return null;
    const toDate = range.to || range.from;
    const diffTime = Math.abs(toDate.getTime() - range.from.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return {
      days,
      totalPrice: days * Number(car.hargaPerHari),
    };
  }, [range, car]);

  // Ekstrak fasilitas dinamis
  const dynamicFacilities = useMemo(() => {
    if (!car) return [];
    return parseFacilities(car.deskripsi, car.kategori, car.transmisi, car.kapasitasKursi);
  }, [car]);

  if (carQuery.isLoading) {
    return (
      <main className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-10 transition-colors duration-500 bg-[var(--bg-primary)]">
        <div className="relative max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-4 w-40 rounded-full" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Skeleton className="w-full h-64 sm:h-80 lg:h-96 rounded-3xl" />
              <div className="flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
                ))}
              </div>
              <Skeleton className="h-10 w-2/3 rounded-2xl" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24 rounded-3xl p-6 space-y-4 border border-white/10 dark:border-white/10">
                <Skeleton className="h-10 w-1/2 rounded-2xl mx-auto" />
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (carQuery.isError || !car) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-4 text-center px-5 transition-colors duration-300 bg-[var(--bg-primary)] pt-28 pb-20`}>
        <div className={`p-4 rounded-full ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <Info size={32} className={isDark ? 'text-white/40' : 'text-slate-400'} />
        </div>
        <p className={`text-base font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Mobil tidak ditemukan atau telah diarsip.</p>
        <button
          onClick={() => navigate('/armada')}
          className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 transition-all shadow-md active:scale-95"
        >
          Kembali ke Katalog Armada
        </button>
      </main>
    );
  }

  const badge = TIPE_SEWA_BADGE[car.tipeSewa];

  return (
    <main ref={sectionRef} className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-10 transition-colors duration-500 bg-[var(--bg-primary)]">
      <div className="relative max-w-6xl mx-auto">
        {/* Super Admin / Admin Mode Pratinjau Banner */}
        {(fromPath || isSuperAdmin || isAdmin) && (
          <div className={`mb-6 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border shadow-lg ${
            isDark
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>
                {isSuperAdmin
                  ? 'Mode Pratinjau Super Admin (Katalog Publik)'
                  : isAdmin
                  ? 'Mode Pratinjau Admin Rental'
                  : 'Pratinjau Halaman Publik'}
              </span>
            </div>
            <button
              onClick={() => navigate(fromPath || (isSuperAdmin ? '/superadmin/armada' : '/admin/armada'))}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                isDark
                  ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <ArrowLeft size={14} />
              <span>Kembali ke {fromLabel || (isSuperAdmin ? 'Panel Super Admin' : 'Panel Admin')}</span>
            </button>
          </div>
        )}

        {/* Navigation Top Bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(fromPath || '/armada')}
            className={`animate-section inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all hover:-translate-x-0.5 ${
              isDark ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft size={16} />
            {fromPath ? `Kembali ke ${fromLabel || 'Sebelumnya'}` : 'Kembali ke Armada'}
          </button>
          {fromPath && (
            <>
              <span className="opacity-30">•</span>
              <button
                onClick={() => navigate('/armada')}
                className={`text-xs font-medium underline underline-offset-4 opacity-70 hover:opacity-100 transition-opacity ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Katalog Armada
              </button>
            </>
          )}
        </div>

        {/* Instansi Verification Banner */}
        {car.instansi && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`animate-section mb-6 p-4 rounded-2xl flex items-start gap-4 border transition-all ${
              isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-200'
            }`}>
              <Building2 size={22} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base sm:text-lg truncate">{car.instansi.namaInstansi}</p>
                {car.instansi.status === 'aktif' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 rounded-full text-[10px] font-semibold shrink-0">
                    <CheckCircle size={11} />
                    Terverifikasi
                  </span>
                )}
              </div>
              <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Mitra Resmi Penyedia Rental Mobil</p>
              {car.instansi.alamat && (
                <div className={`flex items-start gap-1.5 text-xs ${
                  isDark ? 'text-white/60' : 'text-slate-600'
                }`}>
                  <MapPin size={12} className="shrink-0 mt-0.5 text-orange-500" />
                  <span>{car.instansi.alamat}</span>
                </div>
              )}
              {car.instansi.noHpPic && (
                <div className={`flex items-center gap-1.5 text-xs mt-1 ${
                  isDark ? 'text-white/60' : 'text-slate-600'
                }`}>
                  <Phone size={12} className="shrink-0 text-orange-500" />
                  <span>{car.instansi.noHpPic}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Photos + Specs + Dynamic Facilities + Reviews */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero Main Photo Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`animate-section relative rounded-3xl overflow-hidden border shadow-xl ${
                isDark ? 'sa-glass-dark' : 'sa-glass-light'
              }`}
            >
              {car.images.length > 0 ? (
                <div
                  className="w-full h-64 sm:h-80 lg:h-96 bg-contain bg-center bg-no-repeat transition-all duration-500"
                  style={{ backgroundImage: `url(${car.images[activeImage]?.url})` }}
                />
              ) : (
                <div className={`w-full h-64 sm:h-80 lg:h-96 flex items-center justify-center ${
                  isDark ? 'text-white/30' : 'text-slate-400'
                } text-sm font-medium`}>
                  Belum ada foto armada
                </div>
              )}
              {/* Floating Badge */}
              <div className="absolute top-4 left-4">
                <span className={`inline-block text-xs font-semibold px-3.5 py-1.5 rounded-full backdrop-blur-xl shadow-md ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            </motion.div>

            {/* Photo Thumbnails Selector */}
            {car.images.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="animate-section flex gap-3 overflow-x-auto pb-1"
              >
                {car.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                      i === activeImage
                        ? isDark
                          ? 'border-white ring-2 ring-white/30 shadow-lg'
                          : 'border-slate-900 ring-2 ring-slate-900/20 shadow-lg'
                        : isDark
                          ? 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                          : 'border-slate-300 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div
                      className="w-full h-full bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${img.url})` }}
                    />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Title & Rating */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="animate-section">
              <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${
                isDark ? 'text-white/50' : 'text-slate-500'
              }`}>
                {KATEGORI_LABEL[car.kategori]}
              </p>
              <div className="flex items-center flex-wrap gap-3 mb-5">
                <h1 className={`font-bold text-3xl sm:text-4xl tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}>
                  {car.nama}
                </h1>
                {reviews.length > 0 && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
                  }`}>
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold">{avgRating.toFixed(1)}</span>
                    <span className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      ({reviews.length} ulasan)
                    </span>
                  </div>
                )}
              </div>

              {/* Nomor Plat Badge */}
              {car.nomorPlat && (
                <div className={`inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl border ${
                  isDark
                    ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}>
                  <FileText size={14} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
                  <span className="text-xs text-opacity-70">Nomor Plat</span>
                  <span className="font-mono font-bold tracking-widest text-sm">{car.nomorPlat}</span>
                </div>
              )}

              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: Gauge, label: 'Transmisi', value: car.transmisi },
                  { icon: Fuel, label: 'Bahan Bakar', value: car.bahanBakar || 'bensin' },
                  { icon: Users, label: 'Kapasitas', value: `${car.kapasitasKursi} Kursi` },
                  { icon: ShieldCheck, label: 'Asuransi', value: 'Proteksi Penuh' },
                ].map((spec) => (
                  <div
                    key={spec.label}
                    className={`rounded-2xl p-4 text-center border transition-all ${
                      isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
                    }`}
                  >
                    <spec.icon size={20} className={`mx-auto mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
                    <p className="text-xs font-bold capitalize">{spec.value}</p>
                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{spec.label}</p>
                  </div>
                ))}
              </div>

              {/* Fasilitas Dinamis (No Hardcoding) */}
              <div className={`rounded-2xl p-5 mb-6 border ${
                isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
              }`}>
                <h3 className="text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-orange-500" />
                  <span>Fasilitas & Keunggulan Unit</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dynamicFacilities.map((feat, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium ${
                        isDark ? 'bg-white/5 border-white/10 text-white/90' : 'bg-white/70 border-white/90 text-slate-800 shadow-xs'
                      }`}
                    >
                      <feat.icon size={15} className="text-orange-500 shrink-0" />
                      <span className="line-clamp-1">{feat.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Syarat Sewa */}
              <div className={`rounded-2xl p-5 mb-6 border ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                  : 'bg-amber-50/80 border-amber-200/80 text-amber-900 shadow-xs'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Persyaratan Ketentuan Sewa</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>e-KTP Asli Penyewa</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>SIM A Aktif (Khusus Lepas Kunci)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Sewa Harian (Jam 01.00 – 23.00 WIB)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Jaminan/Deposit Dikembalikan Utuh</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {car.deskripsi && (
                <div className={`rounded-2xl p-5 mb-6 border ${
                  isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
                }`}>
                  <h3 className="text-xs uppercase tracking-wider font-bold mb-2">Deskripsi Tambahan</h3>
                  <div
                    className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(car.deskripsi || '') }}
                  />
                </div>
              )}

              {/* Dynamic Customer Reviews */}
              <div className={`rounded-2xl p-5 border ${
                isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
              }`}>
                <h3 className="text-xs uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span>Ulasan Pelanggan {reviews.length > 0 && `(${reviews.length})`}</span>
                </h3>
                {reviewsQuery.isLoading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-28 rounded" />
                    </div>
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-5/6 rounded" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-6">
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                      Belum ada ulasan untuk armada ini. Jadilah penyewa pertama yang memberikan ulasan!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className={`pb-3.5 last:pb-0 border-b last:border-0 ${
                          isDark ? 'border-white/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {(review.profile?.nama ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold">{review.profile?.nama ?? 'Pelanggan'}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                className={s <= review.rating ? 'fill-amber-400 text-amber-400' : isDark ? 'text-white/20' : 'text-slate-200'}
                              />
                            ))}
                          </div>
                        </div>
                        {review.komentar && (
                          <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                            {review.komentar}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Sticky Pricing & Interactive Availability Calendar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`lg:sticky lg:top-24 rounded-3xl p-6 shadow-2xl border ${
                isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
              }`}
            >
              {/* Price Display */}
              <div className={`text-center mb-6 pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  Harga Sewa / Hari
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {formatRupiah(car.hargaPerHari)}
                </p>
              </div>

              {/* Interactive Calendar Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className={isDark ? 'text-white/70' : 'text-slate-700'} />
                    <h3 className="text-xs uppercase tracking-wider font-bold">Kalender Ketersediaan</h3>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isDark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
                    Klik & Pilih Tanggal
                  </span>
                </div>

                {availabilityQuery.isLoading ? (
                  <SkeletonCalendarGrid />
                ) : (
                  <div className="kerental-daypicker">
                    <DayPicker
                      mode="range"
                      selected={range}
                      onSelect={setRange}
                      disabled={[
                        { before: new Date() },
                        ...bookedRanges.map((r) => ({
                          from: parseLocalDate(r.tanggalMulai),
                          to: parseLocalDate(r.tanggalSelesai),
                        })),
                      ]}
                      classNames={{
                        months: 'flex flex-col w-full',
                        month: 'w-full',
                        month_caption: `flex items-center justify-between w-full ${isDark ? 'text-white' : 'text-slate-900'} font-bold text-sm mb-3`,
                        nav: 'flex items-center gap-1',
                        month_grid: 'w-full border-collapse',
                        weekdays: 'w-full',
                        weekday: `${isDark ? 'text-white/40' : 'text-slate-400'} text-[10px] uppercase font-bold tracking-wider text-center pb-2`,
                        weeks: 'w-full',
                        week: 'w-full',
                        day: 'transition-all duration-150 p-0.5',
                        day_button: `w-full h-full aspect-square rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                          isDark ? 'hover:bg-white/15' : 'hover:bg-slate-200'
                        }`,
                        selected: isDark
                          ? 'bg-white text-slate-950 font-bold rounded-full shadow-md'
                          : 'bg-slate-950 text-white font-bold rounded-full shadow-md',
                        range_middle: isDark ? 'bg-white/20 text-white rounded-none' : 'bg-slate-200 text-slate-900 rounded-none',
                        range_start: 'rounded-r-none',
                        range_end: 'rounded-l-none',
                        today: `font-extrabold underline ring-2 ${isDark ? 'ring-white/60' : 'ring-slate-900/60'} rounded-full`,
                        // STYLING SANGAT PEKAT UNTUK TANGGAL TIDAK TERSEDIA / TERISI (Vivid Solid Deep Red)
                        disabled: 'bg-red-600 text-white font-bold opacity-100 shadow-xs cursor-not-allowed rounded-full line-through',
                        outside: isDark ? 'text-white/15 opacity-30' : 'text-slate-300 opacity-30',
                      }}
                    />
                  </div>
                )}

                {/* Clear High-Contrast Legend */}
                <div className={`mt-4 grid grid-cols-2 gap-2 text-[11px] font-medium pt-3 border-t ${
                  isDark ? 'border-white/10 text-white/70' : 'border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-400 bg-white/30" />
                    <span>Tersedia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">✕</span>
                    <span className="font-bold text-red-600 dark:text-red-400">Tidak Tersedia (Terisi)</span>
                  </div>
                </div>

                {/* Real-time Calculation Summary Box */}
                {rentalCalculation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-3.5 rounded-2xl border text-xs ${
                      isDark
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 font-semibold">
                      <span>Estimasi Sewa ({rentalCalculation.days} Hari)</span>
                      <span className="text-sm font-extrabold">{formatRupiah(rentalCalculation.totalPrice)}</span>
                    </div>
                    <p className={`text-[10px] ${isDark ? 'text-emerald-300/70' : 'text-emerald-700'}`}>
                      {range?.from?.toLocaleDateString('id-ID')}
                      {rentalCalculation.days === 1 ? ' (Sewa 1 Hari: 01.00 - 23.00 WIB)' : ` s/d ${range?.to?.toLocaleDateString('id-ID')}`}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Office Address Info */}
              {car.instansi?.alamat && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-5 p-3.5 rounded-2xl border text-xs ${
                    isDark
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-200'
                      : 'bg-orange-50 border-orange-200 text-orange-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 font-bold">
                    <Building2 size={13} className="text-orange-500" />
                    <span>Ambil Mobil di Kantor</span>
                  </div>
                  <div className={`flex items-start gap-1.5 ${
                    isDark ? 'text-orange-200/80' : 'text-orange-800'
                  }`}>
                    <MapPin size={12} className="shrink-0 mt-0.5 text-orange-500" />
                    <span>{car.instansi.alamat}</span>
                  </div>
                  {car.instansi.noHpPic && (
                    <div className={`flex items-center gap-1.5 mt-1 ${
                      isDark ? 'text-orange-200/80' : 'text-orange-800'
                    }`}>
                      <Phone size={12} className="shrink-0 text-orange-500" />
                      <span>{car.instansi.noHpPic}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleChatRental}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
                  }`}
                >
                  <MessageCircle size={17} />
                  <span>Tanya Rental / Chat</span>
                </button>

                <button
                  onClick={handleSewaSekarang}
                  onMouseEnter={preloadBookingChunk}
                  onFocus={preloadBookingChunk}
                  onTouchStart={preloadBookingChunk}
                  disabled={car.status !== 'tersedia'}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                    car.status === 'tersedia'
                      ? 'bg-slate-950 hover:bg-slate-900 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 active:scale-98'
                      : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/40 cursor-not-allowed'
                  }`}
                >
                  <span>{car.status === 'tersedia' ? 'Sewa Sekarang' : 'Mobil Tidak Tersedia'}</span>
                </button>
              </div>

              {/* Safety Badges */}
              <div className={`mt-5 pt-4 border-t flex items-center justify-around text-[11px] ${
                isDark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-500'
              }`}>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Garansi Unit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span>Tanpa Biaya Tersembunyi</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 p-3.5 px-5 shadow-2xl flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-slate-500 dark:text-white/40">Harga Sewa</p>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-950 dark:text-white">
              {formatRupiah(car.hargaPerHari)}
            </span>
            <span className="text-[10px] text-slate-400">/hari</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleChatRental}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
              isDark
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}
            aria-label="Chat Rental"
            title="Tanya Rental"
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={handleSewaSekarang}
            onMouseEnter={preloadBookingChunk}
            onFocus={preloadBookingChunk}
            onTouchStart={preloadBookingChunk}
            disabled={car.status !== 'tersedia'}
            className={`py-2.5 px-5 rounded-xl font-bold text-xs transition-all shadow-md ${
              car.status === 'tersedia'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 active:scale-95'
                : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/40 cursor-not-allowed'
            }`}
          >
            {car.status === 'tersedia' ? 'Sewa Sekarang' : 'Tidak Tersedia'}
          </button>
        </div>
      </div>

      <style>{`
        .kerental-daypicker {
          --rdp-cell-size: 34px;
        }
        .kerental-daypicker .rdp-months {
          justify-content: center;
        }
        .kerental-daypicker .rdp-caption {
          padding-bottom: 8px;
        }
        .kerental-daypicker .rdp-head_cell {
          padding-bottom: 6px;
        }
      `}</style>
    </main>
  );
}