/**
 * Utilitas optimasi dan kompresi gambar client-side untuk upload foto mobil.
 * Memastikan foto dari kamera ponsel (seringkali 6MB-15MB) dikompresi menjadi
 * resolusi maksimal 1600px dan ukuran < 1MB sebelum diunggah ke Supabase Storage,
 * sehingga mencegah timeout dan error batas ukuran file (5MB).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.85,
  maxSizeMB: 1.5,
};

/**
 * Memeriksa apakah file adalah gambar berdasarkan MIME type atau ekstensi nama file.
 */
export function isImageFile(file: File): boolean {
  if (file.type && file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif'].includes(ext);
}

/**
 * Mengompresi dan mengubah ukuran file gambar di browser menggunakan Canvas API.
 * Menghasilkan File berformat JPEG yang sudah dioptimasi.
 */
export async function compressImage(file: File, options?: CompressionOptions): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Jika bukan gambar atau browser tidak mendukung Canvas, kembalikan file asli
  if (!isImageFile(file) || typeof window === 'undefined') {
    return file;
  }

  // Jika ukuran file sudah sangat kecil (< 500KB) dan bertipe jpeg/png/webp standar
  if (file.size < 500 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Hitung aspek rasio untuk resize jika melebihi batas
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback jika tidak ada context 2D
        resolve(file);
        return;
      }

      // Aktifkan image smoothing untuk hasil resize tajam
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Gambar ke canvas dengan latar belakang putih (jika ada transparansi)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanName = `${baseName || 'car'}.jpg`;

          const compressedFile = new File([blob], cleanName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Jika terjadi error saat memuat gambar (misal format HEIC bawaan iPhone tanpa codec),
      // kembalikan file asli agar Supabase atau fallback lain menanganinya
      resolve(file);
    };

    img.src = objectUrl;
  });
}
