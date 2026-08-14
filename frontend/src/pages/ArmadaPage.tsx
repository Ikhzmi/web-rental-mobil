import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, type Car, type Kategori, type Transmisi, type TipeSewa } from '../lib/api';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

// Kategori diperluas dari 4 ke 8 di v1.3
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

function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}

function CarCard({ car, isDark }: { car: Car; isDark: boolean }) {
  const thumbnail = car.images[0]?.url;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/armada/${car.id}`}
        className={`block rounded-2xl overflow-hidden transition-all duration-300 group ${
          isDark
            ? 'sa-glass-light hover:border-white/30 hover:shadow-lg hover:shadow-black/10'
            : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 hover:border-slate-300 hover:shadow-xl hover:shadow-black/10'
        }`}
      >
        <div className={`relative h-40 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
          {thumbnail ? (
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${thumbnail})` }}
            />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center text-sm ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
              Belum ada foto
            </div>
          )}
          {/* Kategori badge */}
          <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm ${
            isDark
              ? 'bg-black/60 text-white/80'
              : 'bg-white/80 text-slate-700 shadow-sm'
          }`}>
            {KATEGORI_LABEL[car.kategori]}
          </span>
          {/* Instance label - v1.3 */}
          {car.instansi && (
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] backdrop-blur-sm ${
              isDark ? 'bg-black/60 text-white/80' : 'bg-white/80 text-slate-700 shadow-sm'
            }`}>
              <span>{car.instansi.namaInstansi}</span>
              {car.instansi.status === 'aktif' && (
                <CheckCircle size={10} className="text-emerald-500" />
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>{TIPE_SEWA_LABEL[car.tipeSewa]}</p>
          <div className="flex items-center justify-between mt-3">
            <p className={`font-medium text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {formatRupiah(car.hargaPerHari)}
              <span className={`font-normal ${isDark ? 'text-white/40' : 'text-slate-400'}`}> /hari</span>
            </p>
            <span className={`text-xs transition-colors group-hover:translate-x-1 ${
              isDark ? 'text-white/50 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-600'
            }`}>
              Lihat Detail
              <svg className="inline w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ArmadaPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [kategori, setKategori] = useState<Kategori | ''>('');
  const [transmisi, setTransmisi] = useState<Transmisi | ''>('');
  const [tipeSewa, setTipeSewa] = useState<TipeSewa | ''>('');
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

  const selectClass = `text-sm rounded-full px-4 py-2 transition-all duration-200 focus:scale-[1.02] ${
    isDark
      ? 'bg-[var(--bg-elevated)] border border-[var(--border-color)] text-white focus:border-white/30 [&>option]:bg-[var(--bg-surface)]'
      : 'bg-white/80 border border-slate-200 text-slate-900 focus:border-slate-400 [&>option]:bg-white'
  }`;

  return (
    <main className={`min-h-screen pt-28 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 bg-[var(--bg-primary)]`}>
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef}>
          <div className="mb-8">
            <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Katalog</p>
            <h1 className={`font-playfair italic text-4xl sm:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Armada Kami</h1>
          </div>

          {/* Search + filter toggle (mobile) */}
          <div className="flex items-center gap-3 mb-4">
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
                    ? 'bg-[var(--bg-elevated)] border border-white/15 text-white placeholder:text-white/30 focus:border-white/30'
                    : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                }`}
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`sm:hidden w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
                isDark
                  ? 'bg-[var(--bg-elevated)] border border-white/15'
                  : 'bg-white/80 border border-slate-200'
              } ${isDark ? 'text-white/70' : 'text-slate-600'}`}
              aria-label="Filter"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Filter bar */}
          <div className={`flex-wrap gap-2.5 mb-8 ${showFilters ? 'flex' : 'hidden'} sm:flex`}>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as Kategori | '')}
              className={selectClass}
            >
              <option value="">Semua Kategori</option>
              {Object.entries(KATEGORI_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={transmisi}
              onChange={(e) => setTransmisi(e.target.value as Transmisi | '')}
              className={selectClass}
            >
              <option value="">Semua Transmisi</option>
              <option value="manual">Manual</option>
              <option value="matic">Matic</option>
            </select>

            <select
              value={tipeSewa}
              onChange={(e) => setTipeSewa(e.target.value as TipeSewa | '')}
              className={selectClass}
            >
              <option value="">Semua Tipe Sewa</option>
              <option value="lepas_kunci">Lepas Kunci</option>
              <option value="dengan_sopir">Dengan Sopir</option>
              <option value="keduanya">Keduanya</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'harga_asc' | 'harga_desc' | '')}
              className={selectClass}
            >
              <option value="">Urutkan</option>
              <option value="harga_asc">Harga Termurah</option>
              <option value="harga_desc">Harga Termahal</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center justify-center gap-2 py-20 ${isDark ? 'text-white/50' : 'text-slate-500'}`}
          >
            <Loader2 size={18} className="animate-spin" />
            Memuat armada...
          </motion.div>
        )}

        {isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
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
            className={`text-center py-20 text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}
          >
            Tidak ada mobil yang cocok dengan filter ini.
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
