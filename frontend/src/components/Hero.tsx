import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import RevealLayer from './RevealLayer';
import backgroundImg from '../assets/background.webp';
import carSolidImg from '../assets/car-solid.webp';
import carSkeletonImg from '../assets/car-skeleton.webp';
import backgroundLightImg from '../assets/background-light.webp';
import carSolidLightImg from '../assets/car-solid-light.webp';
import carSkeletonLightImg from '../assets/car-skeleton-light.webp';

gsap.registerPlugin(useGSAP);

export default function Hero() {
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSamsungS8Plus, setIsSamsungS8Plus] = useState(false);
  const [isIphone11Pro, setIsIphone11Pro] = useState(false);
  const [isIphone14ProMax, setIsIphone14ProMax] = useState(false);
  const [_isIphone13Pro, setIsIphone13Pro] = useState(false);
  // const [isIphoneXR, setIsIphoneXR] = useState(false); // unused
  const [_isVivoY53s, setIsVivoY53s] = useState(false);
  const [isIpadMini, setIsIpadMini] = useState(false);
  const [isIpadAir, setIsIpadAir] = useState(false);
  const [isGalaxyTabS7, setIsGalaxyTabS7] = useState(false);
  const [isPocoM4Pro, setIsPocoM4Pro] = useState(false);
  const [_isItelS25, setIsItelS25] = useState(false);
  const [_isSamsungA14, setIsSamsungA14] = useState(false);
  const [showDebug] = useState(false); // Set true to enable debug overlay

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headingLine1 = useRef<HTMLSpanElement>(null);
  const headingLine2 = useRef<HTMLSpanElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const carSkeletonRef = useRef<HTMLDivElement>(null);
  const carShadowRef = useRef<HTMLDivElement>(null);
  const leftCopyRef = useRef<HTMLDivElement>(null);
  const rightCopyRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  // Resize listener for mobile adjustments (checks width only to prevent scroll-stretching)
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== lastWidth) {
        setIsMobile(currentWidth < 768);
        setIsSamsungS8Plus(currentWidth >= 320 && currentWidth < 360);
        setIsIphone11Pro(currentWidth >= 375 && currentWidth < 390);
        // iPhone 13 Pro: 390px only
        setIsIphone13Pro(currentWidth === 390);
        // Samsung Galaxy A14 5G: 384px
        setIsSamsungA14(currentWidth === 384);
        setIsPocoM4Pro(currentWidth >= 411 && currentWidth < 428);
        setIsIphone14ProMax(currentWidth >= 428 && currentWidth < 500);
        // Vivo Y53s: 392px only
        setIsVivoY53s(currentWidth === 392);
        // Itel S25: 360px only
        setIsItelS25(currentWidth === 360);
        setIsIpadMini(currentWidth >= 768 && currentWidth < 800);
        setIsGalaxyTabS7(currentWidth >= 800 && currentWidth < 840);
        setIsIpadAir(currentWidth >= 840 && currentWidth < 1024);
        lastWidth = currentWidth;
      }
    };
    setIsMobile(window.innerWidth < 768);
    setIsSamsungS8Plus(window.innerWidth >= 320 && window.innerWidth < 360);
    setIsIphone11Pro(window.innerWidth >= 375 && window.innerWidth < 390);
    // iPhone 13 Pro: 390px only
    setIsIphone13Pro(window.innerWidth === 390);
    // Samsung Galaxy A14 5G: 384px
    setIsSamsungA14(window.innerWidth === 384);
    setIsPocoM4Pro(window.innerWidth >= 411 && window.innerWidth < 428);
    setIsIphone14ProMax(window.innerWidth >= 428 && window.innerWidth < 500);
    // Vivo Y53s: 392px only
    setIsVivoY53s(window.innerWidth === 392);
    // Itel S25: 360px only
    setIsItelS25(window.innerWidth === 360);
    setIsIpadMini(window.innerWidth >= 768 && window.innerWidth < 800);
    setIsGalaxyTabS7(window.innerWidth >= 800 && window.innerWidth < 840);
    setIsIpadAir(window.innerWidth >= 840 && window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cursor & Touch tracking with eased lerp for the spotlight reveal.
  useEffect(() => {
    const updateCoordinates = (x: number, y: number) => {
      mouse.current.x = x;
      mouse.current.y = y;
      setHasInteracted(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateCoordinates(e.clientX, e.clientY);
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });

    const loop = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Single GSAP-orchestrated entrance timeline — background Ken Burns zoom,
  // heading reveal, copy fade-up, and the scroll hint are all one sequence
  // now (previously the background zoom lived in a separate CSS keyframe).
  // useGSAP() auto-cleans on unmount, so no manual ctx.revert() needed.
  // gsap.matchMedia() swaps in an instant, no-motion version of the same
  // timeline when the user has requested reduced motion at the OS level.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          fullMotion: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

          tl.set(
            [
              bgRef.current,
              headingLine1.current,
              headingLine2.current,
              carRef.current,
              carShadowRef.current,
              leftCopyRef.current,
              rightCopyRef.current,
              scrollHintRef.current,
            ],
            { opacity: 0 }
          ).set(bgRef.current, { scale: reduceMotion ? 1 : 1.12 });

          if (reduceMotion) {
            // Respect the user's OS-level preference: snap everything to
            // its resting state instead of animating.
            tl.set(
              [
                bgRef.current,
                headingLine1.current,
                headingLine2.current,
                carRef.current,
                carShadowRef.current,
                leftCopyRef.current,
                rightCopyRef.current,
                scrollHintRef.current,
              ],
              { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
            );
            return;
          }

          tl.to(bgRef.current, { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' })
            .to(
              [carRef.current, carShadowRef.current],
              { opacity: 1, duration: 1.4, ease: 'power2.out' },
              '-=1.5'
            )
            .fromTo(
              headingLine1.current,
              { y: 34, filter: 'blur(14px)', opacity: 0 },
              { y: 0, filter: 'blur(0px)', opacity: 1, duration: 1.1 },
              '-=1.1'
            )
            .fromTo(
              headingLine2.current,
              { y: 34, filter: 'blur(14px)', opacity: 0 },
              { y: 0, filter: 'blur(0px)', opacity: 1, duration: 1.1 },
              '-=0.85'
            )
            .fromTo(
              leftCopyRef.current,
              { y: 24, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.9 },
              '-=0.5'
            )
            .fromTo(
              rightCopyRef.current,
              { y: 24, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.9 },
              '-=0.7'
            )
            .fromTo(
              scrollHintRef.current,
              { y: -10, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.8 },
              '-=0.4'
            );

          // Gentle idle bounce for the scroll hint.
          gsap.to(scrollHintRef.current, {
            y: 8,
            duration: 1.4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: 2.4,
          });
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  // Direct width check for reliable styling (bypasses state delay)
  const currentWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  // Direct device detection - exact widths
  const isVivoY53sActive = currentWidth === 392;
  const isIphone13ProActive = currentWidth === 390;
  const isItelS25Active = currentWidth === 360;
  const isSamsungA14Active = currentWidth === 384;

  const carBgPosition = isSamsungA14Active ? 'center bottom 50%' : isItelS25Active ? 'center bottom 42%' : isVivoY53sActive ? 'center bottom 51%' : isIphone13ProActive ? 'center bottom 48%' : isPocoM4Pro ? 'center bottom 51%' : isGalaxyTabS7 ? 'center bottom 31%' : isIpadAir ? 'center bottom 26%' : isIpadMini ? 'center bottom 15%' : isMobile ? 'center bottom 36%' : 'center bottom -130px';
  const carBgSize = (isMobile || isIpadMini || isIpadAir || isGalaxyTabS7 || isPocoM4Pro) ? '165%' : 'contain';
  const shadowBottom = isSamsungA14Active ? '30%' : isItelS25Active ? '28%' : isVivoY53sActive ? '31%' : isIphone13ProActive ? '26%' : isPocoM4Pro ? '29%' : isGalaxyTabS7 ? '45%' : isIpadAir ? '55%' : isIpadMini ? '60%' : isMobile ? '33%' : '12%';
  const shadowWidth = (isMobile || isIpadMini || isIpadAir || isGalaxyTabS7 || isPocoM4Pro) ? '70%' : '55%';

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-black"
      style={{ height: '100vh' }}
    >
      {/* DEBUG: Show which device state is active */}
      {showDebug && (
        <div className="absolute top-4 left-4 z-[100] bg-black/80 text-white text-xs p-2 rounded font-mono">
          <div>Width: {typeof window !== 'undefined' ? window.innerWidth : '?'}px</div>
          <div>SamsungA14: {isSamsungA14Active ? 'YES' : 'no'}</div>
          <div>ItelS25: {isItelS25Active ? 'YES' : 'no'}</div>
          <div>S8+: {isSamsungS8Plus ? 'YES' : 'no'}</div>
          <div>VivoY53s: {isVivoY53sActive ? 'YES' : 'no'}</div>
          <div>11Pro: {isIphone11Pro ? 'YES' : 'no'}</div>
          <div>13Pro: {isIphone13ProActive ? 'YES' : 'no'}</div>
          <div>14ProMax: {isIphone14ProMax ? 'YES' : 'no'}</div>
          <div>PocoM4Pro: {isPocoM4Pro ? 'YES' : 'no'}</div>
          <div>iPadMini: {isIpadMini ? 'YES' : 'no'}</div>
          <div>iPadAir: {isIpadAir ? 'YES' : 'no'}</div>
          <div>GalaxyTabS7: {isGalaxyTabS7 ? 'YES' : 'no'}</div>
        </div>
      )}

      {/* z-0: background smoke/studio backdrop, slow ambient zoom
          (now driven by the GSAP timeline above, not a CSS keyframe) */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-0 bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: `url(${isDark ? backgroundImg : backgroundLightImg})` }}
      />

      {/* subtle vignette for depth */}
      <div className={`absolute inset-0 z-[1] ${isDark ? 'bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.55)_100%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_40%,rgba(0,0,0,0.15)_100%)]'} pointer-events-none`} />

      {/* z-25: heading text — sits behind car but elevated */}
      <div
        className="absolute inset-0 z-[25] flex flex-col items-center justify-start sm:pt-[10%] md:pt-[8%] px-5 sm:px-10 md:px-16 pointer-events-none"
        style={{
          paddingTop: isSamsungA14Active ? '11.6rem' : isItelS25Active ? '12.6rem' : isVivoY53sActive ? '13rem' : isIphone13ProActive ? '11.4rem' : isSamsungS8Plus ? '9rem' : isIphone11Pro ? '10.6rem' : isIphone14ProMax ? '13rem' : isPocoM4Pro ? '14rem' : isGalaxyTabS7 ? '18rem' : isIpadAir ? '15rem' : isIpadMini ? '12rem' : '4.5rem'
        }}
      >
        {/* Gradient overlay to lift text from background */}
        <div className={`absolute inset-0 z-[-1] pointer-events-none ${isDark ? 'bg-gradient-to-t from-black/50 via-transparent to-transparent' : 'bg-gradient-to-t from-white/60 via-white/20 to-transparent'}`} />
        <h1 className={`w-full max-w-6xl flex flex-col leading-[0.82] ${isDark ? 'text-white' : 'text-[#1F2937]'}`}>
          <span
            ref={headingLine1}
            className={`self-start font-brace font-normal text-[4rem] xs:text-[4.2rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[8.5rem] xl:text-[10.5rem] 2xl:text-[13rem] tracking-tight ${isDark ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]' : ''}`}
            style={{ fontSize: (isIpadMini || isIpadAir || isGalaxyTabS7) ? '8rem' : undefined }}
          >
            Rental
          </span>
          <span
            ref={headingLine2}
            className={`self-end font-brace font-normal text-[4rem] xs:text-[4.2rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[8.5rem] xl:text-[10.5rem] 2xl:text-[13rem] tracking-tight mr-[5%] mt-1 sm:mt-2 md:mt-3 ${isDark ? 'text-white/95 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]' : ''}`}
            style={{ fontSize: (isIpadMini || isIpadAir || isGalaxyTabS7) ? '8rem' : undefined, marginRight: (isIpadMini || isIpadAir || isGalaxyTabS7) ? '0%' : undefined }}
          >
            Mobil
          </span>
        </h1>
      </div>

      {/* z-20: soft contact shadow beneath the car */}
      <div
        ref={carShadowRef}
        className="absolute z-20 -translate-x-1/2 pointer-events-none left-1/2"
        style={{
          bottom: shadowBottom,
          width: shadowWidth,
          height: '60px',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0) 75%)',
          filter: 'blur(6px)',
        }}
      />

      {/* z-30: skeleton car layer (visible through the hole) */}
      <div
        ref={carSkeletonRef}
        className="absolute inset-0 z-30 bg-no-repeat pointer-events-none transition-all duration-500"
        style={{
          backgroundImage: `url(${isDark ? carSkeletonImg : carSkeletonLightImg})`,
          backgroundPosition: carBgPosition,
          backgroundSize: carBgSize,
          opacity: hasInteracted ? 1 : 0,
        }}
      />

      {/* z-35: base car layer (solid body) — masked to hide at cursor */}
      <div
        ref={carRef}
        className="absolute inset-0 z-[35] transition-all duration-500"
      >
        <RevealLayer image={isDark ? carSolidImg : carSolidLightImg} cursorX={cursorPos.x} cursorY={cursorPos.y} backgroundPosition={carBgPosition} backgroundSize={carBgSize} />
      </div>

      {/* Bottom-left glass card */}
      <div
        ref={leftCopyRef}
        className={`hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[270px] z-50 rounded-2xl p-4 glass-hero-card ${
          isDark ? '' : ''
        }`}
      >
        <p className={`text-sm leading-relaxed ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
          Jalan-jalan, bisnis, atau keluarga? Semua bisa! Armada kami siap menemani kapan saja.
        </p>
      </div>

      {/* Bottom-right glass card */}
      <div
        ref={rightCopyRef}
        className={`absolute bottom-10 sm:bottom-14 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[280px] flex flex-col items-start gap-4 sm:gap-5 z-50 rounded-2xl p-5 glass-hero-card ${
          isDark ? '' : ''
        }`}
      >
        <p className={`text-xs leading-relaxed sm:text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
          Berbagai pilihan mobil untuk semua kebutuhan. Armada terawat, harga transparan, dan dukungan 24/7 siap membantu.
        </p>
        <Link
          to="/armada"
          className={`
            text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95
            ${isDark ? 'glass-booking-btn-dark' : 'glass-booking-btn-light'}
          `}
        >
          Booking Sekarang
        </Link>
      </div>

      {/* Scroll hint */}
      <div
        ref={scrollHintRef}
        className={`absolute z-50 flex flex-col items-center gap-1 -translate-x-1/2 pointer-events-none bottom-4 left-1/2 ${isDark ? 'text-white/50' : 'text-slate-400'}`}
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <ChevronDown size={16} />
      </div>

    </section>
  );
}
