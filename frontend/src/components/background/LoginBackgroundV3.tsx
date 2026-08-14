import { useState, useEffect, type ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LoginBackgroundProps {
  children: ReactNode;
}

export default function LoginBackgroundV3({ children }: LoginBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Calculate magnetic attraction effect
  const calculateMagneticOffset = (elementX: number, elementY: number, strength: number = 1) => {
    const dx = mousePos.x - elementX;
    const dy = mousePos.y - elementY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 400;

    if (distance > maxDistance) return { x: 0, y: 0 };

    const power = (1 - distance / maxDistance) * strength;
    return {
      x: dx * power * 0.15,
      y: dy * power * 0.15
    };
  };

  // Light beam following mouse
  const lightBeamX = isHovering ? mousePos.x : 0;
  const lightBeamY = isHovering ? mousePos.y : 0;

  return (
    <main
      className={`
        relative min-h-screen overflow-hidden
        transition-colors duration-500 ease-out
        ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#F8F7F4]'}
      `}
    >
      {/* Animated grid pattern background */}
      <div className={`
        absolute inset-0 opacity-[0.03]
        transition-opacity duration-500
        ${isDark ? 'opacity-[0.04]' : 'opacity-[0.03]'}
        ${isHovering ? 'opacity-100' : ''}
      `}
        style={{
          backgroundImage: `
            linear-gradient(${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Light beam effect following cursor */}
      <div
        className={`
          pointer-events-none fixed z-20
          transition-all duration-300 ease-out
          ${isHovering ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          left: lightBeamX,
          top: lightBeamY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className={`
          w-96 h-96 rounded-full
          transition-all duration-500
          ${isDark
            ? 'bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,transparent_70%)]'
            : 'bg-[radial-gradient(circle,rgba(139,115,85,0.1)_0%,transparent_70%)]'
          }
        `} />
      </div>

      {/* Layer 1: Base gradient */}
      <div className={`
        absolute inset-0
        ${isDark
          ? 'bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a]'
          : 'bg-gradient-to-br from-[#F8F7F4] via-[#F5F4F1] to-[#F2F1EE]'
        }
      `} />

      {/* Layer 2: Large flowing gradient blobs */}
      <div className={`
        absolute top-[-20%] left-[-10%] w-[70%] h-[70%]
        rounded-full blur-[150px]
        transition-all duration-1000 ease-out
        ${isHovering ? 'scale-110' : 'scale-100'}
        ${isDark
          ? 'bg-gradient-to-br from-[#1a1a1a] to-[#141414]'
          : 'bg-gradient-to-br from-[#EBE8E4] to-[#E5E2DE]'
        }
      `} />

      <div className={`
        absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%]
        rounded-full blur-[120px]
        transition-all duration-1000 ease-out
        ${isHovering ? 'scale-105' : 'scale-100'}
        ${isDark
          ? 'bg-gradient-to-tl from-[#181818] to-[#121212]'
          : 'bg-gradient-to-tl from-[#E8E5E1] to-[#E2DFDB]'
        }
      `} />

      {/* Layer 3: Interactive geometric diamond shapes */}
      <div
        className={`
          absolute top-[15%] right-[20%] w-32 h-32
          transition-all duration-500 ease-out
          cursor-pointer
          ${isDark
            ? 'bg-gradient-to-br from-white/[0.06] to-white/[0.02]'
            : 'bg-gradient-to-br from-white/[0.6] to-white/[0.3]'
          }
        `}
        style={{
          transform: `rotate(45deg) ${isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 1.5).x}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 1.5).y}px)` : ''}`,
        }}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
      >
        <div className={`
          absolute inset-1 rounded-sm
          transition-all duration-300
          ${isDark
            ? 'bg-[#0d0d0d]/50'
            : 'bg-[#F8F7F4]/50'
          }
          ${isHovering ? 'opacity-100 scale-95' : 'opacity-0 scale-100'}
        `} />
      </div>

      <div
        className={`
          absolute bottom-[25%] left-[15%] w-24 h-24
          transition-all duration-500 ease-out
          cursor-pointer
          ${isDark
            ? 'bg-gradient-to-tr from-white/[0.05] to-white/[0.01]'
            : 'bg-gradient-to-tr from-white/[0.5] to-white/[0.2]'
          }
        `}
        style={{
          transform: `rotate(12deg) ${isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 1).x * 0.5}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 1).y * 0.5}px)` : ''}`,
        }}
      >
        <div className={`
          absolute inset-0 rounded-sm
          transition-all duration-300
          ${isDark
            ? 'bg-[#0d0d0d]/60'
            : 'bg-[#F8F7F4]/60'
          }
          ${isHovering ? 'opacity-100 scale-90' : 'opacity-0 scale-100'}
        `} />
      </div>

      {/* Layer 4: Morphing glass cards with magnetic effect */}
      <div
        className={`
          group absolute top-[10%] left-[8%] w-40 h-40
          transition-all duration-500 ease-out
          cursor-pointer
          ${isDark
            ? 'bg-white/[0.03] hover:bg-white/[0.06]'
            : 'bg-white/[0.4] hover:bg-white/[0.6]'
          }
        `}
        style={{
          transform: isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 2).x}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 2).y}px) rotate(2deg)` : 'rotate(0deg)',
          borderRadius: isHovering ? '60% 40% 30% 70% / 60% 30% 70% 40%' : '30% 70% 70% 30% / 30% 70% 30% 70%',
        }}
      >
        <div className={`
          absolute inset-0 rounded-inherit
          transition-all duration-500
          ${isDark
            ? 'bg-gradient-to-br from-white/[0.1] to-transparent'
            : 'bg-gradient-to-br from-white/[0.5] to-transparent'
          }
          ${isHovering ? 'opacity-100' : 'opacity-0'}
        `} />
      </div>

      <div
        className={`
          group absolute bottom-[15%] right-[10%] w-32 h-48
          transition-all duration-500 ease-out
          cursor-pointer
          ${isDark
            ? 'bg-white/[0.02] hover:bg-white/[0.05]'
            : 'bg-white/[0.35] hover:bg-white/[0.55]'
          }
        `}
        style={{
          transform: isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 1.5).x * -0.5}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 1.5).y * -0.5}px) rotate(-3deg)` : 'rotate(0deg)',
          borderRadius: isHovering ? '40% 60% 55% 45% / 50% 40% 60% 50%' : '45% 55% 45% 55% / 55% 45% 55% 45%',
        }}
      >
        <div className={`
          absolute inset-0 rounded-inherit
          transition-all duration-500
          ${isDark
            ? 'bg-gradient-to-tl from-white/[0.08] to-transparent'
            : 'bg-gradient-to-tl from-white/[0.4] to-transparent'
          }
          ${isHovering ? 'opacity-100' : 'opacity-0'}
        `} />
      </div>

      {/* Layer 5: Interactive rings with glow on hover */}
      <div className={`
        absolute top-[20%] left-[25%] w-20 h-20
        rounded-full
        transition-all duration-500 ease-out
        cursor-pointer
        ${isDark
          ? 'border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.03]'
          : 'border border-[#8B7355]/20 hover:border-[#8B7355]/40 hover:bg-[#8B7355]/5'
        }
      `}
        style={{
          transform: isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 1).x * 2}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 1).y * 2}px)` : '',
        }}
      >
        <div className={`
          absolute inset-2 rounded-full
          transition-all duration-300
          ${isDark
            ? 'bg-white/[0.02]'
            : 'bg-[#8B7355]/5'
          }
          ${isHovering ? 'scale-110 opacity-100' : 'scale-100 opacity-0'}
        `} />
        <div className={`
          absolute inset-0 rounded-full
          transition-all duration-500
          ${isDark
            ? 'shadow-[0_0_40px_rgba(255,255,255,0.1)]'
            : 'shadow-[0_0_40px_rgba(139,115,85,0.15)]'
          }
          ${isHovering ? 'opacity-100 scale-125' : 'opacity-0 scale-100'}
        `} />
      </div>

      <div className={`
        absolute bottom-[30%] right-[25%] w-14 h-14
        rounded-full
        transition-all duration-500 ease-out
        cursor-pointer
        ${isDark
          ? 'border border-white/[0.06] hover:border-white/[0.15]'
          : 'border border-[#8B7355]/15 hover:border-[#8B7355]/35'
        }
      `}
        style={{
          transform: isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 0.8).x * -1.5}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 0.8).y * -1.5}px)` : '',
        }}
      >
        <div className={`
          absolute inset-0 rounded-full
          transition-all duration-300
          ${isDark
            ? 'shadow-[0_0_30px_rgba(255,255,255,0.08)]'
            : 'shadow-[0_0_30px_rgba(139,115,85,0.12)]'
          }
          ${isHovering ? 'opacity-100 scale-150' : 'opacity-0 scale-100'}
        `} />
      </div>

      {/* Layer 6: Floating line accents */}
      <div className={`
        absolute top-[35%] right-[5%] h-[1px]
        transition-all duration-500 ease-out
        ${isDark
          ? 'bg-gradient-to-l from-white/[0.1] to-transparent w-32'
          : 'bg-gradient-to-l from-[#8B7355]/30 to-transparent w-28'
        }
        ${isHovering ? 'w-48 opacity-100' : 'w-32 opacity-70'}
      `} />

      <div className={`
        absolute bottom-[45%] left-[3%] h-[1px]
        transition-all duration-500 ease-out
        ${isDark
          ? 'bg-gradient-to-r from-white/[0.08] to-transparent w-24'
          : 'bg-gradient-to-r from-[#8B7355]/25 to-transparent w-20'
        }
        ${isHovering ? 'w-40 opacity-100' : 'w-24 opacity-60'}
      `} />

      {/* Layer 7: Interactive dots with ripple effect */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`
            absolute w-3 h-3 rounded-full
            transition-all duration-400 ease-out
            cursor-pointer
            ${isDark
              ? 'bg-white/[0.1] hover:bg-white/[0.25]'
              : `bg-[#8B7355]/30 hover:bg-[#8B7355]/50`
            }
          `}
          style={{
            top: `${20 + i * 20}%`,
            left: `${5 + (i % 2) * 85}%`,
            transform: isHovering ? `translate(${calculateMagneticOffset(lightBeamX, lightBeamY, 0.5 + i * 0.2).x * (i + 1)}px, ${calculateMagneticOffset(lightBeamX, lightBeamY, 0.5 + i * 0.2).y * (i + 1)}px)` : '',
          }}
        >
          {/* Ripple effect on hover */}
          <div className={`
            absolute inset-0 rounded-full
            transition-all duration-500
            ${isDark
              ? 'bg-white/[0.15]'
              : 'bg-[#8B7355]/20'
            }
            ${isHovering ? 'scale-[3] opacity-0' : 'scale-100 opacity-0'}
          `} />
        </div>
      ))}

      {/* Layer 8: Gradient corner accents */}
      <div className={`
        absolute top-0 left-0 w-64 h-64
        transition-all duration-700 ease-out
        pointer-events-none
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.05)_0%,transparent_60%)]'
          : 'bg-[radial-gradient(ellipse_at_top_left,rgba(139,115,85,0.08)_0%,transparent_60%)]'
        }
        ${isHovering ? 'opacity-150' : 'opacity-100'}
      `} />

      <div className={`
        absolute bottom-0 right-0 w-64 h-64
        transition-all duration-700 ease-out
        pointer-events-none
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.04)_0%,transparent_60%)]'
          : 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,115,85,0.06)_0%,transparent_60%)]'
        }
        ${isHovering ? 'opacity-150' : 'opacity-100'}
      `} />

      {/* Layer 9: Accent color orbs (subtle) */}
      <div className={`
        absolute top-[60%] left-[20%] w-40 h-40
        rounded-full blur-[60px]
        transition-all duration-1000 ease-out
        pointer-events-none
        ${isDark
          ? 'bg-gradient-to-tr from-[#8B7355]/[0.05] to-transparent'
          : 'bg-gradient-to-tr from-[#8B7355]/10 to-transparent'
        }
        ${isHovering ? 'scale-110 opacity-150' : 'opacity-100'}
      `} />

      {/* Subtle noise texture overlay */}
      <div
        className={`
          absolute inset-0 opacity-[0.015]
          pointer-events-none
          transition-opacity duration-500
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div className={`
        absolute inset-0 pointer-events-none
        transition-all duration-700
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.4)_100%)]'
          : 'bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.05)_100%)]'
        }
      `} />

      {/* Content wrapper */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-5 py-24">
        {children}
      </div>
    </main>
  );
}
