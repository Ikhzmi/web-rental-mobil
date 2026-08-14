import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Gauge, Users, Loader2, ArrowLeft, CheckCircle, Building2, Calendar as CalendarIcon, ShieldCheck, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, type Kategori, type TipeSewa } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';
import { sanitizeHtml } from '../lib/sanitize';

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
  lepas_kunci: { label: 'Bisa Lepas Kunci', className: 'bg-emerald-500/15 text-emerald-400' },
  dengan_sopir: { label: 'Wajib dengan Sopir', className: 'bg-blue-500/15 text-white/60' },
  keduanya: {
    label: 'Lepas Kunci / Dengan Sopir',
    className: 'bg-blue-500/15 text-white/60',
  },
};

function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}

export default function ArmadaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const elements = sectionRef.current.querySelectorAll('.animate-section');
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  const handleSewaSekarang = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate(`/login?redirect=/booking/${id}`);
      return;
    }
    navigate(`/booking/${id}`, { state: { range } });
  };

  if (carQuery.isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      } pt-28 pb-20`}>
        <Loader2 size={18} className={`animate-spin ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
        <span className={isDark ? 'text-white/50' : 'text-slate-400'}>Memuat detail mobil...</span>
      </main>
    );
  }

  if (carQuery.isError || !carQuery.data) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center gap-3 text-center px-5 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      } pt-28 pb-20`}>
        <p className={isDark ? 'text-white/60 text-sm' : 'text-slate-600 text-sm'}>Mobil tidak ditemukan atau gagal dimuat.</p>
        <button
          onClick={() => navigate('/armada')}
          className={isDark ? 'text-white/60 text-sm hover:underline' : 'text-slate-600 text-sm hover:underline'}
        >
          Kembali ke Katalog Armada
        </button>
      </main>
    );
  }

  const car = carQuery.data;
  const badge = TIPE_SEWA_BADGE[car.tipeSewa];
  const bookedRanges = availabilityQuery.data ?? [];

  return (
    <main ref={sectionRef} className={`min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
      isDark
        ? 'bg-[#0a0a0a]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-white/5' : 'bg-slate-200/50'}`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-purple-500/5' : 'bg-purple-500/10'}`} />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/armada')}
          className={`animate-section flex items-center gap-2 text-sm mb-6 transition-colors ${
            isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft size={18} />
          Kembali ke Armada
        </button>

        {/* Instance Info - v1.3 */}
        {car.instansi && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`animate-section mb-8 p-4 rounded-2xl flex items-center gap-4 ${
              isDark
                ? 'sa-glass-light-elevated'
                : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-orange-500/20' : 'bg-orange-100'
            }`}>
              <Building2 size={22} className="text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.instansi.namaInstansi}</p>
                {car.instansi.status === 'aktif' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 rounded-full text-xs font-medium">
                    <CheckCircle size={12} />
                    Terverifikasi
                  </span>
                )}
              </div>
              <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Penyedia rental terpercaya</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
              ))}
              <span className={`text-sm ml-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>5.0</span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: gallery + specs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Main Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`animate-section relative rounded-2xl overflow-hidden ${
                isDark
                  ? 'sa-glass-light-elevated'
                  : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5'
              }`}
            >
              {car.images.length > 0 ? (
                <div
                  className="w-full h-64 sm:h-80 lg:h-96 bg-contain bg-center bg-no-repeat transition-all duration-500"
                  style={{ backgroundImage: `url(${car.images[activeImage]?.url})` }}
                />
              ) : (
                <div className={`w-full h-64 sm:h-80 lg:h-96 flex items-center justify-center ${
                  isDark ? 'text-white/20' : 'text-slate-300'
                } text-sm`}>
                  Belum ada foto
                </div>
              )}
              {/* Badge overlay */}
              <div className="absolute top-4 left-4">
                <span className={`inline-block text-sm font-medium px-4 py-2 rounded-full backdrop-blur-xl ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            </motion.div>

            {/* Thumbnails */}
            {car.images.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="animate-section flex gap-3 overflow-x-auto pb-2"
              >
                {car.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                      i === activeImage
                        ? isDark
                          ? 'border-white/20 shadow-lg shadow-black/30'
                          : 'border-white/20 shadow-lg shadow-black/20'
                        : isDark
                          ? 'border-white/10 hover:border-white/30'
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="w-full h-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${img.url})` }}
                    />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Car Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="animate-section"
            >
              <p className={`text-sm font-medium uppercase tracking-wider mb-2 ${
                isDark ? 'text-white/60' : 'text-slate-600'
              }`}>
                {KATEGORI_LABEL[car.kategori]}
              </p>
              <h1 className={`font-playfair italic text-3xl sm:text-4xl lg:text-5xl mb-6 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {car.nama}
              </h1>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: Gauge, label: 'Transmisi', value: car.transmisi },
                  { icon: Users, label: 'Kapasitas', value: `${car.kapasitasKursi} Kursi` },
                  { icon: ShieldCheck, label: 'Asuransi', value: 'Full' },
                ].map((spec, index) => (
                  <motion.div
                    key={spec.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + index * 0.1 }}
                    whileHover={{ y: -2 }}
                    className={`rounded-xl p-4 text-center transition-all duration-300 group ${
                      isDark
                        ? 'sa-glass-light hover:border-white/30'
                        : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-sm hover:shadow-lg hover:shadow-black/10'
                    }`}
                  >
                    <spec.icon
                      size={22}
                      className={`mx-auto mb-2 transition-transform group-hover:scale-110 ${
                        isDark ? 'text-white/60' : 'text-slate-600'
                      }`}
                    />
                    <p className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{spec.value}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{spec.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Description */}
              {car.deskripsi && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className={`rounded-xl p-6 ${
                    isDark
                      ? 'sa-glass-light'
                      : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-sm'
                  }`}
                >
                  <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Deskripsi</h3>
                  <p
                    className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(car.deskripsi || '') }}
                  />
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right: calendar + price + CTA */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`lg:sticky lg:top-24 rounded-2xl p-6 shadow-2xl ${
                isDark
                  ? 'sa-glass-light-elevated'
                  : 'bg-white/80 backdrop-blur-2xl border border-white/80 shadow-slate-900/10'
              }`}
            >
              {/* Price Header */}
              <div className={`text-center mb-6 pb-4 ${isDark ? 'border-b border-white/10' : 'border-b border-slate-200'}`}>
                <p className={`text-sm mb-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Harga per hari</p>
                <p className={`text-3xl sm:text-4xl font-bold ${
                  isDark
                    ? 'bg-gradient-to-r from-white/40 to-white/20 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-zinc-700 to-zinc-800 bg-clip-text text-transparent'
                }`}>
                  {formatRupiah(car.hargaPerHari)}
                </p>
              </div>

              {/* Calendar Section */}
              <div className="mb-6">
                <div className={`flex items-center gap-2 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <CalendarIcon className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-slate-600'}`} />
                  <h3 className="font-semibold">Pilih Tanggal</h3>
                </div>

                {availabilityQuery.isLoading ? (
                  <div className={`flex items-center justify-center py-10 text-sm gap-2 ${
                    isDark ? 'text-white/40' : 'text-slate-400'
                  }`}>
                    <Loader2 size={16} className="animate-spin" />
                    Memuat kalender...
                  </div>
                ) : (
                  <div className="kerental-daypicker">
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
                        month_caption: `${isDark ? 'text-white/80' : 'text-slate-800'} font-semibold text-base mb-3`,
                        weekday: `${isDark ? 'text-white/30' : 'text-slate-400'} text-xs uppercase tracking-wider`,
                        day: `${isDark ? 'text-white/70' : 'text-slate-700'} text-sm transition-all duration-200`,
                        day_button: `hover:bg-white/10 rounded-full transition-all duration-200 ${isDark ? '' : 'hover:bg-slate-100'}`,
                        selected: isDark
                          ? 'bg-white text-zinc-900 rounded-full shadow-lg shadow-white/20'
                          : 'bg-zinc-800 text-white rounded-full shadow-lg shadow-black/20',
                        range_middle: isDark ? 'bg-white/10 text-white rounded-none' : 'bg-slate-100 text-zinc-800 rounded-none',
                        range_start: 'rounded-r-none',
                        range_end: 'rounded-l-none',
                        today: `${isDark ? 'text-white' : 'text-zinc-800'} font-bold ring-2 ring-white/50 ring-offset-2 ${
                          isDark ? 'ring-offset-[#0a0a0a]' : 'ring-offset-white'
                        }`,
                        disabled: isDark
                          ? 'text-red-400/50 line-through bg-red-500/10 rounded-full'
                          : 'text-red-400/50 line-through bg-red-50 rounded-full',
                        outside: isDark ? 'text-white/10' : 'text-slate-200',
                      }}
                    />
                  </div>
                )}

                {/* Legend */}
                <div className={`mt-4 flex flex-wrap gap-4 text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      isDark ? 'bg-gradient-to-br from-white/20 to-white/10' : 'bg-gradient-to-br from-zinc-600 to-zinc-700'
                    }`} />
                    <span>Terpilih</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-red-400 text-[8px] ${
                      isDark ? 'bg-red-500/30 line-through' : 'bg-red-100'
                    }`}>X</div>
                    <span>Tidak Tersedia</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                onClick={handleSewaSekarang}
                disabled={car.status !== 'tersedia'}
                whileHover={car.status === 'tersedia' ? { scale: 1.02 } : {}}
                whileTap={car.status === 'tersedia' ? { scale: 0.98 } : {}}
                className={`w-full relative overflow-hidden rounded-xl group transition-all ${
                  car.status !== 'tersedia' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {car.status === 'tersedia' ? (
                  <>
                    <div className={`absolute inset-0 transition-all duration-300 ${
                      isDark
                        ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 group-hover:from-white/20 group-hover:to-white/10'
                        : 'bg-gradient-to-r from-zinc-600 to-zinc-700 group-hover:from-white/20 group-hover:to-white/10'
                    }`} />
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 ${
                      isDark ? 'bg-gradient-to-r from-zinc-700 to-zinc-800' : 'bg-gradient-to-r from-zinc-600 to-zinc-700'
                    }`} />
                    <span className="relative flex items-center justify-center gap-2 py-4 text-white font-semibold">
                      Sewa Sekarang
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </>
                ) : (
                  <span className={`relative flex items-center justify-center gap-2 py-4 font-medium ${
                    isDark ? 'text-white/50' : 'text-slate-400'
                  }`}>
                    Mobil Tidak Tersedia
                  </span>
                )}
              </motion.button>

              {/* Trust badges */}
              <div className={`mt-6 pt-4 ${isDark ? 'border-t border-white/10' : 'border-t border-slate-200'}`}>
                <div className={`flex items-center justify-center gap-6 text-xs ${
                  isDark ? 'text-white/40' : 'text-slate-500'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Asuransi Incl.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={14} className={isDark ? 'text-white/60' : 'text-white/60'} />
                    <span>Ter-verifikasi</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .kerental-daypicker {
          --rdp-cell-size: 40px;
          --rdp-accent-color: #888888;
          --rdp-background-color: #1e3a5f;
        }
        .kerental-daypicker .rdp-months {
          justify-content: center;
        }
        .kerental-daypicker .rdp-month {
          background: transparent;
        }
        .kerental-daypicker .rdp-caption {
          padding: 0 0 12px 0;
        }
        .kerental-daypicker .rdp-nav {
          gap: 8px;
        }
        .kerental-daypicker .rdp-button:hover:not([disabled]) {
          background: rgba(59, 130, 246, 0.2);
        }
        .kerental-daypicker .rdp-button[disabled] {
          background: rgba(239, 68, 68, 0.1);
          color: rgba(239, 68, 68, 0.6);
          text-decoration: line-through;
        }
        .kerental-daypicker .rdp-head_cell {
          padding-bottom: 8px;
        }
      `}</style>
    </main>
  );
}
