import { useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Loader2, ShieldCheck, Car as CarIcon, Truck, Check, MapPin, Calendar as CalendarIcon, User, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, ApiError, type JenisAddon } from '../lib/api';
import { estimasiHarga, formatRupiah } from '../lib/pricing';
import { useTheme } from '../hooks/useTheme';

const ADDON_HARGA_DEFAULT: Record<Exclude<JenisAddon, 'sopir'>, number> = {
  asuransi: 75_000,
  antar_jemput: 50_000,
};

const STEPS = [
  { id: 1, title: 'Tanggal', icon: CalendarIcon },
  { id: 2, title: 'Lokasi', icon: MapPin },
  { id: 3, title: 'Add-on', icon: Truck },
  { id: 4, title: 'Data', icon: User },
];

export default function BookingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { carId } = useParams<{ carId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  const initialRange = (location.state as { range?: DateRange } | null)?.range;
  const [range, setRange] = useState<DateRange | undefined>(initialRange);
  const [currentStep] = useState(1);
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

  const addonLain = [
    ...(asuransiDipilih ? [{ jenis: 'asuransi' as const, harga: ADDON_HARGA_DEFAULT.asuransi }] : []),
    ...(antarJemputDipilih ? [{ jenis: 'antar_jemput' as const, harga: ADDON_HARGA_DEFAULT.antar_jemput }] : []),
  ];

  const estimasi = car ? estimasiHarga(car, range?.from, range?.to, sopirDipilih, addonLain) : null;

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

  const inputClass = `w-full rounded-xl text-sm px-4 py-3.5 transition-all focus:outline-none ${
    isDark
      ? 'bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:bg-white/[0.05]'
      : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
  }`;

  const cardClass = isDark
    ? 'animate-card rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 md:p-8'
    : 'animate-card rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-6 md:p-8';

  const iconBoxClass = isDark
    ? 'w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center'
    : 'w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center';

  if (carQuery.isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <Loader2 size={18} className="animate-spin" />
        <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Memuat...</span>
      </main>
    );
  }

  if (carQuery.isError || !car) {
    return (
      <main className={`min-h-screen flex items-center justify-center text-sm transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] text-white/60'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-600'
      }`}>
        Mobil tidak ditemukan.
      </main>
    );
  }

  return (
    <main ref={sectionRef} className={`min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className={`text-sm font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Form Pemesanan</p>
          <h1 className={`font-playfair italic text-3xl sm:text-4xl md:text-5xl mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Lengkapi data di bawah untuk melanjutkan pemesanan</p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="animate-card flex items-center justify-center mb-10 overflow-x-auto pb-2"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? isDark
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
                            : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
                          : isActive
                          ? isDark
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30'
                            : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30'
                          : isDark
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : isDark ? 'text-white/40' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium hidden sm:block ${
                      isActive || isCompleted
                        ? isDark ? 'text-white' : 'text-slate-900'
                        : isDark ? 'text-white/40' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 mx-2 rounded-full transition-all duration-300 ${
                        currentStep > step.id
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
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
            {/* Step 1: Tanggal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cardClass}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={iconBoxClass}>
                  <CalendarIcon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Pilih Tanggal</h2>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tanggal ambil dan kembali</p>
                </div>
              </div>

              <div className={isDark ? 'kerental-daypicker-dark' : 'kerental-daypicker-light'}>
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  disabled={[
                    { before: new Date() },
                    ...bookedRanges.map((r) => ({
                      from: new Date(r.tanggalMulai),
                      to: new Date(r.tanggalSelesai),
                    })),
                  ]}
                  classNames={{
                    months: 'flex flex-col',
                    month_caption: `font-medium mb-3 text-base ${isDark ? 'text-white/80' : 'text-slate-800'}`,
                    weekday: `${isDark ? 'text-white/30' : 'text-slate-400'} text-xs uppercase tracking-wider`,
                    day: `${isDark ? 'text-white/70' : 'text-slate-700'} text-sm transition-all duration-200`,
                    day_button: 'hover:bg-blue-500/20 rounded-full transition-all duration-200',
                    selected: isDark
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30',
                    range_middle: isDark
                      ? 'bg-blue-500/20 text-white rounded-none hover:bg-blue-500/30'
                      : 'bg-blue-100 text-blue-800 rounded-none hover:bg-blue-200',
                    range_start: 'rounded-r-none',
                    range_end: 'rounded-l-none',
                    today: isDark
                      ? 'text-blue-400 font-bold ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#0a0f1a]'
                      : 'text-blue-600 font-bold ring-2 ring-blue-300',
                    disabled: isDark
                      ? 'text-red-400/50 line-through bg-red-500/10 rounded-full'
                      : 'text-red-400/50 line-through bg-red-50 rounded-full',
                    outside: isDark ? 'text-white/10' : 'text-slate-200',
                  }}
                />
              </div>

              {/* Legend */}
              <div className={`mt-4 flex flex-wrap gap-4 text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${isDark ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`} />
                  <span>Terpilih</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${isDark ? 'bg-red-500/30 line-through' : 'bg-red-100 line-through'}`} />
                  <span>Tidak Tersedia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${isDark ? 'border-blue-500/50' : 'border-blue-400'}`} />
                  <span>Hari Ini</span>
                </div>
              </div>
            </motion.div>

            {/* Step 2: Lokasi */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cardClass}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={iconBoxClass}>
                  <MapPin className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Lokasi</h2>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Titik penjemputan & pengembalian</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Lokasi Ambil</label>
                  <input
                    type="text"
                    value={lokasiAmbil}
                    onChange={(e) => setLokasiAmbil(e.target.value)}
                    placeholder="Masukkan alamat penjemputan"
                    className={inputClass}
                  />
                </div>

                <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.05]'
                    : 'bg-white/50 border border-slate-200 hover:bg-white/80'
                }`}>
                  <input
                    type="checkbox"
                    checked={sameLokasi}
                    onChange={(e) => setSameLokasi(e.target.checked)}
                    className="w-5 h-5 accent-blue-500 rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Lokasi kembali sama dengan lokasi ambil</span>
                </label>

                {!sameLokasi && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Lokasi Kembali</label>
                    <input
                      type="text"
                      value={lokasiKembali}
                      onChange={(e) => setLokasiKembali(e.target.value)}
                      placeholder="Masukkan alamat pengembalian"
                      className={inputClass}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Step 3: Add-on */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={cardClass}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={iconBoxClass}>
                  <Truck className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Layanan Tambahan</h2>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Pilih layanan yang diinginkan</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Sopir */}
                {car.tipeSewa === 'dengan_sopir' && (
                  <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                    isDark
                      ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                      <CarIcon size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Sopir</p>
                      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Wajib — sudah termasuk di harga</p>
                    </div>
                    {car.hargaSopirPerHari && (
                      <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {formatRupiah(Number(car.hargaSopirPerHari))}/hari
                      </span>
                    )}
                  </div>
                )}

                {car.tipeSewa === 'keduanya' && (
                  <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                      : 'bg-white/50 border-slate-200 hover:bg-white/80'
                  }`}>
                    <input
                      type="checkbox"
                      checked={sopirDipilih}
                      onChange={(e) => setSopirDipilih(e.target.checked)}
                      className="w-5 h-5 accent-blue-500 rounded"
                    />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                      <CarIcon size={18} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Sewa dengan Sopir</p>
                      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Kunci tetap di sopir</p>
                    </div>
                    {car.hargaSopirPerHari && (
                      <span className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                        {formatRupiah(Number(car.hargaSopirPerHari))}/hari
                      </span>
                    )}
                  </label>
                )}

                {car.tipeSewa === 'lepas_kunci' && (
                  <p className={`text-sm p-4 rounded-xl ${isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'}`}>
                    Mobil ini hanya tersedia lepas kunci (self-drive)
                  </p>
                )}

                <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                  isDark
                    ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                    : 'bg-white/50 border-slate-200 hover:bg-white/80'
                }`}>
                  <input
                    type="checkbox"
                    checked={asuransiDipilih}
                    onChange={(e) => setAsuransiDipilih(e.target.checked)}
                    className="w-5 h-5 accent-blue-500 rounded"
                  />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <ShieldCheck size={18} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Asuransi Tambahan</p>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Perlindungan ekstra selama masa sewa</p>
                  </div>
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                    {formatRupiah(ADDON_HARGA_DEFAULT.asuransi)}
                  </span>
                </label>

                <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                  isDark
                    ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                    : 'bg-white/50 border-slate-200 hover:bg-white/80'
                }`}>
                  <input
                    type="checkbox"
                    checked={antarJemputDipilih}
                    onChange={(e) => setAntarJemputDipilih(e.target.checked)}
                    className="w-5 h-5 accent-blue-500 rounded"
                  />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <Truck size={18} className={isDark ? 'text-white/60' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Antar-Jemput</p>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Mobil diantar ke lokasi kamu</p>
                  </div>
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                    {formatRupiah(ADDON_HARGA_DEFAULT.antar_jemput)}
                  </span>
                </label>
              </div>
            </motion.div>

            {/* Step 4: Data Penyewa */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cardClass}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={iconBoxClass}>
                  <User className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Data Penyewa</h2>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Identitas pemesan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nama Lengkap</label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="John Doe"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. HP</label>
                  <input
                    type="tel"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="081234567890"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. KTP</label>
                  <input
                    type="text"
                    value={noKtp}
                    onChange={(e) => setNoKtp(e.target.value)}
                    placeholder="1234567890123456"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`text-sm mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. SIM</label>
                  <input
                    type="text"
                    value={noSim}
                    onChange={(e) => setNoSim(e.target.value)}
                    placeholder="123456789012"
                    className={inputClass}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`lg:sticky lg:top-24 rounded-2xl p-6 ${
                isDark
                  ? 'bg-white/[0.08] backdrop-blur-2xl border border-white/10'
                  : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-xl shadow-slate-900/10'
              }`}
            >
              {/* Car Info */}
              <div className={`flex items-center gap-4 pb-4 mb-4 ${
                isDark ? 'border-b border-white/10' : 'border-b border-slate-200'
              }`}>
                {car.images && car.images.length > 0 && (
                  <img
                    src={car.images[0].url}
                    alt={car.nama}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                )}
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{car.kategori}</p>
                </div>
              </div>

              {/* Price Summary */}
              <h2 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <CreditCard className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                Ringkasan Harga
              </h2>

              {!estimasi ? (
                <div className="text-center py-8">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <CalendarIcon className={`w-8 h-8 ${isDark ? 'text-white/30' : 'text-slate-300'}`} />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Pilih tanggal untuk melihat estimasi harga</p>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className={`flex justify-between ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    <span>
                      {formatRupiah(Number(car.hargaPerHari))} × {estimasi.durasiHari} hari
                    </span>
                    <span>{formatRupiah(estimasi.hargaDasar)}</span>
                  </div>
                  {estimasi.addons.map((addon) => (
                    <div key={addon.jenis} className={`flex justify-between ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      <span>{addon.label}</span>
                      <span>{formatRupiah(addon.harga)}</span>
                    </div>
                  ))}
                  <div className={`border-t pt-3 mt-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className={`flex justify-between font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>Total</span>
                      <span className={isDark ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'text-blue-600'}>
                        {formatRupiah(estimasi.totalHarga)}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                    *Estimasi — harga final dihitung ulang saat submit
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

              {/* Submit Button */}
              <motion.button
                onClick={handleSubmit}
                disabled={createBookingMutation.isPending}
                whileHover={{ scale: createBookingMutation.isPending ? 1 : 1.01 }}
                whileTap={{ scale: createBookingMutation.isPending ? 1 : 0.99 }}
                className={`w-full mt-6 relative group overflow-hidden rounded-xl ${
                  isDark
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                <span className="relative flex items-center justify-center gap-2 py-4 font-semibold">
                  {createBookingMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Konfirmasi Pesanan
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .kerental-daypicker-dark {
          --rdp-cell-size: 42px;
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: #1e3a5f;
        }
        .kerental-daypicker-light {
          --rdp-cell-size: 42px;
          --rdp-accent-color: #2563eb;
          --rdp-background-color: #dbeafe;
        }
        .kerental-daypicker-dark .rdp-months,
        .kerental-daypicker-light .rdp-months {
          justify-content: center;
        }
        .kerental-daypicker-dark .rdp-month,
        .kerental-daypicker-light .rdp-month {
          background: transparent;
        }
        .kerental-daypicker-dark .rdp-caption,
        .kerental-daypicker-light .rdp-caption {
          padding: 0 0 16px 0;
        }
        .kerental-daypicker-dark .rdp-nav,
        .kerental-daypicker-light .rdp-nav {
          gap: 8px;
        }
        .kerental-daypicker-dark .rdp-button:hover:not([disabled]),
        .kerental-daypicker-light .rdp-button:hover:not([disabled]) {
          background: rgba(59, 130, 246, 0.2);
        }
        .kerental-daypicker-dark .rdp-button[disabled],
        .kerental-daypicker-light .rdp-button[disabled] {
          background: rgba(239, 68, 68, 0.1);
          color: rgba(239, 68, 68, 0.5);
          text-decoration: line-through;
        }
      `}</style>
    </main>
  );
}
