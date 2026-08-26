import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BadgeCheck, Wallet, Headset, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';
import carSolidImg from '../assets/car-solid.webp';
import carSolidLightImg from '../assets/car-solid-light.webp';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STATS = [
  { value: 500, suffix: '+', label: 'Unit Armada' },
  { value: 40, suffix: '+', label: 'Kota Layanan' },
  { value: 12000, suffix: '+', label: 'Pelanggan Puas' },
  { value: 5, suffix: ' Thn', label: 'Pengalaman' },
];

const VALUES = [
  {
    icon: Wallet,
    title: 'Harga Transparan',
    desc: 'Harga penuh tampil di muka sejak katalog — tanpa biaya tersembunyi yang baru muncul saat pembayaran.',
  },
  {
    icon: BadgeCheck,
    title: 'Unit Terverifikasi',
    desc: 'Setiap mobil diperiksa dan dibersihkan menyeluruh sebelum disewakan, statusnya bisa dipantau langsung dari akun kamu.',
  },
  {
    icon: Headset,
    title: 'Dukungan Cepat',
    desc: 'Tim kami siap membantu lewat WhatsApp untuk pertanyaan seputar booking, jadwal, maupun kendala di lapangan.',
  },
];

export default function TentangPage() {
  const revealRef = useScrollReveal<HTMLDivElement>();
  const cardsRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1 });
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const statsRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(
    () => {
      statRefs.current.forEach((el, i) => {
        if (!el) return;
        const target = STATS[i].value;
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: statsRef.current, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = Math.round(counter.val).toLocaleString('id-ID');
          },
        });
      });
    },
    { scope: statsRef }
  );

  const glassCard = isDark
    ? 'bg-white/[0.04] border border-white/10'
    : 'bg-white/60 border border-white/80 shadow-sm';

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div ref={revealRef} className="max-w-3xl mx-auto">
        <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          Tentang Kami
        </p>
        <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          KerenTal Kita
        </h1>
        <div className={`text-sm sm:text-base leading-relaxed space-y-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          <p>
            KerenTal Kita hadir untuk membuat proses sewa mobil terasa sederhana — tanpa
            telepon berkali-kali, tanpa harga yang berubah-ubah, dan tanpa was-was soal
            jadwal yang bentrok.
          </p>
          <p>
            Setiap unit di armada kami diperiksa dan dibersihkan sebelum disewakan. Kamu bisa
            melihat harga penuh di muka, memilih lepas kunci atau dengan sopir sesuai
            kebutuhan, dan memantau status pesanan langsung dari akun kamu.
          </p>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 rounded-2xl p-6 backdrop-blur-xl ${glassCard}`}
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="text-center py-2">
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-baseline justify-center gap-0.5 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                <span ref={(el) => { statRefs.current[i] = el; }}>0</span>
                <span className={isDark ? 'text-white/40' : 'text-slate-400'}>{stat.suffix}</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Kenapa pilih kami */}
        <div className="mt-10">
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Kenapa Pilih Kami
          </h2>
          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {VALUES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`relative rounded-2xl p-5 backdrop-blur-xl overflow-hidden ${glassCard}`}>
                  <div
                    className={`pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent to-transparent ${
                      isDark ? 'via-white/20' : 'via-white/90'
                    }`}
                  />
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      isDark ? 'bg-white/[0.06]' : 'bg-slate-900/[0.05]'
                    }`}
                  >
                    <Icon size={18} className={isDark ? 'text-white/80' : 'text-slate-700'} />
                  </div>
                  <p className={`text-sm font-semibold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </p>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 rounded-2xl p-6 backdrop-blur-xl ${glassCard}`}
        >
          <p className={`text-sm text-center sm:text-left ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
            Siap cari mobil yang pas untuk perjalanan kamu?
          </p>
          <Link
            to="/armada"
            className={`inline-flex items-center gap-1.5 shrink-0 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Lihat Armada Kami
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}