import { motion } from 'framer-motion';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded-lg dark:from-white/5 dark:via-white/10 dark:to-white/5 ${className}`}
    />
  );
}

export function SkeletonCard({ isDark = true }: { isDark?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-2xl backdrop-blur-lg border p-5 ${
        isDark
          ? 'bg-white/[0.03] border-white/10'
          : 'bg-white/60 border-[#D4CFC7]/30'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <Skeleton className={`w-10 h-10 rounded-xl ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
      </div>
      <Skeleton className={`h-3 w-24 mb-2 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
      <Skeleton className={`h-8 w-16 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
    </motion.div>
  );
}

export function SkeletonStatsGrid({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonCard key={i} isDark={isDark} />
      ))}
    </div>
  );
}

export function SkeletonListItem({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className={`rounded-2xl backdrop-blur-lg border p-5 ${
      isDark
        ? 'bg-white/[0.03] border-white/10'
        : 'bg-white/60 border-[#D4CFC7]/30'
    }`}>
      <div className="flex items-center gap-4">
        <Skeleton className={`w-11 h-11 rounded-xl shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className={`h-3 w-3/4 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
          <Skeleton className={`h-2 w-1/2 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
        </div>
        <Skeleton className={`w-16 h-8 rounded-lg ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
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
  const borderClass = isDark ? 'border-white/10' : 'border-[#D4CFC7]/30';

  return (
    <div className={`rounded-2xl backdrop-blur-lg border overflow-hidden ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
      <div className={`p-4 border-b ${borderClass} flex gap-4`}>
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className={`h-4 flex-1 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className={`p-4 border-b ${borderClass} last:border-0 flex gap-4`}>
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className={`h-4 flex-1 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonRevenueCard({ isDark = true }: { isDark?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl backdrop-blur-lg border p-6 ${
        isDark
          ? 'bg-white/[0.03] border-white/10'
          : 'bg-white/60 border-[#D4CFC7]/30'
      }`}
    >
      <Skeleton className={`h-4 w-40 mb-2 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
      <Skeleton className={`h-9 w-32 mb-2 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
      <Skeleton className={`h-3 w-48 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
    </motion.div>
  );
}

/**
 * Car card skeleton for grid layouts
 */
export function SkeletonCarCard({ isDark = true }: { isDark?: boolean }) {
  const bgClass = isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30';

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${
        isDark
          ? 'bg-white/[0.03] border-white/10'
          : 'bg-white/60 border-[#D4CFC7]/30'
      }`}
    >
      {/* Image placeholder */}
      <Skeleton className={`aspect-[16/10] ${bgClass} rounded-none`} />

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className={`h-4 w-3/4 ${bgClass}`} />
            <Skeleton className={`h-3 w-1/2 ${bgClass}`} />
          </div>
          <Skeleton className={`w-12 h-6 rounded-full ${bgClass}`} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Skeleton className={`h-5 w-24 ${bgClass}`} />
          <Skeleton className={`h-4 w-16 ${bgClass}`} />
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
