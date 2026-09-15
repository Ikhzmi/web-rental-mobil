import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DateRange } from 'react-day-picker';
import {
  Loader2,
  ShieldCheck,
  Car as CarIcon,
  Truck,
  Check,
  MapPin,
  Calendar as CalendarIcon,
  User,
  CreditCard,
  FileCheck,
  Sparkles,
  ExternalLink,
  Home,
  Building2,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError, type JenisAddon } from '../lib/api';
import { estimasiHarga, formatRupiah } from '../lib/pricing';
import { Skeleton } from '../components/Skeleton';
import { formatRentangTanggal, isSameWibDay, toWibDayKey } from '../lib/dates';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useTheme } from '../hooks/useTheme';

import { lookupKodepos, type KodeposResult } from '../lib/kodepos';

type LokasiPengambilan = 'ambil_ditempat' | 'jemput_kerumah';

const STEPS = [
  { id: 1, title: 'Jenis Sewa', icon: CarIcon },
  { id: 2, title: 'Lokasi', icon: MapPin },
  { id: 3, title: 'Data Diri', icon: User },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

async function uploadDokumen(userId: string, tipe: 'ktp' | 'sim', file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${tipe}.${ext}`;
  const { error } = await supabase.storage
    .from('dokumen-penyewa')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BookingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { session } = useSession();
  const queryClient = useQueryClient();

  const { carId } = useParams<{ carId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  // Tanggal diterima dari halaman sebelumnya (FleetConfigurator / SearchForm / ArmadaDetailPage / localStorage)
  const [range] = useState<DateRange | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const rawState = (location.state as any)?.range;
      if (rawState?.from && rawState?.to) {
        const fromDate = new Date(rawState.from);
        const toDate = new Date(rawState.to);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          return { from: fromDate, to: toDate };
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      const saved = carId ? localStorage.getItem(`booking_range_${carId}`) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.from && parsed?.to) {
          const fromDate = new Date(parsed.from);
          const toDate = new Date(parsed.to);
          if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
            return { from: fromDate, to: toDate };
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return { from: today, to: today };
  });

  // ── Lokasi & Detail Alamat ──────────────────────────
  const [lokasiPengambilan, setLokasiPengambilan] = useState<LokasiPengambilan>('ambil_ditempat');
  const [kodePos, setKodePos] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kota, setKota] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [alamatJalan, setAlamatJalan] = useState('');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [isSearchingKodepos, setIsSearchingKodepos] = useState(false);
  const [kodeposSuggestions, setKodeposSuggestions] = useState<KodeposResult[]>([]);

  // ── Jenis Sewa & Layanan ─────────────────────────────
  // Jemput ke rumah GRATIS (tanpa charge) — tidak ada state/biaya
  // antar-jemput. Satu-satunya add-on berbayar adalah sopir.
  const [sopirDipilih, setSopirDipilih] = useState(false);

  // ── Data Diri ───────────────────────────────────────
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [noKtp, setNoKtp] = useState('');
  const [noSim, setNoSim] = useState('');
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [simFile, setSimFile] = useState<File | null>(null);
  const [ktpUploadError, setKtpUploadError] = useState<string | null>(null);
  const [simUploadError, setSimUploadError] = useState<string | null>(null);

  // ── State UI ─────────────────────────────────────────
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // ── Queries ───────────────────────────────────────────
  const carQuery = useQuery({
    queryKey: ['car', carId],
    queryFn: () => api.getCar(carId!),
    enabled: !!carId,
  });

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: api.getMyProfile,
  });
  const profile = profileQuery.data;

  // Sync otomatis jenis sewa awal jika mobil hanya dengan_sopir
  useEffect(() => {
    if (carQuery.data?.tipeSewa === 'dengan_sopir') {
      setSopirDipilih(true);
    }
  }, [carQuery.data]);

  // Isi otomatis dari profil
  useEffect(() => {
    if (profile) {
      setNama((prev) => prev || profile.nama || '');
      setNoHp((prev) => prev || profile.noHp || '');
      setNoKtp((prev) => prev || (profile as any).noKtp || '');
      setNoSim((prev) => prev || (profile as any).noSim || '');
      if (profile.alamat && !alamatJalan && !alamatLengkap) {
        setAlamatJalan(profile.alamat);
      }
    }
  }, [profile]);

  // Handler pencarian otomatis Kode Pos
  const handleKodePosChange = async (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 5);
    setKodePos(clean);

    if (clean.length === 5) {
      setIsSearchingKodepos(true);
      try {
        const results = await lookupKodepos(clean);
        setKodeposSuggestions(results);
        if (results.length > 0) {
          const first = results[0];
          setProvinsi(first.provinsi);
          setKota(first.kabupaten);
          setKecamatan(first.kecamatan);
          setKelurahan(first.kelurahan);
        }
      } catch (err) {
        console.error('Kodepos lookup error:', err);
      } finally {
        setIsSearchingKodepos(false);
      }
    } else {
      setKodeposSuggestions([]);
    }
  };

  const handleSelectKodeposSuggestion = (sug: KodeposResult) => {
    setProvinsi(sug.provinsi);
    setKota(sug.kabupaten);
    setKecamatan(sug.kecamatan);
    setKelurahan(sug.kelurahan);
    setKodeposSuggestions([]);
  };

  // Sync otomatis ke string alamatLengkap
  useEffect(() => {
    const parts = [
      alamatJalan.trim(),
      kelurahan ? `Kel. ${kelurahan}` : '',
      kecamatan ? `Kec. ${kecamatan}` : '',
      kota,
      provinsi,
      kodePos ? `Kode Pos ${kodePos}` : '',
    ].filter(Boolean);

    setAlamatLengkap(parts.join(', '));
  }, [alamatJalan, kelurahan, kecamatan, kota, provinsi, kodePos]);

  // Jika bukan sopir → tidak bisa jemput ke rumah
  const car = carQuery.data;
  const isWithDriver = car?.tipeSewa === 'dengan_sopir' || sopirDipilih;

  useEffect(() => {
    if (!isWithDriver && lokasiPengambilan === 'jemput_kerumah') {
      setLokasiPengambilan('ambil_ditempat');
    }
  }, [isWithDriver, lokasiPengambilan]);

  const createBookingMutation = useMutation({
    mutationFn: api.createBooking,
    onSuccess: (booking) => {
      if (carId) {
        queryClient.invalidateQueries({ queryKey: ['car-availability', carId] });
      }
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      navigate(`/booking/${booking.id}/konfirmasi`);
    },
  });

  const isSimRequired = !isWithDriver; // wajib SIM jika lepas kunci

  const hasKtpDoc = Boolean(profile?.dokumenKtpUrl || ktpFile);
  const hasSimDoc = Boolean(profile?.dokumenSimUrl || simFile);

  // ── Step completion ──────────────────────────────────
  const isStep1Done = lokasiPengambilan === 'ambil_ditempat'
    ? true
    : Boolean(alamatLengkap.trim()); // jemput ke rumah wajib alamat

  const isStep2Done = isStep1Done;

  const isStep3Done = Boolean(
    nama.trim() &&
    noHp.trim() &&
    noKtp.trim() &&
    hasKtpDoc &&
    (!isSimRequired || (noSim.trim() && hasSimDoc)) &&
    agreeTerms
  );

  // ── Handlers ──────────────────────────────────────────
  const handleKtpFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setKtpUploadError('Format file KTP harus JPG, PNG, atau PDF');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setKtpUploadError('Ukuran file KTP maksimal 5MB');
      return;
    }
    setKtpUploadError(null);
    setKtpFile(file);
  };

  const handleSimFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setSimUploadError('Format file SIM harus JPG, PNG, atau PDF');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSimUploadError('Ukuran file SIM maksimal 5MB');
      return;
    }
    setSimUploadError(null);
    setSimFile(file);
  };

  // Jemput ke rumah GRATIS — tidak masuk add-on & ringkasan biaya.
  // Satu-satunya add-on berbayar adalah sopir (dihitung di estimasiHarga).
  const addonLain: { jenis: JenisAddon; harga: number }[] = [];

  const estimasi = car ? estimasiHarga(car, range?.from, range?.to, sopirDipilih, addonLain) : null;

  // Validasi form — kemudian tampilkan modal konfirmasi
  const handleOpenConfirmModal = () => {
    setSubmitted(true);
    setFormError(null);

    if (!range?.from || !range?.to) {
      setFormError('Tanggal ambil dan kembali belum dipilih. Silakan kembali ke halaman sebelumnya.');
      return;
    }
    if (lokasiPengambilan === 'jemput_kerumah' && !alamatLengkap.trim()) {
      setFormError('Alamat lengkap wajib diisi untuk layanan jemput ke rumah');
      return;
    }
    if (!nama.trim() || !noHp.trim() || !noKtp.trim()) {
      setFormError('Lengkapi data penyewa (nama, no. HP, no. KTP)');
      return;
    }
    if (!hasKtpDoc) {
      setFormError('Dokumen fisik KTP wajib diunggah untuk verifikasi identitas');
      return;
    }
    if (isSimRequired) {
      if (!noSim.trim()) {
        setFormError('Nomor SIM A wajib diisi untuk sewa lepas kunci (self-drive)');
        return;
      }
      if (!hasSimDoc) {
        setFormError('Dokumen fisik SIM A wajib diunggah untuk sewa lepas kunci (self-drive)');
        return;
      }
    }
    if (!agreeTerms) {
      setFormError('Anda wajib membaca dan menyetujui Syarat & Ketentuan serta Kebijakan Privasi KerenTal Kita terlebih dahulu.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setIsProcessingBooking(true);
    setFormError(null);

    try {
      // Simpan dokumen & data ke profil
      if (session?.user?.id) {
        if (ktpFile) {
          const ktpPath = await uploadDokumen(session.user.id, 'ktp', ktpFile);
          await api.saveDokumenReference('ktp', ktpPath);
        }
        if (simFile) {
          const simPath = await uploadDokumen(session.user.id, 'sim', simFile);
          await api.saveDokumenReference('sim', simPath);
        }

        // Simpan data profil + alamat + KTP/SIM
        await api.updateMyProfile({
          nama: nama.trim(),
          noHp: noHp.trim(),
          noKtp: noKtp.trim(),
          noSim: noSim.trim(),
          alamat: lokasiPengambilan === 'jemput_kerumah' ? alamatLengkap.trim() : undefined,
        });

        queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      }

      const addons: { jenis: JenisAddon; harga?: number }[] = [
        ...(sopirDipilih ? [{ jenis: 'sopir' as const }] : []),
        ...addonLain,
      ];

      const lokasiAmbilStr = lokasiPengambilan === 'ambil_ditempat'
        ? 'Ambil di Tempat (Kantor Rental)'
        : `Jemput ke Rumah: ${alamatLengkap.trim()}`;

      // Jadwal booking sewa mobil: dimulai jam 01.00 dan selesai jam 23.00 WIB.
      // Durasi & harga dihitung dari KALENDER WIB (toWibDayKey) di frontend
      // dan backend, sehingga 1 tanggal yang sama selalu = sewa 1 hari.
      const startD = new Date(range!.from!);
      startD.setHours(1, 0, 0, 0);
      const endD = new Date(range!.to || range!.from!);
      endD.setHours(23, 0, 0, 0);

      await createBookingMutation.mutateAsync({
        carId: carId!,
        tanggalMulai: startD.toISOString(),
        tanggalSelesai: endD.toISOString(),
        lokasiAmbil: lokasiAmbilStr,
        lokasiKembali: lokasiAmbilStr,
        addons,
      });
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Gagal memproses pesanan dan dokumen'
      );
    } finally {
      setIsProcessingBooking(false);
    }
  };

  const inputClass = `w-full rounded-2xl text-sm px-4 py-3.5 transition-all duration-200 focus:outline-none ${
    isDark
      ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:bg-white/10'
      : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20'
  }`;

  const cardClass = `animate-card rounded-3xl p-6 md:p-8 border shadow-xl transition-all duration-300 ${
    isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
  }`;

  const iconBoxClass = `w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
    isDark ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-blue-100 border border-blue-200 text-blue-600'
  }`;

  if (carQuery.isLoading) {
    return (
      <main className="min-h-screen pt-12 sm:pt-20 pb-28 sm:pb-20 px-3 sm:px-6 lg:px-8 transition-colors duration-500 bg-[var(--bg-primary)]">
        <div className="relative max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-32 rounded-full mx-auto" />
            <Skeleton className="h-10 w-64 rounded-2xl mx-auto" />
            <Skeleton className="h-4 w-80 max-w-full rounded mx-auto" />
          </div>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="rounded-3xl p-6 md:p-8 border border-white/10 space-y-4">
                <Skeleton className="h-6 w-48 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              </div>
              <div className="rounded-3xl p-6 md:p-8 border border-white/10 space-y-4">
                <Skeleton className="h-6 w-56 rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24 rounded-3xl p-6 md:p-8 border border-white/10 space-y-3">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
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
      <main className="min-h-screen flex items-center justify-center text-sm transition-colors duration-500 bg-[var(--bg-primary)] pt-28 pb-20">
        Mobil tidak ditemukan.
      </main>
    );
  }

  return (
    <main ref={sectionRef} className="min-h-screen pt-12 sm:pt-20 pb-28 sm:pb-20 px-3 sm:px-6 lg:px-8 transition-colors duration-500 bg-[var(--bg-primary)]">
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-10"
        >
          <p className={`text-xs sm:text-sm font-medium uppercase tracking-wider mb-1 sm:mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Form Pemesanan</p>
          <h1 className={`font-playfair italic text-2xl sm:text-4xl md:text-5xl mb-1.5 sm:mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Lengkapi data di bawah untuk melanjutkan pemesanan</p>
        </motion.div>

        {/* Tanggal Banner (read-only, dari flow sebelumnya) */}
        {range?.from && range?.to && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`mb-4 sm:mb-6 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 border ${
              isDark
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <CalendarIcon size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Tanggal Sewa</p>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {isSameWibDay(range.from, range.to) ? (
                  <>{formatDate(range.from)} <span className="text-[11px] sm:text-xs opacity-75 font-normal">(Jam 01.00 – 23.00 WIB)</span></>
                ) : (
                  <>{formatDate(range.from)} — {formatDate(range.to)}</>
                )}
              </p>
            </div>
            <div className={`ml-auto text-right ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <p className="text-[10px] sm:text-xs font-semibold">Durasi</p>
              <p className="text-xs sm:text-sm font-bold">
                {(() => {
                  // Patokan kalender WIB — SAMA dengan estimasiHarga &
                  // hitungan backend agar angka hari tidak pernah beda.
                  const d = Math.max(1, Math.round((toWibDayKey(new Date(range.to)) - toWibDayKey(new Date(range.from))) / (1000 * 60 * 60 * 24)) + 1);
                  return `${d} hari`;
                })()}
              </p>
            </div>
          </motion.div>
        )}

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="animate-card flex items-center justify-center mb-4 sm:mb-8 overflow-x-auto pb-1"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted =
                step.id === 1 ? isStep1Done :
                step.id === 2 ? isStep2Done :
                isStep3Done;
              const isActive = !isCompleted && (
                step.id === 1 ||
                (step.id === 2 && isStep1Done) ||
                (step.id === 3 && isStep2Done)
              );

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : isActive
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : isDark
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white stroke-[2.5]" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : isDark ? 'text-white/40' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium hidden sm:block ${
                      isCompleted
                        ? 'text-emerald-500 font-semibold'
                        : isActive
                        ? isDark ? 'text-blue-400 font-semibold' : 'text-blue-600 font-semibold'
                        : isDark ? 'text-white/40' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 mx-2 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isDark ? 'bg-white/10' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Form Content */}
          <div className="lg:col-span-3 flex flex-col gap-6">

            {/* Step 1: Jenis Sewa & Layanan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cardClass}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={iconBoxClass}>
                  <CarIcon className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-slate-600'}`} />
                </div>
                <div>
                  <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Jenis Sewa</h2>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Pilih mode sewa kendaraan Anda</p>
                </div>
              </div>

              {/* Selection Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Lepas Kunci */}
                {(car.tipeSewa === 'lepas_kunci' || car.tipeSewa === 'keduanya') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSopirDipilih(false);
                      if (lokasiPengambilan === 'jemput_kerumah') {
                        setLokasiPengambilan('ambil_ditempat');
                      }
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      !sopirDipilih
                        ? isDark
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-blue-500 bg-blue-50 text-slate-900'
                        : isDark
                          ? 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20'
                          : 'border-slate-200 bg-white/50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      !sopirDipilih ? 'bg-blue-500 text-white' : isDark ? 'bg-white/10' : 'bg-slate-100'
                    }`}>
                      <CarIcon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Lepas Kunci</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Self-drive (Wajib SIM A)</p>
                    </div>
                    {!sopirDipilih && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <Check size={12} className="text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                )}

                {/* Dengan Supir */}
                {(car.tipeSewa === 'dengan_sopir' || car.tipeSewa === 'keduanya') && (
                  <button
                    type="button"
                    onClick={() => setSopirDipilih(true)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      sopirDipilih
                        ? isDark
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-blue-500 bg-blue-50 text-slate-900'
                        : isDark
                          ? 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20'
                          : 'border-slate-200 bg-white/50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      sopirDipilih ? 'bg-blue-500 text-white' : isDark ? 'bg-white/10' : 'bg-slate-100'
                    }`}>
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Dengan Supir</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        {car.hargaSopirPerHari ? `+${formatRupiah(Number(car.hargaSopirPerHari))}/hari` : 'Sudah termasuk'}
                      </p>
                    </div>
                    {sopirDipilih && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <Check size={12} className="text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                )}
              </div>

              {/* Informasi: Jemput ke Rumah GRATIS tanpa charge */}
              {lokasiPengambilan === 'jemput_kerumah' && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 mt-3 ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <Truck size={18} className="shrink-0 mt-0.5 text-emerald-500" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-bold mb-0.5">Layanan Jemput ke Rumah — GRATIS</p>
                    <p>
                      Karena Anda memilih <strong>Jemput ke Rumah</strong>, unit diantar ke alamat Anda{' '}
                      <strong>tanpa biaya tambahan</strong> dan tidak dihitung dalam ringkasan biaya.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Step 2: Lokasi Pengambilan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cardClass}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={iconBoxClass}>
                  <MapPin className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-slate-600'}`} />
                </div>
                <div>
                  <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Lokasi Pengambilan</h2>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Pilih cara pengambilan kendaraan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Ambil di Tempat */}
                <button
                  type="button"
                  onClick={() => {
                    setLokasiPengambilan('ambil_ditempat');
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    lokasiPengambilan === 'ambil_ditempat'
                      ? isDark
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-blue-500 bg-blue-50 text-slate-900'
                      : isDark
                        ? 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.04]'
                        : 'border-slate-200 bg-white/50 text-slate-700 hover:border-slate-300 hover:bg-white/80'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    lokasiPengambilan === 'ambil_ditempat'
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-white/10' : 'bg-slate-100'
                  }`}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Ambil di Tempat</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Datang langsung ke kantor rental</p>
                  </div>
                  {lokasiPengambilan === 'ambil_ditempat' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Jemput ke Rumah */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isWithDriver && car.tipeSewa !== 'dengan_sopir') {
                      return;
                    }
                    setLokasiPengambilan('jemput_kerumah');
                  }}
                  disabled={car.tipeSewa === 'lepas_kunci'}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    lokasiPengambilan === 'jemput_kerumah'
                      ? isDark
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-blue-500 bg-blue-50 text-slate-900'
                      : car.tipeSewa === 'lepas_kunci'
                      ? isDark
                        ? 'border-white/5 bg-white/[0.01] text-white/30 cursor-not-allowed opacity-50'
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-50'
                      : isDark
                        ? 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.04]'
                        : 'border-slate-200 bg-white/50 text-slate-700 hover:border-slate-300 hover:bg-white/80'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    lokasiPengambilan === 'jemput_kerumah'
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-white/10' : 'bg-slate-100'
                  }`}>
                    <Home size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Jemput ke Rumah</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {car.tipeSewa === 'lepas_kunci'
                        ? 'Tidak tersedia — lepas kunci'
                        : 'Khusus sewa dengan sopir'}
                    </p>
                  </div>
                  {lokasiPengambilan === 'jemput_kerumah' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>

              {/* Info: Jemput ke Rumah butuh sopir */}
              {car.tipeSewa === 'keduanya' && !isWithDriver && lokasiPengambilan !== 'jemput_kerumah' && (
                <p className={`text-xs p-3 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  💡 Untuk memilih Jemput ke Rumah, aktifkan <strong>Sewa dengan Sopir</strong> pada pilihan Jenis Sewa terlebih dahulu.
                </p>
              )}

              {/* Form Alamat (hanya muncul jika Jemput ke Rumah) */}
              <AnimatePresence>
                {lokasiPengambilan === 'jemput_kerumah' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 border-t border-dashed border-white/10 mt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <MapPin size={16} className="text-blue-500" />
                          Detail Lokasi Penjemputan <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                          Isi Kode Pos untuk auto-fill otomatis
                        </span>
                      </div>

                      {/* 1. KODE POS (Berada di Paling Atas) */}
                      <div>
                        <label className={`text-xs mb-1.5 block font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                          Kode Pos (5 Digit) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={kodePos}
                            onChange={(e) => handleKodePosChange(e.target.value)}
                            placeholder="Contoh: 50123"
                            maxLength={5}
                            className={`${inputClass} font-mono font-semibold tracking-wider ${
                              submitted && lokasiPengambilan === 'jemput_kerumah' && !kodePos.trim() ? '!border-red-500' : ''
                            }`}
                          />
                          {isSearchingKodepos && (
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-blue-500">
                              <Loader2 size={15} className="animate-spin" />
                              <span className="text-[11px] font-medium hidden sm:inline">Mencari...</span>
                            </div>
                          )}
                        </div>

                        {/* Dropdown / Suggestions jika ada beberapa kelurahan */}
                        {kodeposSuggestions.length > 1 && (
                          <div className={`mt-2 p-2.5 rounded-xl border space-y-1.5 ${
                            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <p className={`text-[11px] font-medium ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                              Pilih Kelurahan/Kecamatan yang sesuai:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {kodeposSuggestions.map((sug, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectKodeposSuggestion(sug)}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                    kelurahan === sug.kelurahan
                                      ? 'bg-blue-500 text-white border-blue-500 font-semibold'
                                      : isDark
                                      ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white/80'
                                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                                  }`}
                                >
                                  Kel. {sug.kelurahan}, {sug.kecamatan}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. PROVINSI & KOTA/KABUPATEN */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs mb-1.5 block font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                            Provinsi <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={provinsi}
                            onChange={(e) => setProvinsi(e.target.value)}
                            placeholder="Otomatis dari kode pos / ketik manual"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={`text-xs mb-1.5 block font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                            Kabupaten / Kota <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={kota}
                            onChange={(e) => setKota(e.target.value)}
                            placeholder="Otomatis dari kode pos / ketik manual"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* 3. KECAMATAN & KELURAHAN */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs mb-1.5 block font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                            Kecamatan
                          </label>
                          <input
                            type="text"
                            value={kecamatan}
                            onChange={(e) => setKecamatan(e.target.value)}
                            placeholder="Kecamatan"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={`text-xs mb-1.5 block font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                            Kelurahan / Desa
                          </label>
                          <input
                            type="text"
                            value={kelurahan}
                            onChange={(e) => setKelurahan(e.target.value)}
                            placeholder="Kelurahan/Desa"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* 4. DETAIL ALAMAT JALAN */}
                      <div>
                        <label className={`text-xs mb-1.5 block font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                          Alamat Jalan & No. Rumah / RT RW / Patokan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={alamatJalan}
                          onChange={(e) => setAlamatJalan(e.target.value)}
                          rows={2}
                          placeholder="Jl. Merdeka No. 123, RT 02/RW 05, patokan samping masjid..."
                          className={`${inputClass} resize-none ${submitted && lokasiPengambilan === 'jemput_kerumah' && !alamatJalan.trim() ? '!border-red-500' : ''}`}
                        />
                      </div>

                      {/* Preview Ringkasan Alamat */}
                      {alamatLengkap && (
                        <div className={`p-3 rounded-xl border text-xs ${
                          isDark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <p className="font-semibold mb-0.5 text-[11px] text-blue-500">Ringkasan Alamat Penjemputan:</p>
                          <p className="leading-relaxed">{alamatLengkap}</p>
                        </div>
                      )}

                      {submitted && lokasiPengambilan === 'jemput_kerumah' && !alamatLengkap.trim() && (
                        <p className="text-xs text-red-500 mt-1 font-medium">Alamat penjemputan belum lengkap</p>
                      )}

                      {profile?.alamat && !alamatJalan && (
                        <button
                          type="button"
                          onClick={() => setAlamatJalan(profile.alamat || '')}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            isDark
                              ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Gunakan alamat dari profil: {profile.alamat.slice(0, 40)}...
                        </button>
                      )}
                      <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                        <ShieldCheck size={12} className="text-emerald-500" />
                        Alamat lengkap ini akan disimpan otomatis ke profil Anda
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Step 3: Data Penyewa & Dokumen */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={cardClass}
            >
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className={iconBoxClass}>
                    <User className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Data Penyewa & Dokumen</h2>
                    <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Verifikasi identitas dan dokumen persyaratan</p>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {!profile?.dokumenKtpUrl || (isSimRequired && !profile?.dokumenSimUrl) ? (
                <div className={`p-4 rounded-xl border mb-5 flex items-start gap-3 ${
                  isDark
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <Sparkles size={18} className="shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-semibold mb-0.5">Rekomendasi Hemat Waktu</p>
                    <p>
                      Unggah KTP & SIM Anda di{' '}
                      <Link to="/akun/profil" target="_blank" className="underline font-semibold hover:opacity-80 inline-flex items-center gap-0.5">
                        Halaman Profil <ExternalLink size={11} />
                      </Link>{' '}
                      agar tidak perlu mengunggah ulang di pemesanan berikutnya.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-xl border mb-5 flex items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
                    <div className="text-xs">
                      <p className="font-semibold">Data Diri & Dokumen Terhubung dari Profil</p>
                      <p className="opacity-80">Identitas KTP & SIM Anda telah terisi secara otomatis.</p>
                    </div>
                  </div>
                  <Link
                    to="/akun/profil"
                    target="_blank"
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all shrink-0 flex items-center gap-1 ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    Edit Profil <ExternalLink size={11} />
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Sesuai KTP"
                    className={`${inputClass} ${submitted && !nama.trim() ? '!border-red-500' : ''}`}
                  />
                  {submitted && !nama.trim() && (
                    <p className="text-xs text-red-500 mt-1 font-medium">Nama lengkap wajib diisi</p>
                  )}
                </div>
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    No. WhatsApp / HP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="081234567890"
                    className={`${inputClass} ${submitted && !noHp.trim() ? '!border-red-500' : ''}`}
                  />
                  {submitted && !noHp.trim() && (
                    <p className="text-xs text-red-500 mt-1 font-medium">No. WhatsApp/HP wajib diisi</p>
                  )}
                </div>
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    No. KTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={noKtp}
                    onChange={(e) => setNoKtp(e.target.value)}
                    placeholder="16 digit NIK KTP"
                    maxLength={16}
                    className={`${inputClass} ${submitted && !noKtp.trim() ? '!border-red-500' : ''}`}
                  />
                  {submitted && !noKtp.trim() && (
                    <p className="text-xs text-red-500 mt-1 font-medium">Nomor KTP wajib diisi</p>
                  )}
                </div>
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    No. SIM A{' '}
                    {isSimRequired ? (
                      <span className="text-red-500">* (Wajib Lepas Kunci)</span>
                    ) : (
                      <span className="text-xs opacity-60 font-normal">(Opsional — Sewa dengan Sopir)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={noSim}
                    onChange={(e) => setNoSim(e.target.value)}
                    placeholder={isSimRequired ? 'Nomor SIM A pengemudi' : 'Opsional jika dengan sopir'}
                    className={`${inputClass} ${submitted && isSimRequired && !noSim.trim() ? '!border-red-500' : ''}`}
                  />
                  {submitted && isSimRequired && !noSim.trim() && (
                    <p className="text-xs text-red-500 mt-1 font-medium">Nomor SIM wajib diisi untuk sewa lepas kunci</p>
                  )}
                </div>
              </div>

              {/* Upload Dokumen */}
              <div className="pt-4 border-t border-dashed border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                    Unggah Dokumen Identitas
                  </h3>
                  <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                    Format: JPG, PNG, atau PDF (Maks 5MB)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* KTP */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Dokumen KTP <span className="text-red-500">*</span>
                      </span>
                      {profile?.dokumenKtpUrl && !ktpFile && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <FileCheck size={11} /> Tersimpan di Profil
                        </span>
                      )}
                    </div>

                    {profile?.dokumenKtpUrl && !ktpFile ? (
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                          {profile.dokumenKtpUrl.split('/').pop()}
                        </p>
                        <label className={`text-[11px] cursor-pointer px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                          isDark
                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          Ganti
                          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleKtpFileChange} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleKtpFileChange}
                          className="text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20 cursor-pointer"
                        />
                        {ktpFile && (
                          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                            <Check size={12} /> {ktpFile.name} (akan disimpan ke profil)
                          </p>
                        )}
                      </div>
                    )}

                    {ktpUploadError && (
                      <p className="text-[11px] text-red-400 mt-1">{ktpUploadError}</p>
                    )}
                    {submitted && !hasKtpDoc && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">File KTP wajib diunggah</p>
                    )}
                  </div>

                  {/* SIM */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Dokumen SIM A{' '}
                        {isSimRequired ? (
                          <span className="text-red-500">* (Lepas Kunci)</span>
                        ) : (
                          <span className="text-[10px] opacity-60 font-normal">(Opsional)</span>
                        )}
                      </span>
                      {profile?.dokumenSimUrl && !simFile && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <FileCheck size={11} /> Tersimpan di Profil
                        </span>
                      )}
                    </div>

                    {profile?.dokumenSimUrl && !simFile ? (
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                          {profile.dokumenSimUrl.split('/').pop()}
                        </p>
                        <label className={`text-[11px] cursor-pointer px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                          isDark
                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          Ganti
                          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleSimFileChange} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleSimFileChange}
                          className="text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20 cursor-pointer"
                        />
                        {simFile && (
                          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                            <Check size={12} /> {simFile.name} (akan disimpan ke profil)
                          </p>
                        )}
                      </div>
                    )}

                    {simUploadError && (
                      <p className="text-[11px] text-red-400 mt-1">{simUploadError}</p>
                    )}
                    {submitted && isSimRequired && !hasSimDoc && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">File SIM A wajib diunggah untuk lepas kunci</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Checkbox Persetujuan Syarat & Ketentuan & Kebijakan Privasi */}
              <div className={`mt-5 pt-4 border-t border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  agreeTerms
                    ? isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
                    : submitted && !agreeTerms
                    ? 'bg-red-500/10 border-red-500/40'
                    : isDark ? 'bg-white/5 border-white/10 hover:bg-white/[0.08]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="text-xs leading-relaxed">
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Saya telah membaca, memahami, dan menyetujui{' '}
                    </span>
                    <Link
                      to="/syarat"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 font-bold underline hover:opacity-80 inline-flex items-center gap-0.5"
                    >
                      Syarat & Ketentuan <ExternalLink size={10} />
                    </Link>
                    <span className={isDark ? 'text-white/80' : 'text-slate-700'}> serta </span>
                    <Link
                      to="/privasi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 font-bold underline hover:opacity-80 inline-flex items-center gap-0.5"
                    >
                      Kebijakan Privasi <ExternalLink size={10} />
                    </Link>
                    <span className={isDark ? 'text-white/80' : 'text-slate-700'}>
                      {' '}KerenTal Kita untuk pemesanan ini. <span className="text-red-500 font-bold">*</span>
                    </span>
                  </div>
                </label>
                {submitted && !agreeTerms && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 ml-1">
                    * Anda harus mencentang persetujuan Syarat & Privasi sebelum melanjutkan.
                  </p>
                )}
              </div>

              <p className={`text-[11px] mt-4 flex items-center gap-1.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                Data dan dokumen Anda tersimpan aman dan terenkripsi, serta dapat dikelola di menu Profil.
              </p>
            </motion.div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`lg:sticky lg:top-24 rounded-3xl p-6 md:p-8 border shadow-2xl transition-all duration-300 ${
                isDark ? 'sa-glass-dark text-white' : 'sa-glass-light text-slate-900'
              }`}
            >
              {/* Car Image Banner 16:9 Aspect Ratio */}
              {car.images && car.images.length > 0 ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 border border-white/10 shadow-lg group">
                  <img
                    src={car.images[0].url}
                    alt={car.nama}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-500 text-white mb-1 inline-block shadow-sm">
                        {car.kategori}
                      </span>
                      <h3 className="font-extrabold text-white text-base leading-snug">{car.nama}</h3>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`flex items-center gap-4 pb-4 mb-4 ${
                  isDark ? 'border-b border-white/10' : 'border-b border-slate-200'
                }`}>
                  <div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{car.kategori}</p>
                  </div>
                </div>
              )}

              {/* Tanggal di sidebar */}
              {range?.from && range?.to && (
                <div className={`mb-5 p-3.5 rounded-2xl text-xs border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <p className="font-bold mb-1 uppercase tracking-wider text-[10px]">Periode Sewa Terpilih</p>
                  <p className="font-semibold text-sm">
                    {formatRentangTanggal(range.from, range.to, (d) =>
                      d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                    )}
                  </p>
                </div>
              )}

              {/* Price Summary */}
              <h2 className={`font-bold text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <CreditCard className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                Ringkasan Biaya
              </h2>

              {estimasi && (
                <div className="space-y-3 text-sm">
                  <div className={`flex justify-between ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                    <span>
                      {formatRupiah(Number(car.hargaPerHari))} × {estimasi.durasiHari} hari
                    </span>
                    <span className="font-semibold">{formatRupiah(estimasi.hargaDasar)}</span>
                  </div>
                  {estimasi.addons.map((addon) => (
                    <div key={addon.jenis} className={`flex justify-between ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                      <span>{addon.label}</span>
                      <span className="font-semibold">{formatRupiah(addon.harga)}</span>
                    </div>
                  ))}
                  <div className={`border-t pt-3 mt-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className={`flex justify-between items-center font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span className="text-base">Total Bayar</span>
                      <span className="text-xl font-extrabold text-orange-500">
                        {formatRupiah(estimasi.totalHarga)}
                      </span>
                    </div>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                    *Sudah termasuk biaya sewa kendaraan & layanan terpilih
                  </p>
                </div>
              )}

              {/* Errors */}
              {formError && (
                <div className={`mt-4 p-4 rounded-xl ${
                  isDark
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{formError}</p>
                </div>
              )}

              {createBookingMutation.isError && (
                <div className={`mt-4 p-4 rounded-xl ${
                  isDark
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {createBookingMutation.error instanceof ApiError
                      ? createBookingMutation.error.message
                      : 'Gagal membuat booking, coba lagi'}
                  </p>
                </div>
              )}

              {/* Submit Button — Glassmorphism High-Contrast CTA */}
              <motion.button
                id="konfirmasi-pesanan-btn"
                onClick={handleOpenConfirmModal}
                disabled={isProcessingBooking || createBookingMutation.isPending}
                whileHover={{ scale: (isProcessingBooking || createBookingMutation.isPending) ? 1 : 1.01 }}
                whileTap={{ scale: (isProcessingBooking || createBookingMutation.isPending) ? 1 : 0.99 }}
                className={`w-full mt-6 relative group overflow-hidden rounded-2xl py-4 font-bold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-white text-neutral-950 hover:bg-neutral-100 shadow-white/10'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-black/20'
                }`}
              >
                {/* Glassmorphism shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2 font-bold">
                  {isProcessingBooking || createBookingMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memproses & Menyimpan Dokumen...
                    </>
                  ) : (
                    <>
                      Konfirmasi Pesanan
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Floating Mobile Bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 p-3.5 px-5 shadow-2xl flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] text-slate-500 dark:text-white/40">Total Estimasi</p>
          <p className="text-lg font-bold text-orange-500">
            {estimasi ? formatRupiah(estimasi.totalHarga) : '-'}
          </p>
        </div>
        <button
          onClick={handleOpenConfirmModal}
          disabled={isProcessingBooking || createBookingMutation.isPending}
          className={`py-3.5 px-6 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-60 ${
            isDark
              ? 'bg-white text-neutral-950 hover:bg-neutral-100'
              : 'bg-neutral-900 text-white hover:bg-neutral-800'
          }`}
        >
          {isProcessingBooking || createBookingMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Konfirmasi Pesanan</span>
          )}
        </button>
      </div>

      {/* ── Confirmation Modal (Glassmorphism) ── */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${
                isDark
                  ? 'bg-neutral-900/80 backdrop-blur-2xl border border-white/10'
                  : 'bg-white/80 backdrop-blur-2xl border border-white/60'
              }`}
            >
              {/* Modal Header */}
              <div className={`px-6 pt-6 pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200/80'}`}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Konfirmasi Pesanan</h2>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Periksa kembali detail pemesanan Anda</p>
              </div>

              {/* Booking Detail */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <CarIcon size={16} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Kendaraan</p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <CalendarIcon size={16} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tanggal</p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {range?.from && range?.to
                        ? formatRentangTanggal(range.from, range.to, (d) =>
                            d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                          )
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <MapPin size={16} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Lokasi</p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {lokasiPengambilan === 'ambil_ditempat'
                        ? 'Ambil di Tempat (Kantor Rental)'
                        : `Jemput ke Rumah`}
                    </p>
                    {lokasiPengambilan === 'jemput_kerumah' && (
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{alamatLengkap}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <User size={16} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Penyewa</p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{nama}</p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{noHp} • KTP: {noKtp}</p>
                  </div>
                </div>

                {estimasi && (
                  <div className={`flex items-center justify-between py-3 px-4 rounded-xl mt-2 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Estimasi</p>
                    <p className={`text-base font-bold text-orange-500`}>{formatRupiah(estimasi.totalHarga)}</p>
                  </div>
                )}
              </div>

              {/* Reminders */}
              <div className={`mx-6 mb-5 p-4 rounded-2xl border ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    Himbauan Penting
                  </p>
                </div>
                <ul className={`text-xs space-y-1.5 ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>
                  <li className="flex items-start gap-1.5">
                    <Clock size={11} className="shrink-0 mt-0.5" />
                    <span><strong>Jam operasional:</strong> Pengambilan & pengembalian kendaraan <strong>Jam 01.00 – 23.00 WIB</strong>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ShieldCheck size={11} className="shrink-0 mt-0.5" />
                    <span><strong>Dokumen fisik:</strong> Siapkan KTP asli{isSimRequired ? ' dan SIM A asli' : ''} untuk diserahkan saat pengambilan unit.</span>
                  </li>
                  {isSimRequired && (
                    <li className="flex items-start gap-1.5">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      <span><strong>Lepas kunci:</strong> SIM A wajib berlaku. Pastikan SIM tidak kedaluwarsa.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-1.5">
                    <FileCheck size={11} className="shrink-0 mt-0.5 text-emerald-500" />
                    <span><strong>Persetujuan Aturan:</strong> Anda telah menyetujui <Link to="/syarat" target="_blank" className="underline font-bold text-blue-500">Syarat & Ketentuan</Link> dan <Link to="/privasi" target="_blank" className="underline font-bold text-emerald-500">Kebijakan Privasi</Link>.</span>
                  </li>
                </ul>
              </div>

              {/* Modal Actions */}
              <div className={`px-6 pb-6 flex gap-3`}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm border transition-all ${
                    isDark
                      ? 'border-white/15 text-white/70 hover:bg-white/5'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Kembali Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessingBooking || !agreeTerms}
                  className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-white text-neutral-950 hover:bg-neutral-100'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {isProcessingBooking ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Ya, Lanjutkan Booking'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
