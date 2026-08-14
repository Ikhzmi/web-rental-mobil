import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useTheme } from '../../contexts/ThemeContext';

interface LoginBackgroundProps {
  children: ReactNode;
}

export default function LoginBackgroundV4({ children }: LoginBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const elements = elementsRef.current;
    if (!elements.length) return;

    // Subtle floating animations
    elements.forEach((el, i) => {
      const duration = 20 + (i % 3) * 5;
      const delay = i * 0.8;
      const yMove = 6 + (i % 2) * 4;
      const xMove = 4 + (i % 2) * 2;

      gsap.to(el, {
        y: `+=${yMove}`,
        x: `+=${(i % 2 === 0 ? 1 : -1) * xMove}`,
        duration,
        delay,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    });

    return () => {
      elements.forEach((el) => {
        gsap.killTweensOf(el);
      });
    };
  }, [isDark]);

  const addToRef = (el: HTMLElement | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  };

  return (
    <main
      ref={containerRef}
      className={`
        relative min-h-screen overflow-hidden
        transition-colors duration-500 ease-out
        ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#F9EFE8]'}
      `}
    >
      {/* Layer 1: Base gradient */}
      <div className={`
        absolute inset-0
        ${isDark
          ? 'bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a]'
          : 'bg-gradient-to-br from-[#F9EFE8] via-[#F5F0E8] to-[#F0EBE3]'
        }
      `} />

      {/* Layer 2: Large soft gradient orbs */}
      <div
        ref={addToRef}
        className={`
          absolute top-[-15%] left-[10%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px]
          rounded-full
          blur-[120px]
          ${isDark
            ? 'bg-gradient-to-br from-[#1a1a1a] to-[#141414]'
            : 'bg-gradient-to-br from-[#E8E3DC] to-[#E0DBD3]'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute bottom-[-15%] right-[10%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px]
          rounded-full
          blur-[100px]
          ${isDark
            ? 'bg-gradient-to-tl from-[#181818] to-[#121212]'
            : 'bg-gradient-to-tl from-[#E5E0D8] to-[#DDD8D0]'
          }
        `}
      />

      {/* ============================================ */}
      {/* CORNER ELEMENTS - Away from card */}
      {/* ============================================ */}

      {/* Top Left */}
      <div
        ref={addToRef}
        className={`
          absolute top-[8%] left-[5%] w-28 h-28
          rounded-2xl
          backdrop-blur-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.05] border border-white/[0.08]'
            : 'bg-white/[0.55] border border-[#D4CFC7]/55'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute top-[12%] left-[18%] w-10 h-10
          rounded-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.06]'
            : 'bg-[#8B7355]/20'
          }
        `}
      />

      {/* Top Right */}
      <div
        ref={addToRef}
        className={`
          absolute top-[6%] right-[5%] w-24 h-24
          rounded-2xl
          backdrop-blur-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.045] border border-white/[0.07]'
            : 'bg-white/[0.5] border border-[#D4CFC7]/50'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute top-[15%] right-[15%] w-8 h-8
          rounded-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.05]'
            : 'bg-[#8B7355]/18'
          }
        `}
      />

      {/* Middle Left */}
      <div
        ref={addToRef}
        className={`
          absolute top-[40%] left-[3%] w-20 h-20
          rounded-2xl
          backdrop-blur-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.055] border border-white/[0.09]'
            : 'bg-white/[0.6] border border-[#D4CFC7]/58'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute top-[48%] left-[12%] w-7 h-7
          rounded-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.05]'
            : 'bg-[#8B7355]/16'
          }
        `}
      />

      {/* Middle Right */}
      <div
        ref={addToRef}
        className={`
          absolute top-[42%] right-[3%] w-18 h-18
          rounded-2xl
          backdrop-blur-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.05] border border-white/[0.08]'
            : 'bg-white/[0.55] border border-[#D4CFC7]/55'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute top-[52%] right-[12%] w-6 h-6
          rounded-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.045]'
            : 'bg-[#8B7355]/15'
          }
        `}
      />

      {/* Bottom Left */}
      <div
        ref={addToRef}
        className={`
          absolute bottom-[10%] left-[8%] w-22 h-22
          rounded-2xl
          backdrop-blur-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.04] border border-white/[0.06]'
            : 'bg-white/[0.48] border border-[#D4CFC7]/48'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute bottom-[18%] left-[5%] w-8 h-8
          rounded-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.04]'
            : 'bg-[#8B7355]/14'
          }
        `}
      />

      {/* Bottom Right */}
      <div
        ref={addToRef}
        className={`
          absolute bottom-[8%] right-[6%] w-20 h-20
          rounded-2xl
          backdrop-blur-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.038] border border-white/[0.055]'
            : 'bg-white/[0.45] border border-[#D4CFC7]/45'
          }
        `}
      />

      <div
        ref={addToRef}
        className={`
          absolute bottom-[16%] right-[18%] w-7 h-7
          rounded-2xl
          transition-all duration-500
          ${isDark
            ? 'bg-white/[0.035]'
            : 'bg-[#8B7355]/12'
          }
        `}
      />

      {/* ============================================ */}
      {/* CORNER GRADIENT ACCENTS */}
      {/* ============================================ */}
      <div className={`
        absolute top-0 left-0 w-72 h-72
        pointer-events-none
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04)_0%,transparent_50%)]'
          : 'bg-[radial-gradient(ellipse_at_top_left,rgba(139,115,85,0.06)_0%,transparent_50%)]'
        }
      `} />

      <div className={`
        absolute bottom-0 right-0 w-72 h-72
        pointer-events-none
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.03)_0%,transparent_50%)]'
          : 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,115,85,0.05)_0%,transparent_50%)]'
        }
      `} />

      {/* Subtle center glow */}
      <div className={`
        absolute inset-0
        pointer-events-none
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.015)_0%,transparent_40%)]'
          : 'bg-[radial-gradient(ellipse_at_center,rgba(139,115,85,0.03)_0%,transparent_35%)]'
        }
      `} />

      {/* Vignette overlay */}
      <div className={`
        absolute inset-0 pointer-events-none
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.35)_100%)]'
          : 'bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.04)_100%)]'
        }
      `} />

      {/* Content wrapper */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-5 py-24">
        {children}
      </div>
    </main>
  );
}
