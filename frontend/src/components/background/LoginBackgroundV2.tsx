import { useState, useEffect, type ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LoginBackgroundProps {
  children: ReactNode;
}

export default function LoginBackgroundV2({ children }: LoginBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
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

  // Calculate parallax offsets based on mouse position
  const parallaxX1 = (mousePos.x - 50) * 0.02;
  const parallaxY1 = (mousePos.y - 50) * 0.02;
  const parallaxX2 = (mousePos.x - 50) * -0.015;
  const parallaxY2 = (mousePos.y - 50) * -0.015;
  const parallaxX3 = (mousePos.x - 50) * 0.025;
  const parallaxY3 = (mousePos.y - 50) * 0.025;

  return (
    <main
      className={`
        relative min-h-screen overflow-hidden
        transition-colors duration-500 ease-in-out
        ${isDark ? 'bg-[#161616]' : 'bg-[#F6F5F3]'}
      `}
    >
      {/* Layer 1: Base Gradient with subtle mouse-reactive radial */}
      <div
        className={`
          absolute inset-0 transition-opacity duration-500 ease-in-out
          ${isDark
            ? 'bg-gradient-to-br from-[#161616] via-[#1a1a1a] to-[#161616]'
            : 'bg-gradient-to-br from-[#F6F5F3] via-[#F2F2F0] to-[#ECEAE6]'
          }
        `}
      />

      {/* Mouse-reactive ambient glow */}
      <div
        className={`
          absolute inset-0 transition-all duration-1000 ease-out
          opacity-40
          ${isDark
            ? 'bg-[radial-gradient(ellipse_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(50,50,50,0.4)_0%,transparent_50%)]'
            : 'bg-[radial-gradient(ellipse_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(220,210,200,0.5)_0%,transparent_50%)]'
          }
        `}
        style={{
          ['--mouse-x' as string]: `${mousePos.x}%`,
          ['--mouse-y' as string]: `${mousePos.y}%`,
        }}
      />

      {/* Layer 2: Large blurred glow - Top Left with parallax */}
      <div
        className={`
          absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full
          blur-[100px] transition-all duration-700 ease-out
          ${isHovering ? 'opacity-60' : 'opacity-35'}
          ${isDark ? 'bg-[#252525]' : 'bg-[#E8E4DF]'}
        `}
        style={{
          transform: `translate(${parallaxX1 * 2}px, ${parallaxY1 * 2}px)`,
        }}
      />

      {/* Layer 2: Large blurred glow - Bottom Right with parallax */}
      <div
        className={`
          absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full
          blur-[120px] transition-all duration-700 ease-out
          ${isHovering ? 'opacity-50' : 'opacity-30'}
          ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#E5E0DA]'}
        `}
        style={{
          transform: `translate(${parallaxX2 * 3}px, ${parallaxY2 * 3}px)`,
        }}
      />

      {/* Layer 3: Hover-reactive blob - Top Right */}
      <div
        className={`
          absolute top-[8%] right-[4%] w-[380px] h-[380px]
          rounded-[50%_30%_60%_40%_/_40%_50%_30%_60%]
          blur-[60px] transition-all duration-500 ease-out
          ${isHovering ? 'opacity-45 scale-105' : 'opacity-25'}
          ${isDark ? 'bg-[#282828]' : 'bg-[#EBE7E2]'}
        `}
        style={{
          transform: `translate(${parallaxX3 * 1.5}px, ${parallaxY3 * 1.5}px)`,
        }}
      />

      {/* Layer 3: Hover-reactive blob - Bottom Left */}
      <div
        className={`
          absolute bottom-[12%] left-[6%] w-[320px] h-[320px]
          rounded-[60%_40%_30%_70%_/_50%_30%_70%_50%]
          blur-[50px] transition-all duration-500 ease-out
          ${isHovering ? 'opacity-40 scale-110' : 'opacity-20'}
          ${isDark ? 'bg-[#202020]' : 'bg-[#E6E1DC]'}
        `}
        style={{
          transform: `translate(${parallaxX1 * 1.2}px, ${parallaxY1 * 1.2}px)`,
        }}
      />

      {/* Layer 4: Interactive glass panel - Top Left */}
      <div
        className={`
          absolute top-6 left-6 w-28 h-28
          rounded-2xl backdrop-blur-xl
          transition-all duration-500 ease-out
          group cursor-pointer
          ${isDark
            ? 'bg-white/[0.025] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]'
            : 'bg-white/[0.35] border border-white/[0.6] hover:bg-white/[0.5] hover:border-white/[0.8]'
          }
        `}
        style={{
          transform: `translate(${parallaxX2 * 4}px, ${parallaxY2 * 4}px)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `translate(${parallaxX2 * 4 + parallaxX3}px, ${parallaxY2 * 4 + parallaxY3}px) scale(1.05)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `translate(${parallaxX2 * 4}px, ${parallaxY2 * 4}px) scale(1)`;
        }}
      >
        {/* Inner glow on hover */}
        <div className={`
          absolute inset-0 rounded-2xl
          transition-opacity duration-300
          ${isHovering ? 'opacity-100' : 'opacity-0'}
          ${isDark
            ? 'bg-gradient-to-br from-white/[0.1] to-transparent'
            : 'bg-gradient-to-br from-white/[0.4] to-transparent'
          }
        `} />
      </div>

      {/* Layer 4: Interactive glass panel - Bottom Right */}
      <div
        className={`
          absolute bottom-10 right-10 w-20 h-20
          rounded-xl backdrop-blur-xl
          transition-all duration-500 ease-out
          group cursor-pointer
          ${isDark
            ? 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
            : 'bg-white/[0.3] border border-white/[0.5] hover:bg-white/[0.45] hover:border-white/[0.7]'
          }
        `}
        style={{
          transform: `translate(${parallaxX1 * 3}px, ${parallaxY1 * 3}px)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `translate(${parallaxX1 * 3 + parallaxX2}px, ${parallaxY1 * 3 + parallaxY2}px) scale(1.08)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `translate(${parallaxX1 * 3}px, ${parallaxY1 * 3}px) scale(1)`;
        }}
      >
        <div className={`
          absolute inset-0 rounded-xl
          transition-opacity duration-300
          ${isHovering ? 'opacity-100' : 'opacity-0'}
          ${isDark
            ? 'bg-gradient-to-br from-white/[0.08] to-transparent'
            : 'bg-gradient-to-br from-white/[0.35] to-transparent'
          }
        `} />
      </div>

      {/* Layer 5: Hoverable circles - with glow effect */}
      <div
        className={`
          absolute top-[22%] left-[12%] w-12 h-12
          rounded-full backdrop-blur-md
          transition-all duration-400 ease-out
          cursor-pointer
          ${isDark
            ? 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            : 'bg-white/[0.4] border border-white/[0.6] hover:bg-white/[0.6] hover:border-white/[0.9] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
          }
        `}
        style={{
          transform: `translate(${parallaxX3 * 5}px, ${parallaxY3 * 5}px)`,
        }}
      />

      <div
        className={`
          absolute bottom-[30%] right-[18%] w-14 h-14
          rounded-full backdrop-blur-md
          transition-all duration-400 ease-out
          cursor-pointer
          ${isDark
            ? 'bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.09] hover:shadow-[0_0_25px_rgba(255,255,255,0.08)]'
            : 'bg-white/[0.35] border border-white/[0.55] hover:bg-white/[0.55] hover:border-white/[0.8] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]'
          }
        `}
        style={{
          transform: `translate(${parallaxX2 * 4}px, ${parallaxY2 * 4}px)`,
        }}
      />

      {/* Layer 5: Small accent dot */}
      <div
        className={`
          absolute top-[40%] right-[8%] w-6 h-6
          rounded-full transition-all duration-300 ease-out
          ${isDark
            ? 'bg-white/[0.04] hover:bg-white/[0.08]'
            : 'bg-white/[0.5] hover:bg-white/[0.7]'
          }
        `}
        style={{
          transform: `translate(${parallaxX1 * 6}px, ${parallaxY1 * 6}px)`,
        }}
      />

      {/* Layer 6: Gradient accents with hover glow */}
      <div
        className={`
          absolute top-[55%] left-[2%] w-[180px] h-[180px]
          rounded-full blur-[50px] transition-all duration-700 ease-out
          ${isHovering ? 'opacity-35' : 'opacity-15'}
          ${isDark
            ? 'bg-gradient-to-tr from-[#2a2a2a] to-transparent'
            : 'bg-gradient-to-tr from-[#E2DED9] to-transparent'
          }
        `}
        style={{
          transform: `translate(${parallaxX2 * 2}px, ${parallaxY2 * 2}px)`,
        }}
      />

      <div
        className={`
          absolute top-[3%] right-[22%] w-[140px] h-[140px]
          rounded-full blur-[40px] transition-all duration-700 ease-out
          ${isHovering ? 'opacity-30' : 'opacity-12'}
          ${isDark
            ? 'bg-gradient-to-bl from-[#252525] to-transparent'
            : 'bg-gradient-to-bl from-[#E0DBD5] to-transparent'
          }
        `}
        style={{
          transform: `translate(${parallaxX3 * 2.5}px, ${parallaxY3 * 2.5}px)`,
        }}
      />

      {/* Layer 7: Floating particle-like dots */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`
            absolute w-2 h-2 rounded-full
            transition-all duration-600 ease-out
            animate-float-particle
            ${isDark
              ? 'bg-white/[0.1] hover:bg-white/[0.2]'
              : 'bg-[#8B7355]/20 hover:bg-[#8B7355]/35'
            }
          `}
          style={{
            top: `${15 + i * 12}%`,
            left: `${5 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.5}s`,
            transform: `translate(${parallaxX1 * (i + 1)}px, ${parallaxY1 * (i + 1)}px)`,
          }}
        />
      ))}

      {/* Subtle vignette overlay */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          transition-opacity duration-700 ease-out
          ${isHovering ? 'opacity-100' : 'opacity-80'}
          ${isDark
            ? 'bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_40%,rgba(0,0,0,0.2)_100%)]'
            : 'bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.03)_100%)]'
          }
        `}
      />

      {/* Content wrapper */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-5 py-24">
        {children}
      </div>
    </main>
  );
}
