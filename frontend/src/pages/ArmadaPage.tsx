import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  CheckCircle,
  Users,
  Key,
  ArrowRight,
  X,
  SearchX,
  AlertCircle,
  Car as CarIcon,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type Car, type Kategori, type Transmisi, type TipeSewa } from '../lib/api';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';
import { SkeletonCarGrid } from '../components/Skeleton';

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

const TIPE_SEWA_LABEL: Record<TipeSewa, string> = {
  lepas_kunci: 'Lepas Kunci',
  dengan_sopir: 'Dengan Sopir',
  keduanya: 'Lepas Kunci / Dengan Sopir',
};

// Label pendek untuk chip spesifikasi di kartu (ruang terbatas)
const TIPE_SEWA_CHIP: Record<TipeSewa, string> = {
  lepas_kunci: 'Lepas Kunci',
  dengan_sopir: 'Dengan Sopir',
  keduanya: 'Fleksibel',
};

function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}


/**
 * Kartu mobil — liquid glass + glassmorphism.
 * Lapisan kaca transparan berlapis, specular shimmer pada hover,
 * tanpa border putih solid.
 */
function CarCard({ car, isDark }: { car: Car; isDark: boolean }) {
  const thumbnail = car.images[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.012 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-3xl overflow-hidden flex flex-col"
      style={{
        /* Liquid Glass outer shell — lebih pekat */
        background: isDark
          ? 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.70) 50%, rgba(255,255,255,0.84) 100%)',
        backdropFilter: 'blur(32px) saturate(200%) contrast(108%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%) contrast(108%)',
        boxShadow: isDark
          ? '0 12px 40px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.03)',
        border: isDark
          ? '1px solid rgba(255,255,255,0.13)'
          : '1px solid rgba(200,210,230,0.35)',
      }}
    >
      {/* Specular shimmer sweep on hover — liquid glass effect */}
      <div className="pointer-events-none absolute -inset-full top-0 z-30 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[300%] transition-transform duration-[900ms] ease-in-out" />

      <Link to={`/armada/${car.id}`} className="flex flex-col flex-1">
        {/* ── Media Frame 16:9 ── */}
        <div className="relative w-full aspect-video overflow-hidden rounded-t-3xl">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={car.nama}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #18181b 0%, #09090b 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
                  boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <CarIcon size={26} strokeWidth={1.3} className={isDark ? 'text-white/25' : 'text-slate-400'} />
              </div>
              <span className={`text-xs font-medium mt-2.5 tracking-wide ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                Belum ada foto
              </span>
            </div>
          )}

          {/* Bottom vignette on image — hanya di dark mode */}
          {isDark && <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-black/10 to-transparent" />}

          {/* Top-left: kategori badge — frosted pill */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {KATEGORI_LABEL[car.kategori] ?? car.kategori}
            </span>
          </div>

          {/* Top-right: instansi badge */}
          {car.instansi && (
            <div className="absolute top-3 right-3 z-10">
              <div
                className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                <span className="max-w-[96px] truncate">{car.instansi.namaInstansi}</span>
                {car.instansi.status === 'aktif' && (
                  <CheckCircle size={10} className="text-emerald-400 shrink-0" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Info Panel — glass pekat ── */}
        <div
          className="flex flex-col flex-1 p-4 sm:p-5 gap-3"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(20,20,28,0.82) 0%, rgba(15,15,22,0.88) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(245,247,252,0.95) 100%)',
            borderTop: isDark
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid rgba(200,210,230,0.3)',
          }}
        >
          {/* Spec chips */}
          <div className="flex flex-wrap gap-1.5">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.07)',
                color: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
              }}
            >
              {car.transmisi === 'manual' ? 'Manual' : 'Matic'}
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
              style={{
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.07)',
                color: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
              }}
            >
              <Users size={11} />
              {car.kapasitasKursi} Kursi
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
              style={{
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.07)',
                color: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
              }}
            >
              <Key size={11} />
              {TIPE_SEWA_CHIP[car.tipeSewa]}
            </span>
          </div>

          {/* Car name */}
          <h3 className={`font-bold text-base sm:text-lg leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {car.nama}
          </h3>

          {/* Divider — thin glass line */}
          <div
            className="w-full h-px"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)',
            }}
          />

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <div>
              <p className={`text-[10px] font-medium mb-0.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-400'}`}>
                Harga Sewa
              </p>
              <div className="flex items-baseline gap-1">
                <span className={`font-extrabold text-lg sm:text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatRupiah(car.hargaPerHari)}
                </span>
                <span className={`text-xs font-normal ${isDark ? 'text-white/45' : 'text-slate-400'}`}>/hari</span>
              </div>
            </div>

            {/* CTA button:
                Dark: default=hitam pekat+putih, hover=putih+hitam
                Light: default=putih+hitam, hover=hitam pekat+putih */}
            <span
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-300 active:scale-95 ${
                isDark
                  ? 'bg-[rgba(10,10,15,0.90)] text-white border border-white/15 group-hover:bg-white group-hover:text-slate-950 group-hover:border-transparent'
                  : 'bg-white text-slate-950 border border-black/10 group-hover:bg-slate-950 group-hover:text-white group-hover:border-transparent'
              }`}
              style={{
                boxShadow: isDark
                  ? '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)'
                  : '0 4px 14px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)',
              }}
            >
              Sewa Sekarang
              <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Field select yang dibungkus ikon, gaya glass segmented control */
