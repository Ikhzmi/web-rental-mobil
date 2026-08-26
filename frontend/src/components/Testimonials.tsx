import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, ChevronLeft, ChevronRight, Quote, MessageSquareHeart } from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import { AmbientGlow, RouteWaypoint } from './decor/RouteMotifs';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Ulasan ASLI dari customer yang sudah selesai sewa (lihat reviews.routes.ts
  // & AkunPesananDetailPage.tsx) — sebelumnya section ini isinya data statis
  // hardcode (nama fiktif, foto stok), sekarang diganti total.
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['featured-reviews'],
    queryFn: () => api.listFeaturedReviews(),
    staleTime: 5 * 60 * 1000,
  });

  const list = reviews ?? [];

  // Auto-rotate
  useEffect(() => {
    if (isPaused || list.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % list.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, list.length]);

  // GSAP animations
  useGSAP(
    () => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef, dependencies: [list.length] }
  );

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % list.length);
  };

  const active = list[activeIndex];

  return (
    <section
      ref={sectionRef}
      className={`relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 ${
        isDark ? 'bg-[#141419]' : 'bg-[#F9EFE8]'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
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
        <AmbientGlow isDark={isDark} position="top-left" size="lg" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <RouteWaypoint isDark={isDark} />
          <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Apa Kata Pelanggan Kami
          </h2>
          <p className={`text-base ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Ulasan asli dari penyewa yang sudah selesai menyewa
          </p>
        </div>

        {isLoading ? (
          <div className={`rounded-2xl p-8 md:p-10 animate-pulse ${isDark ? 'bg-white/[0.03]' : 'bg-white/60'}`}>
            <div className={`h-4 w-32 rounded mb-6 ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
            <div className={`h-5 w-full rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
            <div className={`h-5 w-2/3 rounded ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
          </div>
        ) : list.length === 0 ? (
          /* Belum ada ulasan sama sekali — daripada dikosongkan begitu
             saja atau dipaksa isi data palsu, tampilkan pesan jujur.
             Bagian ini otomatis terisi begitu ada penyewa yang menulis
             ulasan setelah masa sewanya selesai. */
          <div className={`text-center rounded-2xl p-10 md:p-12 ${
            isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white/60 border border-white/80'
          }`}>
            <MessageSquareHeart size={28} className={`mx-auto mb-3 ${isDark ? 'text-white/25' : 'text-zinc-300'}`} />
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-zinc-500'}`}>
              Belum ada ulasan — jadilah yang pertama menyewa dan berbagi pengalamanmu.
            </p>
          </div>
        ) : (
          <>
            {/* Testimonial Card - Glass */}
            <div ref={cardRef}>
              <div className={`
                relative p-8 md:p-10 rounded-2xl overflow-hidden
                ${isDark
                  ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
                  : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-sm'
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

                <Quote
                  aria-hidden="true"
                  size={96}
                  strokeWidth={1}
                  className={`absolute -top-2 right-4 -scale-x-100 pointer-events-none select-none ${
                    isDark ? 'text-white/[0.05]' : 'text-zinc-900/[0.04]'
                  }`}
                />

                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < active.rating
                        ? 'fill-zinc-400 text-zinc-400'
                        : isDark ? 'text-zinc-700' : 'text-zinc-300'
                      }
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className={`text-lg md:text-xl leading-relaxed mb-8 ${
                  isDark ? 'text-white/90' : 'text-zinc-800'
                }`}>
                  "{active.komentar}"
                </p>

                {/* Author — avatar inisial, bukan foto stok, karena ini
                    data ulasan asli (tidak ada foto profil di sistem) */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold shrink-0 ${
                    isDark ? 'bg-white/10 text-white/80 border-2 border-white/10' : 'bg-zinc-100 text-zinc-600 border-2 border-zinc-200'
                  }`}>
                    {(active.profile?.nama ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                      {active.profile?.nama ?? 'Pelanggan'}
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    }`}>
                      {active.car?.nama ?? '-'} · {formatReviewDate(active.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation — cuma tampil kalau ulasan lebih dari satu */}
            {list.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={goToPrev}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                    ${isDark
                      ? 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-400 hover:text-white'
                      : 'bg-white/80 hover:bg-white border border-white/80 text-zinc-600 hover:text-zinc-900 shadow-sm'
                    }
                  `}
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-2">
                  {list.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === activeIndex
                          ? isDark ? 'w-6 bg-white/50' : 'w-6 bg-zinc-800'
                          : isDark ? 'w-2 bg-white/20' : 'w-2 bg-zinc-300'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNext}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                    ${isDark
                      ? 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-400 hover:text-white'
                      : 'bg-white/80 hover:bg-white border border-white/80 text-zinc-600 hover:text-zinc-900 shadow-sm'
                    }
                  `}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}