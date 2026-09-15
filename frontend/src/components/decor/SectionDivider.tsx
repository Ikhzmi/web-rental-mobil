interface SectionDividerProps {
  type: 'hero-to-fleet' | 'fleet-to-booking' | 'cta-to-footer';
  isDark: boolean;
}

export default function SectionDivider({ type, isDark }: SectionDividerProps) {
  if (type === 'hero-to-fleet') {
    return (
      <div className={`relative w-full overflow-hidden leading-none z-10 -mt-1 pointer-events-none ${isDark ? 'bg-black' : 'bg-[#F9EFE8]'}`}>
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12 sm:h-16 md:h-20 block"
          preserveAspectRatio="none"
        >
          {/* Latar Belakang Kurva Atas (Hero section transition) */}
          <rect width="1440" height="80" fill={isDark ? '#000000' : '#F9EFE8'} />

          {/* Latar Belakang Kurva Utama (Fleet section entrance) */}
          <path
            d="M0 0C360 55 1080 55 1440 0V80H0V0Z"
            fill={isDark ? '#0a0a0a' : '#f4f4f5'}
          />

          {/* Garis Ulir / Contour Thread 1 */}
          <path
            d="M0 5C420 60 1020 60 1440 5"
            stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(249, 115, 22, 0.25)'}
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Garis Ulir / Contour Thread 2 */}
          <path
            d="M0 15C320 68 1120 68 1440 15"
            stroke={isDark ? 'rgba(249, 115, 22, 0.35)' : 'rgba(249, 115, 22, 0.45)'}
            strokeWidth="2"
          />

          {/* Garis Ulir / Contour Thread 3 Halus */}
          <path
            d="M0 25C260 75 1180 75 1440 25"
            stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  }

  if (type === 'fleet-to-booking') {
    return (
      <div className={`relative w-full overflow-hidden leading-none z-10 -mt-1 pointer-events-none ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
        <svg
          viewBox="0 0 1440 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-14 sm:h-18 md:h-24 block"
          preserveAspectRatio="none"
        >
          {/* Latar Belakang Kurva Atas (Fleet section bottom) */}
          <rect width="1440" height="90" fill={isDark ? '#0a0a0a' : '#ffffff'} />

          {/* Latar Belakang Kurva Masuk ke Cara Booking */}
          <path
            d="M0 20C480 85 960 -20 1440 45V90H0V20Z"
            fill={isDark ? '#141419' : '#F9EFE8'}
          />

          {/* Ulir Spiral Gelombang 1 */}
          <path
            d="M0 16C480 81 960 -24 1440 41"
            stroke={isDark ? 'rgba(201, 151, 75, 0.45)' : 'rgba(180, 130, 60, 0.4)'}
            strokeWidth="2"
          />

          {/* Ulir Spiral Gelombang 2 (Garis Putus Halus) */}
          <path
            d="M0 26C480 91 960 -14 1440 51"
            stroke={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(180, 130, 60, 0.25)'}
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />

          {/* Ulir Spiral Gelombang 3 */}
          <path
            d="M0 36C480 101 960 -4 1440 61"
            stroke={isDark ? 'rgba(201, 151, 75, 0.2)' : 'rgba(249, 115, 22, 0.2)'}
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  }

  if (type === 'cta-to-footer') {
    return (
      <div className={`relative w-full overflow-hidden leading-none z-10 -mt-1 pointer-events-none ${isDark ? 'bg-[#0f0f12]' : 'bg-[#F9EFE8]'}`}>
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12 sm:h-16 md:h-20 block"
          preserveAspectRatio="none"
        >
          {/* Latar Belakang Kurva Atas (CTA bottom) */}
          <rect width="1440" height="80" fill={isDark ? '#0f0f12' : '#F9EFE8'} />

          {/* Latar Belakang Kurva Menuju Footer */}
          <path
            d="M0 50C360 5 1080 5 1440 50V80H0V50Z"
            fill={isDark ? '#0a0a0a' : '#f8fafc'}
          />

          {/* Garis Ulir Penutup 1 */}
          <path
            d="M0 45C360 0 1080 0 1440 45"
            stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(100, 116, 139, 0.2)'}
            strokeWidth="1.5"
          />

          {/* Garis Ulir Penutup 2 (Garis Aksen Putus) */}
          <path
            d="M0 55C360 10 1080 10 1440 55"
            stroke={isDark ? 'rgba(249, 115, 22, 0.35)' : 'rgba(249, 115, 22, 0.35)'}
            strokeWidth="1.5"
            strokeDasharray="5 7"
          />
        </svg>
      </div>
    );
  }

  return null;
}
