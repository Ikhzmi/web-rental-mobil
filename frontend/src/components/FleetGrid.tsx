import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import type { Car, Kategori } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(useGSAP);

const KATEGORI_LABEL: Record<Kategori, string> = {
  city_car: 'City Car',
  hatchback: 'Hatchback',
  suv: 'SUV',
  mpv: 'MPV',
  minibus: 'Minibus',
  pickup: 'Pickup',
  mewah: 'Mewah',
  electric: 'Electric',
};

interface FleetGridProps {
  cars: Car[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function FleetGrid({ cars, activeIndex, onSelect }: FleetGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
            isDark
              ? i === activeIndex
                ? 'bg-white/10 border-white/30'
                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
              : i === activeIndex
                ? 'bg-white/90 border-blue-200 shadow-lg backdrop-blur-xl'
                : 'bg-white/60 border-white/80 backdrop-blur-xl hover:bg-white/80 hover:border-blue-200'
          }`}
        >
          {/* Top highlight */}
          <div className={`
            absolute top-0 left-4 right-4 h-px
            ${isDark
              ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/90 to-transparent'
            }
          `} />

          <div
            className="w-full h-20 sm:h-24 bg-contain bg-bottom bg-no-repeat mb-2"
            style={{
              backgroundImage: car.images && car.images.length > 0
                ? `url(${car.images[0].url})`
                : 'none',
            }}
          />
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</p>
          <p className={`text-xs ${isDark ? 'text-white/45' : 'text-slate-500'}`}>{KATEGORI_LABEL[car.kategori]}</p>
          <p className={`text-xs mt-1 font-medium ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            {formatRupiah(Number(car.hargaPerHari))}/hari
          </p>
        </button>
      ))}
    </div>
  );
}
