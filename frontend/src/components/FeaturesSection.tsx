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
    icon: ShieldCheck,
    title: 'Asuransi Lengkap',
    desc: 'Setiap sewa sudah termasuk asuransi komprehensif, tanpa biaya tersembunyi.',
  },
  {
    icon: Clock,
    title: 'Booking Instan',
    desc: 'Pesan dalam 2 menit, mobil siap diambil di hari yang sama.',
  },
  {
    icon: MapPin,
    title: 'Lokasi Fleksibel',
    desc: 'Ambil mobil di 40+ lokasi strategis di berbagai kota.',
  },
  {
    icon: Sparkles,
    title: 'Periksa Detail',
    desc: 'Setiap kendaraan dibersihkan dan dicek mesin sebelum disewa.',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);

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

      // Feature cards animation
      gsap.fromTo(
        '.feature-card',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className={`relative py-24 md:py-32 px-5 sm:px-10 md:px-16 ${
      isDark ? 'bg-zinc-950' : 'bg-white'
    }`}>
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

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Mengapa KerenTal?
          </h2>
          <p className={`text-base max-w-md mx-auto ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Komitmen kami untuk pengalaman sewa mobil terbaik
          </p>
        </div>

        {/* Stats - Glass card */}
        <div className={`relative mb-14 p-8 rounded-2xl overflow-hidden ${
          isDark
            ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
            : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-sm'
        }`}>
          {/* Top highlight */}
          <div className={`
            absolute top-0 left-4 right-4 h-px
            ${isDark
              ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/90 to-transparent'
            }
          `} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="text-center">
                <div className={`text-4xl md:text-5xl font-bold ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  <span ref={(el) => { statRefs.current[i] = el; }}>0</span>
                  <span className="text-zinc-500">{stat.suffix}</span>
                </div>
                <p className={`text-sm mt-2 ${
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Features - Glass cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="feature-card">
                <div className={`
                  relative p-6 rounded-2xl overflow-hidden
                  transition-transform duration-200 hover:-translate-y-1
                  ${isDark
                    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.12]'
                    : 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm hover:shadow-md'
                  }
                `}>
                  {/* Top highlight */}
                  <div className={`
                    absolute top-0 left-4 right-4 h-px
                    ${isDark
                      ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                      : 'bg-gradient-to-r from-transparent via-white/90 to-transparent'
                    }
                  `} />

                  {/* Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-5
                    ${isDark
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-zinc-50 border border-zinc-200'
                    }
                  `}>
                    <Icon size={22} className={isDark ? 'text-zinc-400' : 'text-zinc-600'} />
                  </div>

                  {/* Title */}
                  <h3 className={`font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed ${
                    isDark ? 'text-zinc-500' : 'text-zinc-500'
                  }`}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
