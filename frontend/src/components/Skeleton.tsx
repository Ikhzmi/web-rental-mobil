import { motion } from 'framer-motion';

/**
 * Batang skeleton dengan efek SHIMMER (sapuan cahaya) + warna track yang
 * sadar-tema: gelap memakai putih transparan, terang memakai slate gelap
 * transparan supaya selalu terlihat di kedua mode.
 *
 * Catatan: JANGAN pakai `animate-pulse` bersamaan dengan shimmer — pulse
 * mengubah opacity seluruh elemen dan merusak efek sapuan.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-lg bg-slate-900/10 dark:bg-white/10 ${className}`}
    >
      <span className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />
    </div>
  );
}

/** Warna container kartu skeleton: bening ala glass di kedua mode. */
function cardContainer(isDark: boolean): string {
  return `rounded-2xl backdrop-blur-xl border ${
    isDark
      ? 'bg-white/[0.03] border-white/10'
      : 'bg-white/40 border-white/60 shadow-sm'
  }`;
}

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export function SkeletonCard({ isDark = true }: { isDark?: boolean }) {
  return (
    <motion.div {...fadeIn} className={`${cardContainer(isDark)} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </motion.div>
  );
}

export function SkeletonStatsGrid({ isDark = true, count = 4 }: { isDark?: boolean; count?: number }) {
  return (
    <div className={`grid gap-4 ${count > 2 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} isDark={isDark} />
      ))}
    </div>
  );
}

