import { useMemo } from 'react';
import type { Car } from '../lib/api';
import { useTheme } from '../hooks/useTheme';

interface FleetArcMenuProps {
  cars: Car[];
  activeIndex: number;
  visible: boolean;
  rotation: number;
  onSelect: (index: number) => void;
}

export default function FleetArcMenu({
  cars,
  activeIndex,
  visible,
  rotation,
  onSelect,
}: FleetArcMenuProps) {
  const numCars = cars.length;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { angleStep, radius } = useMemo(() => {
    // Spread evenly around 270 degrees (3/4 circle)
    const totalAngle = 270;
    // Number of gaps = number of cars
    const step = numCars > 1 ? totalAngle / (numCars - 1) : 0;
    // Radius based on number of cars to fill the space
    const r = numCars <= 3 ? 120 : numCars <= 5 ? 140 : numCars <= 8 ? 170 : 200;
    return { angleStep: step, radius: r };
  }, [numCars]);

  const visibleCars = useMemo(() => {
    return cars.map((car, i) => {
      // Start from top-left (-135 deg = -135°), go clockwise
      // -135° is top-left, 135° is bottom-left
      const baseAngle = -135 + i * angleStep;
      const angle = baseAngle + rotation;
      const rad = (angle * Math.PI) / 180;

      // Position on circle (centered on left side)
      const centerX = radius;
      const centerY = radius;
      const x = centerX + radius * Math.cos(rad);
      const y = centerY + radius * Math.sin(rad);

      // Calculate distance from "front" position (directly left = 180°)
      // The active car should be at the left side
      const normalizedAngle = ((angle % 360) + 360) % 360;
      let distFromFront = Math.abs(normalizedAngle - 180);
      if (distFromFront > 180) distFromFront = 360 - distFromFront;

      const isFront = i === activeIndex && distFromFront < angleStep / 2;

      // Fade based on distance from front
      const opacity = Math.max(0.25, 1 - distFromFront / 120);
      const scale = Math.max(0.6, 1 - distFromFront / 150);

      return { car, i, x, y, isFront, opacity, scale };
    });
  }, [cars, activeIndex, rotation, angleStep, radius]);

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        right: `calc(-1 * ${radius}px + 60px)`,
        width: radius * 2,
        height: radius * 2,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Guide text */}
      <div
        className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Geser untuk pilih armada</span>
      </div>

      {/* Arc guide line - bottom half of circle */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: isDark ? 0.3 : 0.15 }}
      >
        <circle
          cx={radius}
          cy={radius}
          r={radius - 5}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Car buttons */}
      {visibleCars.map(({ car, i, x, y, isFront, opacity, scale }) => (
        <button
          key={car.id}
          onClick={() => onSelect(i)}
          className="absolute cursor-pointer"
          style={{
            left: x,
            top: y,
            opacity,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <span
            className={`whitespace-nowrap text-right pr-2 block text-sm font-medium transition-colors ${
              isFront
                ? isDark ? 'text-white' : 'text-slate-900'
                : isDark ? 'text-white/50' : 'text-slate-500'
            }`}
          >
            {car.nama}
          </span>
        </button>
      ))}
    </div>
  );
}
