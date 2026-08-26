
const ROUTE_ACCENT_DARK = 'rgba(201, 151, 75, 0.5)'; // emas hangat, dark mode
const ROUTE_ACCENT_LIGHT = 'rgba(180, 130, 60, 0.4)'; // emas hangat, light mode

/** Blob cahaya blur lembut di sudut section — memberi kedalaman tanpa ramai. */
export function AmbientGlow({
  isDark,
  position = 'top-right',
  size = 'md',
}: {
  isDark: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = { sm: 200, md: 320, lg: 440 };
  const px = sizeMap[size];

  const posMap = {
    'top-left': { top: `-${px / 3}px`, left: `-${px / 3}px` },
    'top-right': { top: `-${px / 3}px`, right: `-${px / 3}px` },
    'bottom-left': { bottom: `-${px / 3}px`, left: `-${px / 3}px` },
    'bottom-right': { bottom: `-${px / 3}px`, right: `-${px / 3}px` },
  };

  return (
    <div
      aria-hidden="true"
      className="absolute rounded-full blur-3xl pointer-events-none"
      style={{
        width: px,
        height: px,
        background: isDark
          ? 'radial-gradient(circle, rgba(201,151,75,0.10) 0%, rgba(201,151,75,0) 70%)'
          : 'radial-gradient(circle, rgba(180,130,60,0.14) 0%, rgba(180,130,60,0) 70%)',
        ...posMap[position],
      }}
    />
  );
}

export function RouteWaypoint({ isDark }: { isDark: boolean }) {
  const accent = isDark ? ROUTE_ACCENT_DARK : ROUTE_ACCENT_LIGHT;
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-2 mb-5">
      <div
        className="w-px h-8"
        style={{
          background: `repeating-linear-gradient(to bottom, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 9px)`,
        }}
      />
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
      />
    </div>
  );
}

export function StepRouteLine({ isDark, steps }: { isDark: boolean; steps: number }) {
  const accent = isDark ? ROUTE_ACCENT_DARK : ROUTE_ACCENT_LIGHT;
  // Titik-titik berhenti diposisikan di tengah tiap kolom grid (n kolom -> n titik)
  const stopPercents = Array.from({ length: steps }, (_, i) => ((i + 0.5) / steps) * 100);

  return (
    <div
      aria-hidden="true"
      className="hidden lg:block absolute left-0 right-0 pointer-events-none"
      style={{ top: '38px' }}
    >
      <div
        className="absolute left-[12.5%] right-[12.5%] h-px"
        style={{
          background: `repeating-linear-gradient(to right, ${accent} 0px, ${accent} 6px, transparent 6px, transparent 12px)`,
        }}
      />
      {stopPercents.map((pct, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${pct}%`,
            top: 0,
            background: isDark ? '#0f1013' : '#F9EFE8',
            border: `1.5px solid ${accent}`,
          }}
        />
      ))}
    </div>
  );
}