import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Clock, MapPin, Sparkles } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STATS = [
  { value: 500, suffix: '+', label: 'Armada' },
  { value: 24, suffix: '/7', label: 'Dukungan' },
  { value: 40, suffix: '+', label: 'Lokasi' },
  { value: 98, suffix: '%', label: 'Kepuasan' },
];

const FEATURES = [
  {
    num: '01',
    icon: ShieldCheck,
    title: 'Asuransi Lengkap',
    desc: 'Setiap sewa sudah termasuk asuransi komprehensif, tanpa biaya tersembunyi untuk ketenangan perjalanan Anda.',
  },
  {
    num: '02',
    icon: Clock,
    title: 'Booking Instan',
    desc: 'Proses pemesanan selesai dalam waktu kurang dari 2 menit, armada siap digunakan pada hari yang sama.',
  },
  {
    num: '03',
    icon: MapPin,
    title: 'Lokasi Fleksibel',
    desc: 'Layanan penjemputan dan pengembalian armada tersedia di lebih dari 40 lokasi strategis berbagai kota.',
  },
  {
    num: '04',
    icon: Sparkles,
    title: 'Periksa Detail',
    desc: 'Setiap armada melalui proses sanitasi ketat dan inspeksi mekanis menyeluruh sebelum diserahkan.',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useGSAP(
    () => {
      // Counter animation
      statRefs.current.forEach((el, i) => {
        if (!el) return;
        const target = STATS[i].value;
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
          onUpdate: () => {
            el.textContent = Math.round(counter.val).toString();
          },
        });
      });

      // Card fade-in animation
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              once: true,
            },
          }
        );
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className={`relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 ${
        isDark ? 'bg-[#141419]' : 'bg-[#F9EFE8]'
      }`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className={`text-sm tracking-widest font-medium uppercase mb-3 ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Kenapa Kami
          </p>
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Mengapa KerenTal?
          </h2>
          <p className={`text-base max-w-xl mx-auto ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Komitmen kami untuk memberikan pengalaman sewa mobil terbaik tanpa kompromi.
          </p>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 rounded-2xl p-6 ${
          isDark
            ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
            : 'bg-white/80 backdrop-blur-xl border border-white/80'
        }`}>
          {STATS.map((stat, i) => (
            <div key={stat.label} className="text-center py-4">
              <div className={`text-3xl md:text-4xl font-bold tracking-tighter flex items-baseline justify-center gap-1 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                <span ref={(el) => { statRefs.current[i] = el; }}>0</span>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>{stat.suffix}</span>
              </div>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              }`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                ref={(el) => { cardRefs.current[index] = el; }}
                className={`
                  relative p-6 md:p-8 rounded-2xl overflow-hidden
                  ${isDark
                    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
                    : 'bg-white/80 backdrop-blur-xl border border-white/80'
                  }
                `}
              >
                {/* Top highlight */}
                <div className={`
                  absolute top-0 left-4 right-4 h-px
                  ${isDark
                    ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-white/90 to-transparent'
                  }
                `} />

                <div className="flex flex-col gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${isDark ? 'bg-white/[0.05]' : 'bg-zinc-100'}
                  `}>
                    <Icon className={`w-6 h-6 ${isDark ? 'text-white' : 'text-zinc-700'}`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
