import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Car, CreditCard, Key, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const steps = [
  {
    number: 1,
    icon: Car,
    title: 'Pilih Mobil',
    description: 'Pilih armada sesuai kebutuhan dan budget Anda',
  },
  {
    number: 2,
    icon: CreditCard,
    title: 'Isi Data & Bayar',
    description: 'Lengkapi data penyewa dan lakukan pembayaran',
  },
  {
    number: 3,
    icon: Key,
    title: 'Ambil Mobil',
    description: 'Terima mobil di lokasi atau minta antar-jemput',
  },
  {
    number: 4,
    icon: MapPin,
    title: 'Nikmati Perjalanan',
    description: 'Berkendara dengan tenang, mobil sudah diasuransikan',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useGSAP(
    () => {
      const stepCards = sectionRef.current?.querySelectorAll('.step-card');
      if (!stepCards) return;

      gsap.fromTo(
        stepCards,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      );

      // Animate step numbers with scale
      const numbers = sectionRef.current?.querySelectorAll('.step-number');
      if (numbers) {
        gsap.fromTo(
          numbers,
          { scale: 0.5, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: 'back.out(2)',
            stagger: 0.1,
            delay: 0.2,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
              once: true,
            },
          }
        );
      }
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
      {/* Background decoration - subtle grid */}
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
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Cara Booking
          </h2>
          <p className={`text-base max-w-md mx-auto ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Sewa mobil dalam 4 langkah mudah
          </p>
        </div>

        {/* Steps */}
        <div ref={stepsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="step-card relative">
                {/* Glass card */}
                <div className={`
                  relative p-6 rounded-2xl overflow-hidden
                  ${isDark
                    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
                    : 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm'
                  }
                `}>
                  {/* Top highlight edge */}
                  <div className={`
                    absolute top-0 left-4 right-4 h-px
                    ${isDark
                      ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                      : 'bg-gradient-to-r from-transparent via-white/90 to-transparent'
                    }
                  `} />

                  {/* Number badge */}
                  <div className={`
                    step-number w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-4
                    ${isDark
                      ? 'bg-white/10 text-white/80 border border-white/10'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                    }
                  `}>
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`
                    w-11 h-11 rounded-xl flex items-center justify-center mb-4
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
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed ${
                    isDark ? 'text-zinc-500' : 'text-zinc-500'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full lg:hidden ${
                    isDark ? 'bg-white/30' : 'bg-zinc-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link
            to="/armada"
            className={`
              group inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm
              transition-all duration-200 hover:scale-105 active:scale-95
              ${isDark
                ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }
            `}
          >
            Lihat Armada Tersedia
          </Link>
        </div>
      </div>
    </section>
  );
}
