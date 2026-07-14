import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import type { FleetCar } from '../data/fleet';

gsap.registerPlugin(useGSAP);

interface FleetGridProps {
  cars: FleetCar[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function FleetGrid({ cars, activeIndex, onSelect }: FleetGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        gridRef.current?.children ?? [],
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
      );
    },
    { scope: gridRef }
  );

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 w-full max-w-5xl mx-auto px-5"
    >
      {cars.map((car, i) => (
        <button
          key={car.id}
          onClick={() => onSelect(i)}
          className={`group relative rounded-2xl border p-4 flex flex-col items-center text-center transition-all duration-300 ${
            i === activeIndex
              ? 'bg-white/10 border-white/30'
              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
          }`}
        >
          <div
            className="w-full h-20 sm:h-24 bg-contain bg-bottom bg-no-repeat mb-2"
            style={{ backgroundImage: `url(${car.image})` }}
          />
          <p className="text-white text-sm font-medium">{car.brand}</p>
          <p className="text-white/45 text-xs">{car.model}</p>
          <p className="text-[#2563eb] text-xs mt-1 font-medium">{car.pricePerDay}/day</p>
        </button>
      ))}
    </div>
  );
}
