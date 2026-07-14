import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Loader2, ShieldCheck, Car as CarIcon, Truck } from 'lucide-react';
import { api, ApiError, type JenisAddon } from '../lib/api';
import { estimasiHarga, formatRupiah } from '../lib/pricing';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ADDON_HARGA_DEFAULT: Record<Exclude<JenisAddon, 'sopir'>, number> = {
  asuransi: 75_000,
  antar_jemput: 50_000,
};

export default function BookingPage() {
  const { carId } = useParams<{ carId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Kalau datang dari tombol "Sewa Sekarang" di Detail Mobil, tanggal
  // yang sudah dipilih di sana dibawa lewat navigation state.
  const initialRange = (location.state as { range?: DateRange } | null)?.range;

  const [range, setRange] = useState<DateRange | undefined>(initialRange);
  const [lokasiAmbil, setLokasiAmbil] = useState('');
  const [lokasiKembali, setLokasiKembali] = useState('');
  const [sameLokasi, setSameLokasi] = useState(true);
  const [sopirDipilih, setSopirDipilih] = useState(false);
  const [asuransiDipilih, setAsuransiDipilih] = useState(false);
  const [antarJemputDipilih, setAntarJemputDipilih] = useState(false);
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [noKtp, setNoKtp] = useState('');
  const [noSim, setNoSim] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const carQuery = useQuery({
    queryKey: ['car', carId],
    queryFn: () => api.getCar(carId!),
    enabled: !!carId,
  });

  const availabilityQuery = useQuery({
    queryKey: ['car-availability', carId],
    queryFn: () => api.getCarAvailability(carId!),
    enabled: !!carId,
  });

  // Pre-fill data penyewa dari profil, kalau sudah pernah diisi
  // sebelumnya (F6 langkah 5: "Isi/periksa data penyewa").
  useQuery({
    queryKey: ['my-profile-for-booking'],
    queryFn: async () => {
      const profile = await api.getMyProfile();
      setNama((prev) => prev || profile.nama);
      setNoHp((prev) => prev || profile.noHp);
      setNoKtp((prev) => prev || profile.noKtp || '');
      setNoSim((prev) => prev || profile.noSim || '');
      return profile;
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: api.createBooking,
    onSuccess: (booking) => {
      navigate(`/booking/${booking.id}/konfirmasi`);
    },
  });

  const car = carQuery.data;
  const bookedRanges = availabilityQuery.data ?? [];
  const disabledMatchers = bookedRanges.map((r) => ({
    from: new Date(r.tanggalMulai),
    to: new Date(r.tanggalSelesai),
  }));

  // Dipanggil sebelum early return isLoading/isError di bawah (Rules of
  // Hooks). Ini halaman panjang dengan beberapa <section> — stagger
  // reveal per section persis pola "Scroll di halaman panjang" §12.1 PRD.
  const formRef = useScrollReveal<HTMLDivElement>({ y: 24, stagger: 0.1, dependencies: [car?.id] });

  const addonLain = [
    ...(asuransiDipilih
      ? [{ jenis: 'asuransi' as const, harga: ADDON_HARGA_DEFAULT.asuransi }]
      : []),
    ...(antarJemputDipilih
      ? [{ jenis: 'antar_jemput' as const, harga: ADDON_HARGA_DEFAULT.antar_jemput }]
      : []),
  ];

  const estimasi = car
    ? estimasiHarga(car, range?.from, range?.to, sopirDipilih, addonLain)
    : null;

  const handleSubmit = () => {
    setFormError(null);

    if (!range?.from || !range?.to) {
      setFormError('Pilih tanggal ambil dan kembali dulu');
      return;
    }
    if (!lokasiAmbil.trim()) {
      setFormError('Lokasi ambil wajib diisi');
      return;
    }
    if (!sameLokasi && !lokasiKembali.trim()) {
      setFormError('Lokasi kembali wajib diisi');
      return;
    }
    if (!nama.trim() || !noHp.trim() || !noKtp.trim() || !noSim.trim()) {
      setFormError('Lengkapi data penyewa (nama, no. HP, no. KTP, no. SIM)');
      return;
    }

    const addons: { jenis: JenisAddon; harga?: number }[] = [
      ...(sopirDipilih ? [{ jenis: 'sopir' as const }] : []),
      ...addonLain,
    ];

    createBookingMutation.mutate({
      carId: carId!,
      tanggalMulai: range.from.toISOString(),
      tanggalSelesai: range.to.toISOString(),
      lokasiAmbil,
      lokasiKembali: sameLokasi ? lokasiAmbil : lokasiKembali,
      addons,
    });
  };

  if (carQuery.isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center gap-2 text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Memuat...
      </main>
    );
  }

  if (carQuery.isError || !car) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center text-white/60 text-sm">
        Mobil tidak ditemukan.
      </main>
    );
  }

  const inputClass =
    'w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-white/40';

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-24 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-5xl mx-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Form Pemesanan</p>
        <h1 className="font-playfair italic text-white text-3xl sm:text-4xl mb-8">{car.nama}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div ref={formRef} className="lg:col-span-3 flex flex-col gap-6">
            {/* Tanggal */}
            <section className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5">
              <h2 className="text-white text-sm font-medium mb-3">1. Tanggal Ambil & Kembali</h2>
              <div className="kerental-daypicker">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  disabled={[{ before: new Date() }, ...disabledMatchers]}
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
            </section>

            {/* Lokasi */}
            <section className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5">
              <h2 className="text-white text-sm font-medium mb-3">2. Lokasi Ambil & Kembali</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Lokasi Ambil</label>
                  <input
                    type="text"
                    value={lokasiAmbil}
                    onChange={(e) => setLokasiAmbil(e.target.value)}
                    placeholder="Alamat penjemputan"
                    className={inputClass}
                  />
                </div>

                <label className="flex items-center gap-2 text-white/60 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameLokasi}
                    onChange={(e) => setSameLokasi(e.target.checked)}
                    className="accent-[#2563eb]"
                  />
                  Lokasi kembali sama dengan lokasi ambil
                </label>

                {!sameLokasi && (
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">Lokasi Kembali</label>
                    <input
                      type="text"
                      value={lokasiKembali}
                      onChange={(e) => setLokasiKembali(e.target.value)}
                      placeholder="Alamat pengembalian"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Add-on */}
            <section className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5">
              <h2 className="text-white text-sm font-medium mb-3">3. Layanan Tambahan</h2>
              <div className="flex flex-col gap-3">
                {/* Sopir — perilaku ikut tipe_sewa (§6.2 F6 PRD) */}
                {car.tipeSewa === 'dengan_sopir' && (
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3.5 py-3">
                    <CarIcon size={16} className="text-[#2563eb]" />
                    <div className="flex-1">
                      <p className="text-white text-sm">Sopir</p>
                      <p className="text-white/40 text-xs">
                        Wajib untuk mobil ini — sudah termasuk di harga
                      </p>
                    </div>
                    {car.hargaSopirPerHari && (
                      <p className="text-white/60 text-xs">
                        {formatRupiah(Number(car.hargaSopirPerHari))}/hari
                      </p>
                    )}
                  </div>
                )}

                {car.tipeSewa === 'keduanya' && (
                  <label className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3.5 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sopirDipilih}
                      onChange={(e) => setSopirDipilih(e.target.checked)}
                      className="accent-[#2563eb]"
                    />
                    <CarIcon size={16} className="text-white/40" />
                    <div className="flex-1">
                      <p className="text-white text-sm">Sewa dengan Sopir</p>
                      <p className="text-white/40 text-xs">Opsional — kunci tetap di sopir</p>
                    </div>
                    {car.hargaSopirPerHari && (
                      <p className="text-white/60 text-xs">
                        {formatRupiah(Number(car.hargaSopirPerHari))}/hari
                      </p>
                    )}
                  </label>
                )}

                {car.tipeSewa === 'lepas_kunci' && (
                  <p className="text-white/40 text-xs">
                    Mobil ini hanya tersedia lepas kunci (self-drive) — sopir tidak ditawarkan.
                  </p>
                )}

                <label className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3.5 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asuransiDipilih}
                    onChange={(e) => setAsuransiDipilih(e.target.checked)}
                    className="accent-[#2563eb]"
                  />
                  <ShieldCheck size={16} className="text-white/40" />
                  <div className="flex-1">
                    <p className="text-white text-sm">Asuransi Tambahan</p>
                    <p className="text-white/40 text-xs">Perlindungan ekstra selama masa sewa</p>
                  </div>
                  <p className="text-white/60 text-xs">
                    {formatRupiah(ADDON_HARGA_DEFAULT.asuransi)}
                  </p>
                </label>

                <label className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3.5 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antarJemputDipilih}
                    onChange={(e) => setAntarJemputDipilih(e.target.checked)}
                    className="accent-[#2563eb]"
                  />
                  <Truck size={16} className="text-white/40" />
                  <div className="flex-1">
                    <p className="text-white text-sm">Antar-Jemput</p>
                    <p className="text-white/40 text-xs">Mobil diantar ke lokasi kamu</p>
                  </div>
                  <p className="text-white/60 text-xs">
                    {formatRupiah(ADDON_HARGA_DEFAULT.antar_jemput)}
                  </p>
                </label>
              </div>
            </section>

            {/* Data penyewa */}
            <section className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5">
              <h2 className="text-white text-sm font-medium mb-3">4. Data Penyewa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Nama Lengkap</label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">No. HP</label>
                  <input
                    type="tel"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">No. KTP</label>
                  <input
                    type="text"
                    value={noKtp}
                    onChange={(e) => setNoKtp(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">No. SIM</label>
                  <input
                    type="text"
                    value={noSim}
                    onChange={(e) => setNoSim(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Ringkasan harga */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5 sticky top-24">
              <h2 className="text-white text-sm font-medium mb-4">Ringkasan Harga</h2>

              {!estimasi ? (
                <p className="text-white/40 text-xs">Pilih tanggal untuk melihat estimasi harga.</p>
              ) : (
                <div className="flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>
                      {formatRupiah(Number(car.hargaPerHari))} × {estimasi.durasiHari} hari
                    </span>
                    <span>{formatRupiah(estimasi.hargaDasar)}</span>
                  </div>
                  {estimasi.addons.map((addon) => (
                    <div key={addon.jenis} className="flex justify-between text-white/60">
                      <span>{addon.label}</span>
                      <span>{formatRupiah(addon.harga)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2.5 mt-1 flex justify-between text-white font-medium">
                    <span>Total</span>
                    <span>{formatRupiah(estimasi.totalHarga)}</span>
                  </div>
                  <p className="text-white/30 text-[10px] mt-1">
                    Estimasi — harga final dihitung ulang & dikonfirmasi server saat submit.
                  </p>
                </div>
              )}

              {formError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-4">
                  {formError}
                </p>
              )}

              {createBookingMutation.isError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-4">
                  {createBookingMutation.error instanceof ApiError
                    ? createBookingMutation.error.message
                    : 'Gagal membuat booking, coba lagi'}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={createBookingMutation.isPending}
                className="w-full mt-5 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-2"
              >
                {createBookingMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Konfirmasi Pesanan
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
