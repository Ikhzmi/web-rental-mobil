import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronDown } from 'lucide-react';
import RevealLayer from './RevealLayer';
import backgroundImg from '../assets/background.webp';
import carSolidImg from '../assets/car-solid.webp';
import carSkeletonImg from '../assets/car-skeleton.webp';

gsap.registerPlugin(useGSAP);

export default function Hero() {
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
        lastWidth = currentWidth;
      }
    };
    setIsMobile(window.innerWidth < 768);
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

  const carBgPosition = isMobile ? 'center bottom 32%' : 'center bottom -110px';
  const carBgSize = isMobile ? '165%' : 'contain';
  const shadowBottom = isMobile ? '29.5%' : '10%';
  const shadowWidth = isMobile ? '70%' : '55%';

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden h-screen bg-black"
      style={{ height: '100dvh' }}
    >
      {/* z-0: background smoke/studio backdrop, slow ambient zoom
          (now driven by the GSAP timeline above, not a CSS keyframe) */}
      <div
        ref={bgRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-0"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />

      {/* subtle vignette for depth */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      {/* z-10: heading text — sits BEHIND the car */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-[12.8rem] xs:pt-[14.8rem] sm:pt-[10%] md:pt-[8%] px-5 sm:px-10 md:px-16 pointer-events-none">
        <h1 className="w-full max-w-6xl flex flex-col leading-[0.82] text-white">
          <span
            ref={headingLine1}
            className="self-start font-brace font-normal text-[5.4rem] xs:text-[6.6rem] sm:text-[6.5rem] md:text-[8rem] lg:text-[10rem] xl:text-[11rem] tracking-tight"
          >
            Rental
          </span>
          <span
            ref={headingLine2}
            className="self-end font-brace font-normal text-[5.4rem] xs:text-[6.6rem] sm:text-[6.5rem] md:text-[8rem] lg:text-[10rem] xl:text-[11rem] tracking-tight text-white/95 mr-[5%] mt-1 sm:mt-2 md:mt-3"
          >
            Mobil
          </span>
        </h1>
      </div>

      {/* z-20: soft contact shadow beneath the car */}
      <div
        ref={carShadowRef}
        className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
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
        className="absolute inset-0 bg-no-repeat z-30 transition-opacity duration-700 ease-out pointer-events-none"
        style={{
          backgroundImage: `url(${carSkeletonImg})`,
          backgroundPosition: carBgPosition,
          backgroundSize: carBgSize,
          opacity: hasInteracted ? 1 : 0,
        }}
      />

      {/* z-35: base car layer (solid body) — masked to hide at cursor */}
      <div
        ref={carRef}
        className="absolute inset-0 z-[35]"
      >
        <RevealLayer image={carSolidImg} cursorX={cursorPos.x} cursorY={cursorPos.y} backgroundPosition={carBgPosition} backgroundSize={carBgSize} />
      </div>

      {/* Bottom-left glass card */}
      <div
        ref={leftCopyRef}
        className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[270px] z-50 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4"
      >
        <p className="text-sm text-white/80 leading-relaxed">
          Every model in our fleet is inspected, detailed, and track-tested
          before it reaches your hands.
        </p>
      </div>

      {/* Bottom-right glass card */}
      <div
        ref={rightCopyRef}
        className="absolute bottom-10 sm:bottom-14 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[280px] flex flex-col items-start gap-4 sm:gap-5 z-50 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5"
      >
        <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
          Hover over the car to see what's underneath — every rental comes
          with a full mechanical inspection report.
        </p>
        <Link
          to="/armada"
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#2563eb]/30"
        >
          Reserve Now
        </Link>
      </div>

      {/* Scroll hint */}
      <div
        ref={scrollHintRef}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 text-white/50 pointer-events-none"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <ChevronDown size={16} />
      </div>

    </section>
  );
}