function FilterSelect({
  icon,
  value,
  onChange,
  isDark,
  children,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${
          isDark ? 'text-white/40' : 'text-slate-400'
        }`}
      >
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-sm rounded-full pl-9 pr-4 py-2.5 transition-all duration-200 appearance-none cursor-pointer ${
          isDark
            ? 'bg-white/[0.08] border border-white/15 text-white [&>option]:bg-[#12121c]'
            : 'bg-white/85 border border-white/70 text-slate-800 shadow-sm [&>option]:bg-white'
        }`}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {children}
      </select>
    </div>
  );
}

export default function ArmadaPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Sinkron dengan URL search params — sebelumnya filter halaman ini TIDAK
  // BISA dibagikan/di-bookmark sama sekali (state cuma lokal). Ini juga
  // memperbaiki link footer "Dengan Sopir" (/armada?tipeSewa=dengan_sopir)
  // yang sebelumnya diam saja karena parameter itu tidak pernah dibaca.
  // Divalidasi terhadap daftar nilai asli supaya URL yang di-otak-atik
  // manual tidak mengirim nilai sembarangan ke API (backend akan menolak
  // SELURUH request kalau salah satu query param tidak valid).
  const [searchParams] = useSearchParams();
  const urlKategori = searchParams.get('kategori');
  const urlTipeSewa = searchParams.get('tipeSewa');
  const initialKategori = urlKategori && urlKategori in KATEGORI_LABEL ? (urlKategori as Kategori) : '';
  const initialTipeSewa = urlTipeSewa && urlTipeSewa in TIPE_SEWA_LABEL ? (urlTipeSewa as TipeSewa) : '';

  const [kategori, setKategori] = useState<Kategori | ''>(initialKategori);
  const [transmisi, setTransmisi] = useState<Transmisi | ''>('');
  const [tipeSewa, setTipeSewa] = useState<TipeSewa | ''>(initialTipeSewa);
  const [cari, setCari] = useState('');
  const [sort, setSort] = useState<'harga_asc' | 'harga_desc' | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: cars, isLoading, isError, error } = useQuery({
    queryKey: ['cars', { kategori, transmisi, tipeSewa, cari, sort }],
    queryFn: () =>
      api.listCars({
        ...(kategori && { kategori }),
        ...(transmisi && { transmisi }),
        ...(tipeSewa && { tipeSewa }),
        ...(cari && { cari }),
        ...(sort && { sort }),
      }),
  });

  const headerRef = useScrollReveal<HTMLDivElement>({ y: 16, stagger: 0.08 });
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.06, dependencies: [cars] });

  // Ringkasan filter aktif -> ditampilkan sebagai chip yang bisa dihapus satu per satu
  const activeFilters = useMemo(
    () =>
      [
        kategori && { key: 'kategori', label: KATEGORI_LABEL[kategori], clear: () => setKategori('') },
        transmisi && {
          key: 'transmisi',
          label: transmisi === 'manual' ? 'Manual' : 'Matic',
          clear: () => setTransmisi(''),
        },
        tipeSewa && { key: 'tipeSewa', label: TIPE_SEWA_LABEL[tipeSewa], clear: () => setTipeSewa('') },
        sort && {
          key: 'sort',
          label: sort === 'harga_asc' ? 'Harga Termurah' : 'Harga Termahal',
          clear: () => setSort(''),
        },
      ].filter(Boolean) as { key: string; label: string; clear: () => void }[],
    [kategori, transmisi, tipeSewa, sort]
  );

  const resetFilters = () => {
    setKategori('');
    setTransmisi('');
    setTipeSewa('');
    setSort('');
    setCari('');
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef}>
          <div className="mb-8">
            <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Katalog
            </p>
            <h1 className={`font-playfair italic text-4xl sm:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Armada Kami
            </h1>
          </div>

          {/* Panel pencarian & filter — kaca melayang */}
          <div
            className={`rounded-3xl p-4 sm:p-5 mb-8 backdrop-blur-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/45 border-white/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}
                />
                <input
                  type="text"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari nama mobil..."
                  className={`w-full rounded-full pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:scale-[1.01] ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
                      : 'bg-white/70 border border-white/80 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                  }`}
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`sm:hidden w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
                  isDark ? 'bg-white/[0.05] border border-white/10 text-white/70' : 'bg-white/70 border border-white/80 text-slate-600'
                } ${showFilters ? (isDark ? '!bg-white/15' : '!bg-white') : ''}`}
                aria-label="Filter"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            {/* Filter bar */}
            <div className={`flex-wrap gap-2.5 mt-3.5 ${showFilters ? 'flex' : 'hidden'} sm:flex`}>
              <FilterSelect icon={<SlidersHorizontal size={13} />} value={kategori} onChange={(v) => setKategori(v as Kategori | '')} isDark={isDark}>
                <option value="">Semua Kategori</option>
                {Object.entries(KATEGORI_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect icon={<SlidersHorizontal size={13} />} value={transmisi} onChange={(v) => setTransmisi(v as Transmisi | '')} isDark={isDark}>
                <option value="">Semua Transmisi</option>
                <option value="manual">Manual</option>
                <option value="matic">Matic</option>
              </FilterSelect>

              <FilterSelect icon={<Key size={13} />} value={tipeSewa} onChange={(v) => setTipeSewa(v as TipeSewa | '')} isDark={isDark}>
                <option value="">Semua Tipe Sewa</option>
                <option value="lepas_kunci">Lepas Kunci</option>
                <option value="dengan_sopir">Dengan Sopir</option>
              </FilterSelect>

              <FilterSelect icon={<ArrowRight size={13} className="-rotate-45" />} value={sort} onChange={(v) => setSort(v as 'harga_asc' | 'harga_desc' | '')} isDark={isDark}>
                <option value="">Urutkan</option>
                <option value="harga_asc">Harga Termurah</option>
                <option value="harga_desc">Harga Termahal</option>
              </FilterSelect>
            </div>

            {/* Chip filter aktif */}
            <AnimatePresence>
              {activeFilters.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center gap-2 mt-3.5 overflow-hidden"
                >
                  {activeFilters.map((f) => (
                    <button
                      key={f.key}
                      onClick={f.clear}
                      className={`inline-flex items-center gap-1.5 text-xs pl-3 pr-2 py-1.5 rounded-full transition-colors ${
                        isDark
                          ? 'bg-white/10 text-white/80 hover:bg-white/15'
                          : 'bg-slate-900/[0.06] text-slate-700 hover:bg-slate-900/10'
                      }`}
                    >
                      {f.label}
                      <X size={12} />
                    </button>
                  ))}
                  <button
                    onClick={resetFilters}
                    className={`text-xs underline underline-offset-2 ${
                      isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Hapus semua
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SkeletonCarGrid count={6} isDark={isDark} />
          </motion.div>
        )}

        {isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-20 rounded-3xl backdrop-blur-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/45 border-white/70'
            }`}
          >
            <AlertCircle size={28} className={`mx-auto mb-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              Gagal memuat armada: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <p className={`text-xs mt-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              Pastikan backend API berjalan di VITE_API_URL (lihat .env).
            </p>
          </motion.div>
        )}

        {!isLoading && !isError && cars && cars.length === 0 && activeFilters.length === 0 && !cari && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`relative overflow-hidden text-center py-24 rounded-3xl backdrop-blur-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/45 border-white/70'
            }`}
          >
            {/* Glow blob */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: '50%',
                height: '60%',
                background: isDark
                  ? 'radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse at center, rgba(37,99,235,0.06) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10">
              {/* Icon ring */}
              <div className="relative inline-flex items-center justify-center mb-7">
                <div
                  className={`w-24 h-24 rounded-full border-2 flex items-center justify-center ${
                    isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white/60'
                  }`}
                >
                  <CarIcon
                    size={40}
                    className={isDark ? 'text-white/20' : 'text-slate-300'}
                    strokeWidth={1.2}
                  />
                </div>
                <div
                  className={`absolute -top-1 -right-1 w-7 h-7 rounded-full border flex items-center justify-center ${
                    isDark
                      ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
                      : 'bg-blue-50 border-blue-200 text-blue-400'
                  }`}
                >
                  <Sparkles size={13} />
                </div>
              </div>

              <h2
                className={`font-playfair italic text-2xl sm:text-3xl mb-3 ${
                  isDark ? 'text-white/80' : 'text-slate-800'
                }`}
              >
                Armada Segera Hadir
              </h2>
              <p
                className={`text-sm max-w-xs mx-auto leading-relaxed ${
                  isDark ? 'text-white/40' : 'text-slate-500'
                }`}
              >
                Belum ada kendaraan yang tersedia saat ini.
                Silakan kunjungi kembali halaman ini dalam waktu dekat.
              </p>
            </div>
          </motion.div>
        )}

        {!isLoading && !isError && cars && cars.length === 0 && (activeFilters.length > 0 || cari) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-20 rounded-3xl backdrop-blur-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/45 border-white/70'
            }`}
          >
            <SearchX size={28} className={`mx-auto mb-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Tidak ada mobil yang cocok dengan pencarian ini.
            </p>
            <button
              onClick={resetFilters}
              className={`text-xs mt-3 underline underline-offset-2 ${
                isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hapus semua filter
            </button>
          </motion.div>
        )}

        {!isLoading && !isError && cars && cars.length > 0 && (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}