export function SkeletonListItem({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className={`${cardContainer(isDark)} p-5`}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
        <Skeleton className="w-16 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5, isDark = true }: { count?: number; isDark?: boolean }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <SkeletonListItem key={i} isDark={isDark} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, isDark = true }: { rows?: number; cols?: number; isDark?: boolean }) {
  const borderClass = isDark ? 'border-white/10' : 'border-white/60';

  return (
    <div className={`${cardContainer(isDark)} overflow-hidden`}>
      <div className={`p-4 border-b ${borderClass} flex gap-4`}>
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className={`p-4 border-b ${borderClass} last:border-0 flex gap-4`}>
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton area grafik: blok chart + sumbu + legenda.
 * Ukuran menyerupai kartu chart 2-kolom dashboard (tinggi ~300px).
 */
export function SkeletonChart({ isDark = true, height = 'h-64' }: { isDark?: boolean; height?: string }) {
  return (
    <motion.div {...fadeIn} className={`${cardContainer(isDark)} p-5 sm:p-6`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <Skeleton className={`w-full ${height} rounded-2xl`} />
      <div className="flex items-center gap-4 mt-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </motion.div>
  );
}

/**
 * Skeleton panel generik: judul + N baris (untuk breakdown finansial,
 * daftar aktivitas, ringkasan, dsb).
 */
export function SkeletonPanel({
  isDark = true,
  rows = 4,
  titleWidth = 'w-40',
}: {
  isDark?: boolean;
  rows?: number;
  titleWidth?: string;
}) {
  return (
    <motion.div {...fadeIn} className={`${cardContainer(isDark)} p-5`}>
      <Skeleton className={`h-4 ${titleWidth} mb-4`} />
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2 w-1/3" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton tombol kembali + judul halaman.
 */
export function BackButtonSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-24 rounded-full" />
      <Skeleton className="h-8 w-40 rounded-full" />
    </div>
  );
}

/**
 * Skeleton halaman detail 2-kolom: hero + section kiri, kartu sticky kanan.
 */
export function SkeletonDetail({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <motion.div {...fadeIn} className={`${cardContainer(isDark)} p-5`}>
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-3 w-1/3 mb-4" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </motion.div>
        <motion.div {...fadeIn} className={`${cardContainer(isDark)} p-5 space-y-3`}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </motion.div>
      </div>
      <div>
        <motion.div {...fadeIn} className={`${cardContainer(isDark)} p-5 lg:sticky lg:top-24 space-y-3`}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-3 w-2/3" />
        </motion.div>
      </div>
    </div>
  );
}

export function SkeletonRevenueCard({ isDark = true }: { isDark?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className={`${cardContainer(isDark)} p-6`}
    >
      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-3 w-48" />
    </motion.div>
  );
}

/**
 * Skeleton kartu horizontal besar: gambar kiri + konten kanan.
 * Cermin presisi ApprovalCard/PublishedCarCard superadmin:
 * breakpoint lg, kolom gambar 380-420px + thumbnail, kolom kanan berisi
 * baris judul+harga, 3 kotak spek, kotak info, dan 2 tombol aksi.
 */
export function SkeletonWideCard({ isDark = true }: { isDark?: boolean }) {
  return (
    <motion.div {...fadeIn} className={`${cardContainer(isDark)} overflow-hidden`}>
      <div className="flex flex-col lg:flex-row">
        {/* Kolom gambar */}
        <div className="lg:w-[380px] xl:w-[420px] p-5 flex flex-col justify-between shrink-0">
          <div className="relative">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Skeleton className="w-14 h-11 rounded-lg shrink-0" />
            <Skeleton className="w-14 h-11 rounded-lg shrink-0" />
            <Skeleton className="w-14 h-11 rounded-lg shrink-0" />
          </div>
        </div>
        {/* Kolom detail */}
        <div className="flex-1 p-5 lg:pl-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56 rounded-xl" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
              <Skeleton className="h-8 w-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <Skeleton className="h-[76px] rounded-2xl" />
              <Skeleton className="h-[76px] rounded-2xl" />
              <Skeleton className="h-[76px] rounded-2xl" />
            </div>
            <Skeleton className="h-16 w-full rounded-2xl mb-4" />
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Skeleton className="h-[52px] w-full sm:flex-1 rounded-2xl" />
            <Skeleton className="h-[52px] w-full sm:w-44 rounded-2xl" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Car card skeleton for grid layouts
 */
export function SkeletonCarCard({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className={`${cardContainer(isDark)} overflow-hidden`}>
      {/* Image placeholder */}
      <Skeleton className="aspect-[16/10] rounded-none" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-12 h-6 rounded-full" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Car grid skeleton for search/filter loading states
 */
export function SkeletonCarGrid({ count = 6, isDark = true }: { count?: number; isDark?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonCarCard key={i} isDark={isDark} />
      ))}
    </div>
  );
}

/**
 * Skeleton kalender bulanan: header hari + 35 sel tanggal.
 * Ukuran sel aspect-square menyerupai DayPicker di detail armada.
 */
export function SkeletonCalendarGrid() {
  return (
    <motion.div {...fadeIn} className="w-full">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-1">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-3 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-full" />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton kartu auth terpusat (login/callback): ikon + judul + baris + tombol.
 */
export function SkeletonAuthCard() {
  return (
    <motion.div {...fadeIn} className="w-full max-w-md space-y-5">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="w-16 h-16 rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </motion.div>
  );
}

/**
 * Skeleton section halaman publik (pengganti spinner SectionLoader).
 * Varian disesuaikan dengan bentuk section aslinya agar tidak lompat.
 */
export function SectionSkeleton({ variant = 'cards' }: {
  variant?: 'showcase' | 'steps' | 'features' | 'testimonial' | 'faq' | 'banner' | 'footer' | 'cards';
}) {
  if (variant === 'showcase') {
    // FleetConfigurator: bar judul + panggung mobil + dots
    return (
      <div className="px-5 sm:px-10 md:px-14 max-w-6xl mx-auto py-20">
        <div className="flex items-start justify-between mb-10">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-10 w-56 rounded-2xl" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-8 w-36 rounded-2xl ml-auto" />
            <Skeleton className="h-3 w-16 rounded-full ml-auto" />
          </div>
        </div>
        <Skeleton className="h-[38vh] sm:h-[46vh] md:h-[52vh] w-full rounded-3xl" />
        <div className="flex justify-center gap-3 mt-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className={i === 2 ? 'h-1.5 w-5 rounded-full' : 'h-1.5 w-1.5 rounded-full'} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'testimonial') {
    // Testimonials: kartu kutipan terpusat
    return (
      <div className="max-w-3xl mx-auto py-20 px-5">
        <div className="text-center mb-12 space-y-3">
          <Skeleton className="h-3 w-24 rounded-full mx-auto" />
          <Skeleton className="h-9 w-72 rounded-2xl mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full rounded mx-auto" />
        </div>
        <div className="rounded-2xl p-8 md:p-10 space-y-4">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-full rounded" />
          <Skeleton className="h-5 w-2/3 rounded" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="w-11 h-11 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'faq') {
    // FaqPreview: daftar pertanyaan lipat
    return (
      <div className="max-w-3xl mx-auto py-20 px-5 space-y-3">
        <div className="text-center mb-10 space-y-3">
          <Skeleton className="h-9 w-56 rounded-2xl mx-auto" />
          <Skeleton className="h-4 w-80 max-w-full rounded mx-auto" />
        </div>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (variant === 'banner') {
    // CtaBanner: panel ajakan lebar
    return (
      <div className="max-w-6xl mx-auto py-20 px-5 sm:px-10">
        <div className="rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-8 w-2/3 rounded-2xl" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
          <div className="flex gap-3 shrink-0">
            <Skeleton className="h-12 w-36 rounded-2xl" />
            <Skeleton className="h-12 w-36 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    // ModernFooter: kolom tautan
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-10 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-5/6 rounded" />
              <Skeleton className="h-3 w-4/6 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // steps | features | cards: grid kartu generik (HowItWorks, FeaturesSection)
  return (
    <div className="max-w-6xl mx-auto py-20 px-5 sm:px-10">
      <div className="text-center mb-12 space-y-3">
        <Skeleton className="h-3 w-24 rounded-full mx-auto" />
        <Skeleton className="h-9 w-64 rounded-2xl mx-auto" />
        <Skeleton className="h-4 w-96 max-w-full rounded mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl p-6 md:p-8 space-y-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-5/6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
