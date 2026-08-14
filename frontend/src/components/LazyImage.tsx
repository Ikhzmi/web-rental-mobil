import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  aspectRatio?: string;
}

/**
 * Lazy-loaded image component with loading placeholder and error handling
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  aspectRatio,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Loading placeholder */}
      {!loaded && !error && (
        <div
          className={`absolute inset-0 animate-pulse bg-slate-200 ${className}`}
          aria-hidden="true"
        />
      )}

      {/* Error state */}
      {error && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${className}`}
          aria-label="Gagal memuat gambar"
        >
          <ImageIcon className="text-slate-400" size={32} />
        </div>
      )}

      {/* Actual image */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${className} ${
            loaded ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-300`}
        />
      )}
    </div>
  );
}

/**
 * Avatar image component with fallback
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className = '',
}: {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`rounded-full bg-slate-200 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-slate-500 text-sm font-medium">
          {(alt || 'U')[0].toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Avatar'}
      onError={() => setError(true)}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Car card image with aspect ratio container
 */
export function CarCardImage({
  src,
  alt,
}: {
  src?: string;
  alt?: string;
}) {
  return (
    <LazyImage
      src={src || ''}
      alt={alt || 'Car image'}
      wrapperClassName="aspect-[16/10] overflow-hidden rounded-t-2xl"
      className="w-full h-full object-cover"
    />
  );
}
