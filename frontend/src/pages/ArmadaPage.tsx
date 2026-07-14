import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { api, type Car, type Kategori, type Transmisi, type TipeSewa } from '../lib/api';
import { useScrollReveal } from '../hooks/useScrollReveal';

const KATEGORI_LABEL: Record<Kategori, string> = {
  city_car: 'City Car',
  suv: 'SUV',
  mpv: 'MPV',
  mewah: 'Mewah',
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

function CarCard({ car }: { car: Car }) {
  const thumbnail = car.images[0]?.url;

  return (
    <Link
      to={`/armada/${car.id}`}
      className="group rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
    >
      <div className="relative h-40 bg-white/5">
        {thumbnail ? (
          <div
            className="absolute inset-0 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">
            Belum ada foto
          </div>
        )}
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-full">
          {KATEGORI_LABEL[car.kategori]}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-white font-medium">{car.nama}</h3>
        <p className="text-white/45 text-xs mt-0.5">{TIPE_SEWA_LABEL[car.tipeSewa]}</p>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[#2563eb] font-medium text-sm">
            {formatRupiah(car.hargaPerHari)}
            <span className="text-white/40 font-normal"> /hari</span>
          </p>
          <span className="text-xs text-white/50 group-hover:text-white transition-colors">
            Lihat Detail →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ArmadaPage() {
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
  // dependencies: [cars] — grid card baru muncul di DOM setelah query
  // selesai, jadi reveal-nya wajib re-run saat data ini berubah, bukan
  // cuma sekali di mount (waktu itu grid-nya masih kosong).
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.06, dependencies: [cars] });

  const selectClass =
    'bg-white/5 border border-white/15 text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:border-white/40 [&>option]:bg-[#0a0f1a]';

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef}>
          <div className="mb-8">
            <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Katalog</p>
            <h1 className="font-playfair italic text-white text-4xl sm:text-5xl">Armada Kami</h1>
          </div>

        {/* Search + filter toggle (mobile) */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama mobil..."
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-full pl-10 pr-4 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="sm:hidden w-10 h-10 shrink-0 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/70"
            aria-label="Filter"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Filter bar */}
        <div
          className={`flex-wrap gap-2.5 mb-8 ${showFilters ? 'flex' : 'hidden'} sm:flex`}
        >
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
            {Object.entries(TIPE_SEWA_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
          <div className="flex items-center justify-center gap-2 text-white/50 py-20">
            <Loader2 size={18} className="animate-spin" />
            Memuat armada...
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="text-white/60 text-sm">
              Gagal memuat armada: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <p className="text-white/30 text-xs mt-2">
              Pastikan backend API berjalan di VITE_API_URL (lihat .env).
            </p>
          </div>
        )}

        {!isLoading && !isError && cars && cars.length === 0 && (
          <div className="text-center py-20 text-white/40 text-sm">
            Tidak ada mobil yang cocok dengan filter ini.
          </div>
        )}

        {!isLoading && !isError && cars && cars.length > 0 && (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
