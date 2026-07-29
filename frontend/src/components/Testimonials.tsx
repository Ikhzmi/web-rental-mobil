import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const testimonials = [
  {
    id: 1,
    name: 'Budi Santoso',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    text: 'Pelayanan sangat memuaskan! Mobil yang saya sewa dalam kondisi prima dan bersih. Proses booking juga sangat mudah.',
    vehicle: 'Toyota Avanza',
    date: 'Juni 2024',
  },
  {
    id: 2,
    name: 'Siti Rahayu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    text: 'Sudah 3 kali sewa mobil di KerenTal Kita dan tidak pernah kecewa. Armada terawat dan tim support sangat responsif.',
    vehicle: 'Honda CR-V',
    date: 'Mei 2024',
  },
  {
    id: 3,
    name: 'Ahmad Wijaya',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    text: 'Booking untuk keluarga besar saat mudik kemarin berjalan lancar. Mobilnya nyaman dan antar jemput di bandara tepat waktu.',
    vehicle: 'Mitsubishi Xpander',
    date: 'April 2024',
  },
  {
    id: 4,
    name: 'Dewi Kusuma',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    text: 'Penyewaan pertama saya dan pasti akan repeat order. Prosesnya simple dan harganya worth it!',
    vehicle: 'Toyota Camry',
    date: 'Juli 2024',
  },
  {
    id: 5,
    name: 'Rudi Hermawan',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    text: 'KerenTal Kita cocok untuk bisnis travel kami. Armadanya lengkap dan selalu dalam kondisi siap pakai.',
    vehicle: 'Toyota Alphard',
    date: 'Juni 2024',
  },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

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
    { scope: sectionRef }
  );

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const active = testimonials[activeIndex];

  return (
    <section
      ref={sectionRef}
      className={`relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 ${
        isDark ? 'bg-zinc-950' : 'bg-zinc-100'
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
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Apa Kata Pelanggan Kami
          </h2>
          <p className={`text-base ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Lebih dari 10.000+ pelanggan puas
          </p>
        </div>

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
              "{active.text}"
            </p>

            {/* Author */}
            <div className="flex items-center gap-4">
              <img
                src={active.avatar}
                alt={active.name}
                className={`w-12 h-12 rounded-full object-cover ${
                  isDark ? 'border-2 border-white/10' : 'border-2 border-zinc-200'
                }`}
              />
              <div>
                <p className={`font-medium ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  {active.name}
                </p>
                <p className={`text-sm ${
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}>
                  {active.vehicle} - {active.date}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
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
            {testimonials.map((_, idx) => (
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
      </div>
    </section>
  );
}
