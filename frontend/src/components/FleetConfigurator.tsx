import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [rotation, setRotation] = useState(0);

  const rotationRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const carLayerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: allCars } = useQuery({
    queryKey: ['cars', 'all'],
    queryFn: () => api.listCars({}),
  });

  // Filter hanya yang tersedia
  const availableCars = allCars?.filter(car => car.status === 'tersedia') || [];
  const activeCar = availableCars[activeIndex];

  useGSAP(
    () => {
      const el = carLayerRef.current;
      if (!el) return;

      if (isFirstRender.current) {
        isFirstRender.current = false;
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
            gsap.set(el, { xPercent: 0, opacity: 1 });
            return;
          }
          const tl = gsap.timeline();
          tl.to(el, { xPercent: -70, opacity: 0, duration: 0.38, ease: 'power1.in' })
            .set(el, { xPercent: 70 })
            .to(el, { xPercent: 0, opacity: 1, duration: 0.55, ease: 'power2.out' });
        }
      );

      return () => mm.revert();
    },
    { dependencies: [activeIndex], scope: sectionRef }
  );

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

  if (!activeCar) {
    return (
      <section
        ref={sectionRef}
        className={`relative w-full min-h-[60vh] overflow-hidden py-20 ${
          isDark
            ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
            : 'bg-gradient-to-b from-zinc-100 via-zinc-50 to-white'
        }`}
      >
        <div className="flex items-center justify-center h-full">
          <p className={isDark ? 'text-white/50' : 'text-zinc-500'}>Memuat armada...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`relative w-full min-h-[100vh] overflow-hidden py-20 ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
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
                        ? 'w-5 bg-blue-500'
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
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-9 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-blue-500/30"
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
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-9 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-blue-500/30"
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

      {/* Mobile: Show car selector at bottom */}
      <div className="md:hidden fixed bottom-24 left-4 right-4 z-[95]">
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2">
          {availableCars.map((car, i) => (
            <button
              key={car.id}
              onClick={() => selectCar(i)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                i === activeIndex
                  ? 'bg-blue-500 text-white'
                  : isDark
                    ? 'bg-white/10 text-white/60 hover:bg-white/20'
                    : 'bg-white/80 text-zinc-600 hover:bg-white'
              }`}
            >
              {car.nama}
            </button>
          ))}
        </div>
        <p className={`text-center text-xs mt-2 ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>Tap tombol kemudi untuk pilih armada</p>
      </div>
    </section>
  );
}
