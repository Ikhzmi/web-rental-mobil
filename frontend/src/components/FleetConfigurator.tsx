import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { MoreVertical, ChevronLeft, ChevronRight, Car, Sparkles } from 'lucide-react';
import { api, type Kategori } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import FleetArcMenu from './FleetArcMenu';
import FleetGrid from './FleetGrid';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(useGSAP);

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

function SteeringWheelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 5.4V9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.2 15.3 10 13.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.8 15.3 14 13.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function FleetConfigurator() {
  const [activeIndex, setActiveIndex] = useState(0);
  // displayedIndex = what's actually rendered (lags behind activeIndex by one animation phase)
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [rotation, setRotation] = useState(0);

  const rotationRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const carLayerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const carStageRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const isAnimating = useRef(false);

  // Touch/pointer gesture tracking for left-swipe only
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: allCars, isLoading } = useQuery({
    queryKey: ['cars', 'all'],
    queryFn: () => api.listCars({}),
  });

  // Filter hanya yang tersedia
  const availableCars = allCars?.filter(car => car.status === 'tersedia') || [];
  const activeCar = availableCars[displayedIndex];

  useGSAP(
    () => {
      const el = carLayerRef.current;
      if (!el) return;

      if (isFirstRender.current) {
        isFirstRender.current = false;
        setDisplayedIndex(activeIndex);
        gsap.set(el, { xPercent: 0, opacity: 1 });
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          fullMotion: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };
          if (reduceMotion) {
            setDisplayedIndex(activeIndex);
            gsap.set(el, { xPercent: 0, opacity: 1 });
            isAnimating.current = false;
            return;
          }
          const tl = gsap.timeline({
            onComplete: () => { isAnimating.current = false; },
          });
          tl.to(el, { xPercent: -70, opacity: 0, duration: 0.38, ease: 'power1.in' })
            .call(() => {
              // Swap content mid-animation — only after slide-out completes
              setDisplayedIndex(activeIndex);
            })
            .set(el, { xPercent: 70 })
            .to(el, { xPercent: 0, opacity: 1, duration: 0.55, ease: 'power2.out' });
        }
      );

      return () => mm.revert();
    },
    { dependencies: [activeIndex], scope: sectionRef }
  );

  // Touch gesture: left-swipe only → go to next car
  useEffect(() => {
    const el = carStageRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      // Only trigger if predominantly horizontal and moving LEFT
      if (Math.abs(dx) > Math.abs(dy) && dx < -50 && !isAnimating.current) {
        isAnimating.current = true;
        setActiveIndex((i) => (i + 1) % availableCars.length);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [availableCars.length]);

  const animate = useCallback(() => {
    const diff = targetRef.current - rotationRef.current;
    if (Math.abs(diff) > 0.05) {
      rotationRef.current += diff * 0.15;
      setRotation(rotationRef.current);
      rafRef.current = requestAnimationFrame(animate);
    } else {
      rotationRef.current = targetRef.current;
      setRotation(targetRef.current);
      rafRef.current = null;
    }
  }, []);

  const bumpTarget = useCallback(
    (delta: number) => {
      targetRef.current += delta;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);
    },
    [animate]
  );

  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;

    let isHovering = false;

    const handleWheel = (e: WheelEvent) => {
      if (!isHovering) return;
      e.preventDefault();
      e.stopPropagation();
      bumpTarget(-e.deltaY * 0.1);
    };

    const handleMouseEnter = () => {
      isHovering = true;
      document.body.style.overflow = 'hidden';
    };

    const handleMouseLeave = () => {
      isHovering = false;
      document.body.style.overflow = '';
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.overflow = '';
    };
  }, [bumpTarget]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const openMenu = () => {
    setMenuOpen(true);
    const target = -activeIndex * 26;
    targetRef.current = target;
    rotationRef.current = target;
    setRotation(target);
  };

  const selectCar = (index: number) => {
    setActiveIndex(index);
    setShowGrid(false);
  };

  const goPrev = () => {
    if (availableCars.length === 0) return;
    setActiveIndex((i) => (i - 1 + availableCars.length) % availableCars.length);
  };
  const goNext = () => {
    if (availableCars.length === 0) return;
    setActiveIndex((i) => (i + 1) % availableCars.length);
  };

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <section
        className={`relative w-full min-h-[60vh] overflow-hidden py-20 ${
          isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-zinc-100 via-zinc-50 to-white'
        }`}
      >
        <div className="px-5 sm:px-10 md:px-14 max-w-6xl mx-auto">
          {/* Skeleton top bar */}
          <div className="flex items-start justify-between mb-10">
            <div className="space-y-2">
              <div className={`h-3 w-28 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
              <div className={`h-10 w-56 rounded-2xl animate-pulse ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
              <div className={`h-3 w-20 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
            </div>
            <div className="space-y-2 text-right">
              <div className={`h-8 w-36 rounded-2xl animate-pulse ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
              <div className={`h-3 w-16 rounded-full animate-pulse ml-auto ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
            </div>
          </div>
          {/* Skeleton car stage */}
          <div className={`h-[38vh] sm:h-[46vh] md:h-[52vh] rounded-3xl animate-pulse ${isDark ? 'bg-white/[0.04]' : 'bg-zinc-200'}`} />
          {/* Skeleton controls */}
          <div className="flex justify-center gap-3 mt-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full animate-pulse ${
                i === 2
                  ? isDark ? 'w-5 bg-white/20' : 'w-5 bg-zinc-400'
                  : isDark ? 'w-1.5 bg-white/10' : 'w-1.5 bg-zinc-300'
              }`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // --- Empty state (no approved+available cars) ---
  if (availableCars.length === 0) {
    return (
      <section
        className={`relative w-full min-h-[60vh] overflow-hidden py-20 flex items-center justify-center ${
          isDark ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-zinc-100 via-zinc-50 to-white'
        }`}
      >
        {/* Soft glow blob */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: '60%',
            height: '60%',
            background: isDark
              ? 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(37,99,235,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-md mx-auto">
          {/* Icon ring */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div
              className={`w-28 h-28 rounded-full border-2 flex items-center justify-center ${
                isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-200 bg-white/60'
              }`}
            >
              <Car
                size={44}
                className={`${
                  isDark ? 'text-white/20' : 'text-zinc-300'
                }`}
                strokeWidth={1.2}
              />
            </div>
            {/* Orbiting sparkle */}
            <div
              className={`absolute -top-1 -right-1 w-8 h-8 rounded-full border flex items-center justify-center ${
                isDark
                  ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
                  : 'bg-blue-50 border-blue-200 text-blue-400'
              }`}
            >
              <Sparkles size={14} />
            </div>
          </div>

          <h2
            className={`font-playfair italic text-2xl sm:text-3xl mb-3 ${
              isDark ? 'text-white/80' : 'text-zinc-800'
            }`}
          >
            Armada Segera Hadir
          </h2>
          <p
            className={`text-sm leading-relaxed ${
              isDark ? 'text-white/40' : 'text-zinc-500'
            }`}
          >
            Saat ini belum ada kendaraan yang tersedia untuk ditampilkan.
            Silakan cek kembali nanti atau hubungi kami untuk informasi lebih lanjut.
          </p>

          {/* Decorative dashes */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`rounded-full ${
                  i === 2
                    ? isDark ? 'w-5 h-1.5 bg-white/30' : 'w-5 h-1.5 bg-zinc-400'
                    : isDark ? 'w-1.5 h-1.5 bg-white/15' : 'w-1.5 h-1.5 bg-zinc-300'
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`relative w-full min-h-[100vh] overflow-hidden py-20 ${
        isDark
          ? 'bg-[#0a0a0a]'
          : 'bg-gradient-to-b from-zinc-100 via-zinc-50 to-white'
      }`}
    >
      {/* Soft radial glow behind the car */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '70%',
          height: '55%',
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0) 70%)',
        }}
      />

      <div className="px-5 sm:px-10 md:px-14">
        {/* Top bar: model info + price */}
        <div className="relative z-20 flex items-start justify-between max-w-6xl mx-auto mb-6">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>Armada Tersedia</p>
            <h2 className={`font-playfair italic text-3xl sm:text-4xl md:text-5xl ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {activeCar.nama}
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-zinc-500'}`}>
              {KATEGORI_LABEL[activeCar.kategori]}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl sm:text-3xl font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {formatRupiah(Number(activeCar.hargaPerHari))}
            </p>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>per day</p>
          </div>
        </div>

        {!showGrid ? (
          <>
            {/* Car stage */}
            <div className="relative z-10 h-[38vh] sm:h-[46vh] md:h-[52vh] max-w-6xl mx-auto">
              {/* Static round platform */}
              <div
                className="absolute left-1/2 bottom-[4%] -translate-x-1/2 pointer-events-none"
                style={{
                  width: '58%',
                  maxWidth: 520,
                  aspectRatio: '3.2 / 1',
                  background: isDark
                    ? 'radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0) 75%)'
                    : 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.02) 45%, rgba(37,99,235,0) 75%)',
                  borderRadius: '50%',
                }}
              />
              <div
                className={`absolute left-1/2 bottom-[4%] -translate-x-1/2 pointer-events-none border ${
                  isDark ? 'border-white/10' : 'border-zinc-200/50'
                }`}
                style={{
                  width: '58%',
                  maxWidth: 520,
                  aspectRatio: '3.2 / 1',
                  borderRadius: '50%',
                }}
              />

              {/* Car image */}
              <div
                ref={carLayerRef}
                className="absolute inset-0 bg-contain bg-bottom bg-no-repeat"
                style={{
                  backgroundImage: activeCar.images && activeCar.images.length > 0
                    ? `url(${activeCar.images[0].url})`
                    : 'none',
                }}
              />
            </div>

            {/* Prev / next controls */}
            <div className="relative z-20 flex items-center justify-center gap-6 mt-4">
              <button
                onClick={goPrev}
                className={`transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                aria-label="Previous car"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="flex items-center gap-1.5">
                {availableCars.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex
                        ? isDark ? 'w-5 bg-white' : 'w-5 bg-zinc-800'
                        : isDark ? 'w-1.5 bg-white/25' : 'w-1.5 bg-zinc-300'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={goNext}
                className={`transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                aria-label="Next car"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {/* CTA */}
            <div className="relative z-20 flex justify-center mt-8">
              <Link
                to={`/armada/${activeCar.id}`}
                className="bg-white text-zinc-900 hover:bg-zinc-100 text-sm font-medium px-9 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-black/10"
              >
                Booking Sekarang
              </Link>
            </div>
          </>
        ) : (
          <div className="relative z-20 py-6">
            <FleetGrid cars={availableCars} activeIndex={activeIndex} onSelect={selectCar} />
            <div className="flex justify-center mt-8">
              <Link
                to="/armada"
                className="bg-white text-zinc-900 hover:bg-zinc-100 text-sm font-medium px-9 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-black/10"
              >
                Booking Sekarang
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Icon stack + arc menu */}
      <div className={`absolute right-5 md:right-8 top-1/2 -translate-y-1/2 z-[95] flex flex-col items-center gap-5 ${
        isDark ? 'text-white' : 'text-zinc-700'
      }`}>
        <div
          ref={wheelContainerRef}
          onMouseEnter={openMenu}
          onMouseLeave={() => setMenuOpen(false)}
          onClick={() => {
            if (menuOpen) {
              setMenuOpen(false);
            } else {
              openMenu();
            }
          }}
          className="relative flex flex-col items-center cursor-pointer"
        >
          <div className="relative flex items-center">
            <span
              className={`absolute right-full mr-2.5 whitespace-nowrap rounded-full backdrop-blur-md border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                isDark
                  ? 'bg-white/10 border-white/15 text-white'
                  : 'bg-white/80 border-zinc-200/50 text-zinc-700'
              } ${
                menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
              }`}
            >
              Pilih Armada
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (menuOpen) {
                  setMenuOpen(false);
                } else {
                  openMenu();
                }
              }}
              className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                menuOpen
                  ? isDark
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/50 border-zinc-300/50 text-zinc-800'
                  : isDark
                    ? 'bg-white/5 border-white/15 text-white/70 hover:text-white'
                    : 'bg-white/30 border-zinc-200/30 text-zinc-600 hover:text-zinc-800'
              }`}
              aria-label="Pilih armada"
            >
              <SteeringWheelIcon className="w-5 h-5" />
            </button>
          </div>

          <FleetArcMenu
            cars={availableCars}
            activeIndex={activeIndex}
            visible={menuOpen}
            rotation={rotation}
            onSelect={selectCar}
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowGrid((v) => !v);
          }}
          className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors z-50 ${
            showGrid
              ? isDark
                ? 'bg-white/15 border-white/30 text-white'
                : 'bg-white/50 border-zinc-300/50 text-zinc-800'
              : isDark
                ? 'bg-white/5 border-white/15 text-white/70 hover:text-white'
                : 'bg-white/30 border-zinc-200/30 text-zinc-600 hover:text-zinc-800'
          }`}
          aria-label="Tampilkan seluruh armada"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

    </section>
  );
}
