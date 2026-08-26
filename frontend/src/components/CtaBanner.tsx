import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { AmbientGlow } from './decor/RouteMotifs';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function CtaBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useGSAP(
    () => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 40, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      );

      gsap.fromTo(
        '.cta-content',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.2,
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

      <div className="relative max-w-2xl mx-auto">
        {/* Glass Card */}
        <div
          ref={cardRef}
          className={`
            relative rounded-3xl p-10 md:p-14 overflow-hidden
            ${isDark
              ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
              : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-sm'
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

          {/* Decorative corner glow — retinted hangat supaya sejalan
              dengan aksen emas yang dipakai di section lain */}
          <AmbientGlow isDark={isDark} position="top-right" size="lg" />
          <AmbientGlow isDark={isDark} position="bottom-left" size="sm" />

          <div className="relative text-center cta-content">
            {/* Badge */}
            <div className={`
              inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6
              ${isDark
                ? 'bg-white/[0.05] border border-white/[0.1] text-zinc-400'
                : 'bg-zinc-100 border border-zinc-200 text-zinc-600'
              }
            `}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Tersedia 24/7
            </div>

            {/* Heading */}
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              Siap Berpergian?
            </h2>

            {/* Subheading */}
            <p className={`text-base mb-10 max-w-md mx-auto ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              Booking sekarang dan dapatkan harga terbaik. Armada lengkap, harga transparan.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/armada"
                className={`
                  group relative px-8 py-3 rounded-full font-medium text-sm
                  transition-all duration-200 hover:scale-105 active:scale-95
                  ${isDark
                    ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }
                `}
              >
                Booking Sekarang
              </Link>

              <Link
                to="/kontak"
                className={`
                  px-8 py-3 rounded-full font-medium text-sm
                  transition-all duration-200 hover:scale-105 active:scale-95
                  ${isDark
                    ? 'border border-white/20 text-zinc-300 hover:text-white hover:border-white/30'
                    : 'border border-zinc-300 text-zinc-700 hover:text-zinc-900 hover:border-zinc-400'
                  }
                `}
              >
                Hubungi Kami
              </Link>
            </div>

            {/* Trust indicators */}
            <div className={`
              mt-12 flex flex-wrap items-center justify-center gap-5 text-xs
              ${isDark ? 'text-zinc-500' : 'text-zinc-500'}
            `}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Asuransi Terintegrasi
              </span>
              <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>|</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pembayaran Aman
              </span>
              <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>|</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Proses Cepat
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}