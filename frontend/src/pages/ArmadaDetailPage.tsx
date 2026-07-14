import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Gauge, Users, Fuel, Loader2, ArrowLeft } from 'lucide-react';
import { api, type Kategori, type TipeSewa } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';

const KATEGORI_LABEL: Record<Kategori, string> = {
  city_car: 'City Car',
  suv: 'SUV',
  mpv: 'MPV',
  mewah: 'Mewah',
};

const TIPE_SEWA_BADGE: Record<TipeSewa, { label: string; className: string }> = {
  lepas_kunci: { label: 'Bisa Lepas Kunci', className: 'bg-emerald-500/15 text-emerald-400' },
  dengan_sopir: { label: 'Wajib dengan Sopir', className: 'bg-blue-500/15 text-blue-400' },
  keduanya: {
    label: 'Lepas Kunci / Dengan Sopir',
    className: 'bg-[#2563eb]/15 text-[#2563eb]',
  },
};

function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}

export default function ArmadaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  });

  // Dipanggil SEBELUM early return isLoading/isError di bawah — Rules of
  // Hooks melarang hook dipanggil setelah return kondisional. Dependency
  // pakai optional chaining karena carQuery.data belum tentu ada di
  // render pertama (masih loading).
  const contentRef = useScrollReveal<HTMLDivElement>({
    y: 20,
    stagger: 0.12,
    dependencies: [carQuery.data?.id],
  });

  const handleSewaSekarang = async () => {
    // F3 PRD: redirect ke login dulu jika belum login.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate(`/login?redirect=/booking/${id}`);
      return;
    }
    navigate(`/booking/${id}`, { state: { range } });
  };

  if (carQuery.isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 flex items-center justify-center gap-2 text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Memuat detail mobil...
      </main>
    );
  }

  if (carQuery.isError || !carQuery.data) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 flex flex-col items-center justify-center gap-3 text-center px-5">
        <p className="text-white/60 text-sm">Mobil tidak ditemukan atau gagal dimuat.</p>
        <button
          onClick={() => navigate('/armada')}
          className="text-[#2563eb] text-sm hover:underline"
        >
          Kembali ke Katalog Armada
        </button>
      </main>
    );
  }

  const car = carQuery.data;
  const badge = TIPE_SEWA_BADGE[car.tipeSewa];
  const bookedRanges = availabilityQuery.data ?? [];

  const disabledMatchers = bookedRanges.map((r) => ({
    from: new Date(r.tanggalMulai),
    to: new Date(r.tanggalSelesai),
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-24 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/armada')}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Kembali ke Armada
        </button>

        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: gallery + specs */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 h-64 sm:h-80 flex items-center justify-center overflow-hidden">
              {car.images.length > 0 ? (
                <div
                  className="w-full h-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${car.images[activeImage]?.url})` }}
                />
              ) : (
                <p className="text-white/20 text-sm">Belum ada foto</p>
              )}
            </div>

            {car.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {car.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 shrink-0 rounded-lg border overflow-hidden bg-white/5 ${
                      i === activeImage ? 'border-[#2563eb]' : 'border-white/10'
                    }`}
                  >
                    <div
                      className="w-full h-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${img.url})` }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6">
              <span
                className={`inline-block text-xs font-medium px-3 py-1.5 rounded-full mb-3 ${badge.className}`}
              >
                {badge.label}
              </span>
              <h1 className="font-playfair italic text-white text-3xl sm:text-4xl mb-1">
                {car.nama}
              </h1>
              <p className="text-white/40 text-sm mb-6">{KATEGORI_LABEL[car.kategori]}</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-center">
                  <Gauge size={16} className="text-white/40 mx-auto mb-1.5" />
                  <p className="text-white text-xs capitalize">{car.transmisi}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-center">
                  <Users size={16} className="text-white/40 mx-auto mb-1.5" />
                  <p className="text-white text-xs">{car.kapasitasKursi} Kursi</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-center">
                  <Fuel size={16} className="text-white/40 mx-auto mb-1.5" />
                  <p className="text-white text-xs">
                    {car.tipeSewa === 'lepas_kunci' ? 'Self-drive' : 'Tersedia sopir'}
                  </p>
                </div>
              </div>

              {car.deskripsi && (
                <p className="text-white/60 text-sm leading-relaxed">{car.deskripsi}</p>
              )}
            </div>
          </div>

          {/* Right: calendar + price + CTA */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5 sticky top-24">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">
                Pilih Tanggal Sewa
              </p>

              {availabilityQuery.isLoading ? (
                <div className="flex items-center justify-center py-10 text-white/40 text-sm gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Memuat kalender...
                </div>
              ) : (
                <div className="kerental-daypicker">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    disabled={[{ before: new Date() }, ...disabledMatchers]}
                    className="text-white text-sm"
                    classNames={{
                      months: 'flex flex-col',
                      month_caption: 'text-white/80 font-medium mb-2',
                      weekday: 'text-white/30 text-xs',
                      day: 'text-white/70 text-sm',
                      day_button: 'hover:bg-white/10 rounded-full transition-colors',
                      selected: 'bg-[#2563eb] text-white rounded-full',
                      range_middle: 'bg-[#2563eb]/25 text-white',
                      today: 'text-[#2563eb] font-semibold',
                      disabled: 'text-white/15 line-through',
                      outside: 'text-white/10',
                    }}
                  />
                </div>
              )}

              <div className="border-t border-white/10 mt-4 pt-4">
                <p className="text-white text-2xl font-medium">{formatRupiah(car.hargaPerHari)}</p>
                <p className="text-white/40 text-xs mb-4">per hari</p>

                <button
                  onClick={handleSewaSekarang}
                  disabled={car.status !== 'tersedia'}
                  className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white text-sm font-medium py-3.5 rounded-full transition-all hover:scale-[1.02] active:scale-95"
                >
                  {car.status === 'tersedia' ? 'Sewa Sekarang' : 'Tidak Tersedia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
