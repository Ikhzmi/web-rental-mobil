import type { FleetCar } from '../data/fleet';

interface FleetArcMenuProps {
  cars: FleetCar[];
  activeIndex: number;
  visible: boolean;
  rotation: number;
  onSelect: (index: number) => void;
}

const ANGLE_STEP = 26; 
const RADIUS = 230; 
export default function FleetArcMenu({
  cars,
  activeIndex,
  visible,
  rotation,
  onSelect,
}: FleetArcMenuProps) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        right: `calc(-1 * ${RADIUS}px + 92px)`,
        width: RADIUS * 2,
        height: RADIUS * 2,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {cars.map((car, i) => {
        const angle = i * ANGLE_STEP + rotation; // 0deg = pointing right (hidden)
        const rad = (angle * Math.PI) / 180;
        const x = RADIUS + RADIUS * Math.cos(rad + Math.PI); // +PI flips so 0 = pointing left
        const y = RADIUS + RADIUS * Math.sin(rad + Math.PI);

        // Distance from the "front" position (directly left) drives
        // opacity/scale so off-arc items fade and shrink.
        let delta = ((angle % 360) + 360) % 360;
        if (delta > 180) delta -= 360;
        const frontDistance = Math.abs(delta);
        const isFront = i === activeIndex && frontDistance < ANGLE_STEP / 2;
        const opacity = Math.max(0, 1 - frontDistance / 100);
        const scale = Math.max(0.65, 1 - frontDistance / 220);

        if (opacity <= 0.02) return null;

        return (
          <button
            key={car.id}
            onClick={() => onSelect(i)}
            className="absolute whitespace-nowrap text-right pr-2 transition-colors"
            style={{
              left: x,
              top: y,
              opacity,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          >
            <span className={`text-sm font-medium ${isFront ? 'text-white' : 'text-white/50'}`}>
              {car.brand}
            </span>
          </button>
        );
      })}

      {/* faint arc guide line for visual polish */}
      <div
        className="absolute inset-0 rounded-full border border-white/10 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 40px rgba(255,255,255,0.03)' }}
      />
    </div>
  );
}
