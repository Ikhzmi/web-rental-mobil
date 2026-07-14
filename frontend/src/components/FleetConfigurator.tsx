import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { FLEET_CARS } from '../data/fleet';
import FleetArcMenu from './FleetArcMenu';
import FleetGrid from './FleetGrid';

gsap.registerPlugin(useGSAP);

const ANGLE_STEP = 26;

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
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const activeCar = FLEET_CARS[activeIndex];

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

  // Smooth easing loop toward the target wheel rotation (inertia feel).
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
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      bumpTarget(-e.deltaY * 0.08); 
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNative);
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
    const target = -activeIndex * ANGLE_STEP;
    targetRef.current = target;
    rotationRef.current = target;
    setRotation(target);
  };

  const selectCar = (index: number) => {
    setActiveIndex(index);
    setShowGrid(false);
  };

  const goPrev = () => setActiveIndex((i) => (i - 1 + FLEET_CARS.length) % FLEET_CARS.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % FLEET_CARS.length);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100vh] bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] overflow-hidden py-20"
    >
      {/* soft radial glow behind the car for silhouette contrast */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '70%',
          height: '55%',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      {/* Padded content wrapper — kept separate from the section's own box
          so the icon stack / arc menu below can measure "right" from the
          section's true edge, unaffected by this inner padding. */}
      <div className="px-5 sm:px-10 md:px-14">
        {/* Top bar: model info + price */}
        <div className="relative z-20 flex items-start justify-between max-w-6xl mx-auto mb-6">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Our Fleet</p>
            <h2 className="font-playfair italic text-white text-3xl sm:text-4xl md:text-5xl">
              {activeCar.model}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {activeCar.brand} &middot; {activeCar.tagline}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white text-2xl sm:text-3xl font-medium">{activeCar.pricePerDay}</p>
            <p className="text-white/40 text-xs">per day</p>
          </div>
        </div>

        {!showGrid ? (
          <>
            {/* Car stage */}
            <div className="relative z-10 h-[38vh] sm:h-[46vh] md:h-[52vh] max-w-6xl mx-auto">
              {/* Static round platform — does NOT slide with the car */}
              <div
                className="absolute left-1/2 bottom-[4%] -translate-x-1/2 pointer-events-none"
                style={{
                  width: '58%',
                  maxWidth: 520,
                  aspectRatio: '3.2 / 1',
                  background:
                    'radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0) 75%)',
                  borderRadius: '50%',
                }}
              />
              <div
                className="absolute left-1/2 bottom-[4%] -translate-x-1/2 pointer-events-none border border-white/10"
                style={{
                  width: '58%',
                  maxWidth: 520,
                  aspectRatio: '3.2 / 1',
                  borderRadius: '50%',
                }}
              />

              <div
                ref={carLayerRef}
                className="absolute inset-0 bg-contain bg-bottom bg-no-repeat"
                style={{ backgroundImage: `url(${activeCar.image})` }}
              />
            </div>

            {/* Prev / next controls */}
            <div className="relative z-20 flex items-center justify-center gap-6 mt-4">
              <button
                onClick={goPrev}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Previous car"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="flex items-center gap-1.5">
                {FLEET_CARS.map((car, i) => (
                  <span
                    key={car.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex ? 'w-5 bg-[#2563eb]' : 'w-1.5 bg-white/25'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={goNext}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Next car"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {/* CTA — arah ke /armada (bukan /armada/:id) karena FLEET_CARS
                di src/data/fleet.ts masih data mock untuk showcase, id-nya
                belum tentu match dengan record asli di database. Lihat
                catatan di HomePage soal keputusan showcase vs katalog. */}
            <div className="relative z-20 flex justify-center mt-8">
              <Link
                to="/armada"
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-9 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#2563eb]/30"
              >
                Booking Sekarang
              </Link>
            </div>
          </>
        ) : (
          <div className="relative z-20 py-6">
            <FleetGrid cars={FLEET_CARS} activeIndex={activeIndex} onSelect={selectCar} />
            <div className="flex justify-center mt-8">
              <Link
                to="/armada"
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-9 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#2563eb]/30"
              >
                Booking Sekarang
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Icon stack + arc menu — direct children of the section (not the
          padded wrapper above), positioned absolute so they stay scoped to
          THIS section only and scroll away with it. A shared wheel handler
          covers both the icon and the revealed menu, so scrolling here
          always rotates the wheel and never scrolls the page. */}
      <div className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 z-[95] flex flex-col items-center gap-5">
        {/* Arc menu & steering wheel wrap */}
        <div
          ref={scrollContainerRef}
          onMouseEnter={openMenu}
          onMouseLeave={() => setMenuOpen(false)}
          className="relative flex flex-col items-center"
        >
          <div className="relative flex items-center">
            <span
              className={`absolute right-full mr-2.5 whitespace-nowrap rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white transition-all duration-300 ${
                menuOpen
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-2 pointer-events-none'
              }`}
            >
              Pilih Armada
            </span>
            <button
              onClick={() => {
                if (menuOpen) {
                  setMenuOpen(false);
                } else {
                  openMenu();
                }
              }}
              className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                menuOpen
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/5 border-white/15 text-white/70 hover:text-white'
              }`}
              aria-label="Pilih armada"
            >
              <SteeringWheelIcon className="w-5 h-5" />
            </button>
          </div>

          <FleetArcMenu
            cars={FLEET_CARS}
            activeIndex={activeIndex}
            visible={menuOpen}
            rotation={rotation}
            onSelect={selectCar}
          />
        </div>

        {/* 3-dot menu button - outside the hover area of the steering wheel */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowGrid((v) => !v);
          }}
          className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors z-50 ${
            showGrid
              ? 'bg-white/15 border-white/30 text-white'
              : 'bg-white/5 border-white/15 text-white/70 hover:text-white'
          }`}
          aria-label="Tampilkan seluruh armada"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
