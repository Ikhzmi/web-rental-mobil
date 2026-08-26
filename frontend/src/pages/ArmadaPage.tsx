import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  CheckCircle,
  Settings2,
  Users,
  Key,
  ArrowRight,
  X,
  SearchX,
  AlertCircle,
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

/** Chip kecil untuk menampilkan satu spesifikasi (transmisi, kursi, tipe sewa) */
function SpecChip({
  icon,
  label,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  isDark: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${
        isDark ? 'bg-white/[0.06] text-white/55' : 'bg-slate-900/[0.05] text-slate-600'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

/**
 * Kartu mobil dengan "panggung" spotlight — dirancang untuk foto mobil PNG
 * berlatar transparan: bola cahaya lembut di belakang, bayangan tanah di
 * bawah roda, dan sedikit efek melayang saat hover.
 */
function CarCard({ car, isDark }: { car: Car; isDark: boolean }) {
  const thumbnail = car.images[0]?.url;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group h-full"
    >
      <Link
        to={`/armada/${car.id}`}
        className={`relative flex h-full flex-col rounded-[28px] overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? 'bg-white/[0.035] border border-white/10 hover:border-white/25 hover:shadow-[0_24px_60px_-20px_rgba(255,255,255,0.12)]'
            : 'bg-white/50 border border-white/70 hover:border-white hover:shadow-[0_24px_60px_-20px_rgba(15,23,42,0.2)]'
        }`}
      >
        {/* Garis kilau tipis di tepi atas — ciri khas kaca */}
        <div
          className={`pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent to-transparent ${
            isDark ? 'via-white/25' : 'via-white/90'
          }`}
        />

        {/* Panggung spotlight untuk foto mobil */}
        <div
          className={`relative h-48 flex items-center justify-center overflow-hidden ${
            isDark
              ? 'bg-gradient-to-b from-white/[0.05] to-transparent'
              : 'bg-gradient-to-b from-white/50 to-transparent'
          }`}
        >
          {/* Bola cahaya ambient di belakang mobil */}
          <div
            className={`absolute w-36 h-36 rounded-full blur-3xl transition-all duration-500 group-hover:scale-125 ${
              isDark ? 'bg-white/10 opacity-70 group-hover:opacity-100' : 'bg-amber-200/60 opacity-80 group-hover:opacity-100'
            }`}
          />

          {thumbnail ? (
            <>
              <img
                src={thumbnail}
                alt={car.nama}
                loading="lazy"
                decoding="async"
                className={`relative z-10 h-[82%] w-auto object-contain transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 ${
                  isDark
                    ? 'drop-shadow-[0_18px_22px_rgba(0,0,0,0.5)]'
                    : 'drop-shadow-[0_18px_20px_rgba(30,20,10,0.22)]'
                }`}
              />
              {/* Bayangan tanah — memberi kesan mobil "berpijak" walau PNG transparan */}
              <div
                className={`absolute bottom-5 z-0 w-24 h-3 rounded-full blur-md transition-all duration-500 group-hover:w-28 group-hover:opacity-80 ${
                  isDark ? 'bg-black/60 opacity-60' : 'bg-slate-900/25 opacity-70'
                }`}
              />
            </>
          ) : (
            <div className={`relative z-10 text-sm ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
              Belum ada foto
            </div>
          )}

          {/* Badge kategori */}
          <span
            className={`absolute top-3 left-3 z-20 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md ${
              isDark
                ? 'bg-black/50 text-white/80 border border-white/10'
                : 'bg-white/75 text-slate-700 border border-white/80 shadow-sm'
            }`}
          >
            {KATEGORI_LABEL[car.kategori]}
          </span>

          {/* Badge instansi (multi-tenant, v1.3) */}
          {car.instansi && (
            <div
              className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] backdrop-blur-md ${
                isDark
                  ? 'bg-black/50 text-white/80 border border-white/10'
                  : 'bg-white/75 text-slate-700 border border-white/80 shadow-sm'
              }`}
            >
              <span>{car.instansi.namaInstansi}</span>
              {car.instansi.status === 'aktif' && <CheckCircle size={10} className="text-emerald-500" />}
            </div>
          )}
        </div>

        {/* Konten */}
        <div className="flex flex-1 flex-col p-4 pt-3.5">
          <h3 className={`font-medium leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <SpecChip
              isDark={isDark}
              icon={<Settings2 size={11} />}
              label={car.transmisi === 'manual' ? 'Manual' : 'Matic'}
            />
            <SpecChip isDark={isDark} icon={<Users size={11} />} label={`${car.kapasitasKursi} kursi`} />
            <SpecChip isDark={isDark} icon={<Key size={11} />} label={TIPE_SEWA_CHIP[car.tipeSewa]} />
          </div>

          <div
            className={`flex items-center justify-between mt-auto pt-3.5 mt-3.5 border-t ${
              isDark ? 'border-white/10' : 'border-slate-900/10'
            }`}
          >
            <p>
              <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatRupiah(car.hargaPerHari)}
              </span>
              <span className={`text-xs font-normal ${isDark ? 'text-white/40' : 'text-slate-400'}`}> /hari</span>
            </p>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
                isDark
                  ? 'bg-white/10 text-white group-hover:bg-white group-hover:text-slate-900'
                  : 'bg-slate-900/5 text-slate-700 group-hover:bg-slate-900 group-hover:text-white'
              }`}
            >
              Detail
              <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
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
        className={`text-sm rounded-full pl-9 pr-4 py-2.5 transition-all duration-200 focus:scale-[1.02] appearance-none cursor-pointer ${
          isDark
            ? 'bg-white/[0.05] border border-white/10 text-white focus:border-white/30 [&>option]:bg-[#1a1a1a]'
            : 'bg-white/70 border border-white/80 text-slate-900 focus:border-slate-400 [&>option]:bg-white'
        }`}
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

              <FilterSelect icon={<Settings2 size={13} />} value={transmisi} onChange={(v) => setTransmisi(v as Transmisi | '')} isDark={isDark}>
                <option value="">Semua Transmisi</option>
                <option value="manual">Manual</option>
                <option value="matic">Matic</option>
              </FilterSelect>

              <FilterSelect icon={<Key size={13} />} value={tipeSewa} onChange={(v) => setTipeSewa(v as TipeSewa | '')} isDark={isDark}>
                <option value="">Semua Tipe Sewa</option>
                <option value="lepas_kunci">Lepas Kunci</option>
                <option value="dengan_sopir">Dengan Sopir</option>
                <option value="keduanya">Keduanya</option>
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

        {!isLoading && !isError && cars && cars.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-20 rounded-3xl backdrop-blur-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/45 border-white/70'
            }`}
          >
            <SearchX size={28} className={`mx-auto mb-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Tidak ada mobil yang cocok dengan filter ini.
            </p>
            {activeFilters.length > 0 && (
              <button
                onClick={resetFilters}
                className={`text-xs mt-3 underline underline-offset-2 ${
                  isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hapus semua filter
              </button>
            )}
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