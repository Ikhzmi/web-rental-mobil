import type { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LoginBackgroundProps {
  children: ReactNode;
}

export default function LoginBackground({ children }: LoginBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main
      className={`
        relative min-h-screen overflow-hidden
        transition-colors duration-500 ease-in-out
        ${isDark ? 'bg-[#161616]' : 'bg-[#F6F5F3]'}
      `}
    >
      {/* Layer 1: Base Gradient */}
      <div
        className={`
          absolute inset-0 transition-opacity duration-500 ease-in-out
          ${isDark
            ? 'bg-gradient-to-br from-[#161616] via-[#1a1a1a] to-[#161616]'
            : 'bg-gradient-to-br from-[#F6F5F3] via-[#F2F2F0] to-[#ECEAE6]'
          }
        `}
      />

      {/* Layer 2: Large blurred radial glow - Top Left */}
      <div
        className={`
          absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full
          blur-[120px] opacity-40
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-[#232323]'
            : 'bg-[#E8E4DF]'
          }
          animate-float-slow-1
        `}
      />

      {/* Layer 2: Large blurred radial glow - Bottom Right */}
      <div
        className={`
          absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full
          blur-[140px] opacity-35
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-[#1e1e1e]'
            : 'bg-[#E5E0DA]'
          }
          animate-float-slow-2
        `}
      />

      {/* Layer 3: Organic abstract blob - Top Right */}
      <div
        className={`
          absolute top-[10%] right-[5%] w-[400px] h-[400px]
          rounded-[60%_40%_30%_70%_/_60%_30%_70%_40%]
          blur-[80px] opacity-30
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-[#252525]'
            : 'bg-[#EBE7E2]'
          }
          animate-float-slow-3
        `}
      />

      {/* Layer 3: Organic abstract blob - Bottom Left */}
      <div
        className={`
          absolute bottom-[15%] left-[8%] w-[350px] h-[350px]
          rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%]
          blur-[70px] opacity-25
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-[#1f1f1f]'
            : 'bg-[#E6E1DC]'
          }
          animate-float-slow-4
        `}
      />

      {/* Layer 4: Rounded glass panels - Top Left Corner */}
      <div
        className={`
          absolute top-8 left-8 w-32 h-32
          rounded-3xl
          backdrop-blur-md
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-white/[0.03] border border-white/[0.06]'
            : 'bg-white/[0.4] border border-white/[0.6]'
          }
          animate-float-slow-5
        `}
      />

      {/* Layer 4: Rounded glass panel - Bottom Right Corner */}
      <div
        className={`
          absolute bottom-12 right-12 w-24 h-24
          rounded-2xl
          backdrop-blur-md
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-white/[0.02] border border-white/[0.05]'
            : 'bg-white/[0.35] border border-white/[0.5]'
          }
          animate-float-slow-6
        `}
      />

      {/* Layer 5: Subtle translucent circles - Small accent */}
      <div
        className={`
          absolute top-[25%] left-[15%] w-16 h-16
          rounded-full
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-white/[0.02] border border-white/[0.04]'
            : 'bg-white/[0.5] border border-white/[0.7]'
          }
          animate-float-slow-7
        `}
      />

      {/* Layer 5: Subtle translucent circle - Large */}
      <div
        className={`
          absolute bottom-[25%] right-[20%] w-20 h-20
          rounded-full
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-white/[0.015] border border-white/[0.03]'
            : 'bg-white/[0.45] border border-white/[0.6]'
          }
          animate-float-slow-8
        `}
      />

      {/* Layer 6: Very light decorative gradient accents */}
      <div
        className={`
          absolute top-[60%] left-[3%] w-[200px] h-[200px]
          rounded-full
          blur-[60px] opacity-20
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-gradient-to-tr from-[#2a2a2a] to-transparent'
            : 'bg-gradient-to-tr from-[#E2DED9] to-transparent'
          }
          animate-float-slow-1
        `}
      />

      <div
        className={`
          absolute top-[5%] right-[25%] w-[150px] h-[150px]
          rounded-full
          blur-[50px] opacity-15
          transition-all duration-500 ease-in-out
          ${isDark
            ? 'bg-gradient-to-bl from-[#282828] to-transparent'
            : 'bg-gradient-to-bl from-[#E0DBD5] to-transparent'
          }
          animate-float-slow-2
        `}
      />

      {/* Center clean area - subtle radial gradient for depth */}
      <div
        className={`
          absolute inset-0
          bg-radial-center opacity-30
          pointer-events-none
          transition-opacity duration-500 ease-in-out
        `}
      />

      {/* Content wrapper - keeps form centered and clean */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-5 py-24">
        {children}
      </div>
    </main>
  );
}
