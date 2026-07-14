const SPOTLIGHT_R = 140;

interface RevealLayerProps {
  image: string;
  cursorX: number;
  cursorY: number;
  sizeClassName?: string;
  backgroundPosition?: string;
  backgroundSize?: string;
}

export default function RevealLayer({
  image,
  cursorX,
  cursorY,
  sizeClassName = 'bg-contain',
  backgroundPosition = 'center bottom -110px',
  backgroundSize,
}: RevealLayerProps) {
  const mask = `radial-gradient(circle ${SPOTLIGHT_R}px at ${cursorX}px ${cursorY}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,1) 85%)`;

  return (
    <div
      className={`absolute inset-0 bg-no-repeat pointer-events-none ${sizeClassName}`}
      style={{
        backgroundImage: `url(${image})`,
        backgroundPosition: backgroundPosition,
        backgroundSize: backgroundSize || undefined,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}
