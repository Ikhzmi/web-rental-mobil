import { useState, useEffect as useEffectDash } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon,
  Car as CarIcon,
  CreditCard, AlertTriangle,
  CarFront, CalendarClock,
  Activity, ExternalLink, Search, X, ClipboardList, RotateCcw,
} from 'lucide-react';
import {
  api,
  type InstansiDashboardData,
  type InstansiDashboardTrends,
  type InstansiRevenueSeries,
  type InstansiActivity,
} from '../../lib/api';
import { formatRupiah, formatCompactRupiah } from '../../lib/pricing';
import { Skeleton, SkeletonStatsGrid, SkeletonChart, SkeletonPanel } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const getGlassCardClass = (isDark: boolean) => isDark ? 'sa-glass-dark' : 'sa-glass-light';

// Time filter options
const TIME_FILTERS = [
  { id: 'today', label: 'Hari Ini' },
  { id: '7days', label: '7 Hari' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'year', label: 'Tahun Ini' },
] as const;

/** Hook sederhana untuk deteksi mobile (<768px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffectDash(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// Section 1: Stats Card - Clean style like SuperAdmin (no icon)

function StatCard({
  label,
  value,
  rawValue,
  change,
  sparklineData,
  caption,
  index,
  isDark,
}: {
  label: string;
  value: string | number;
  /** Nilai numerik mentah (tanpa format) — dipakai untuk format compact di mobile. */
  rawValue?: number;
  /** Persentase perubahan nyata vs bulan lalu. Undefined = tidak ada data historis
   *  yang jujur untuk dihitung, jadi badge tren tidak ditampilkan sama sekali
   *  (lebih baik daripada menampilkan angka rekaan). */
  change?: number;
  /** Data sparkline nyata 7 hari terakhir. Opsional, sejalan dengan `change`. */
  sparklineData?: number[];
  /** Teks kecil pengganti badge tren untuk metrik snapshot (mis. "dari 12 unit"). */
  caption?: string;
  index: number;
  isDark: boolean;
}) {
  const hasTrend = change !== undefined;
  const isPositive = (change ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;
  const sparklineColor = isPositive ? '#22c55e' : '#ef4444';
  const isMobile = useIsMobile();

  // Pada mobile, gunakan format compact (Rp1,2jt, Rp250rb) untuk mencegah overflow
  const displayValue = isMobile && rawValue !== undefined
    ? formatCompactRupiah(rawValue)
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 md:p-5 rounded-2xl overflow-hidden ${getGlassCardClass(isDark)}`}
    >
      {/* Label */}
      <p className={`text-[10px] md:text-xs font-medium mb-1.5 md:mb-2 truncate ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{label}</p>

      {/* Value - Large Number — enlarged font on mobile (text-2xl), standard size on desktop (md:text-3xl) */}
      <p className={`text-2xl md:text-3xl font-bold mb-1.5 md:mb-2 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayValue}</p>

      {/* Trend Badge + Sparkline on right (hanya jika ada data nyata) */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        {hasTrend ? (
          <div className={`flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-semibold px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-full min-w-0 truncate ${
            isPositive
              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
          }`}>
            <TrendIcon size={12} className="shrink-0" />
            <span className="shrink-0">{Math.abs(change ?? 0)}%</span>
            <span className={`font-normal hidden sm:inline ${isDark ? 'text-white/40' : 'text-slate-400'}`}>vs bulan lalu</span>
          </div>
        ) : (
          <span className={`text-[10px] md:text-xs truncate ${isDark ? 'text-white/35' : 'text-slate-400'}`}>{caption}</span>
        )}

        {/* Sparkline */}
        {sparklineData && (
          <div className="h-6 w-14 md:h-8 md:w-20 shrink-0">
            <Sparklines data={sparklineData} margin={2}>
              <SparklinesLine
                style={{ strokeWidth: 2, fill: 'none' }}
                color={sparklineColor}
              />
            </Sparklines>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Section 3: Revenue Line Chart
function RevenueChart({ isDark, trendPendapatan }: { isDark: boolean; trendPendapatan?: number }) {
  const [selectedFilter, setSelectedFilter] = useState<'today' | '7days' | 'month' | 'year'>('7days');
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);

  // Data agregat nyata dari booking asli, dihitung server-side per bucket
  // waktu (bukan rata-rata/acak seperti implementasi sebelumnya).
  const { data: seriesData, isLoading: isSeriesLoading } = useQuery<InstansiRevenueSeries>({
    queryKey: ['admin-revenue-series', selectedFilter],
    queryFn: () => api.getInstansiRevenueSeries(selectedFilter),
    staleTime: 5 * 60 * 1000,
  });

  const chartDays = seriesData?.labels ?? [];
  const chartValues = seriesData?.values ?? [];

  const values = chartValues.length > 0 ? chartValues : [0];
  const days = chartDays.length > 0 ? chartDays : ['No Data'];
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  // Responsive SVG dimensions - larger to prevent label cutoff
  const svgWidth = 400;
  const svgHeight = 200;
  const paddingTop = 15;
  const paddingBottom = 35;
  const paddingLeft = 50;
  const paddingRight = 15;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate points
  const points = values.map((v, i) => {
    const x = paddingLeft + (values.length === 1 ? chartWidth / 2 : (i / (values.length - 1)) * chartWidth);
    const y = paddingTop + chartHeight - ((v - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, value: v, day: days[i] };
  });

  // Create smooth curve path
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = prev.x + (point.x - prev.x) * 2 / 3;
    return `${path} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  // Create area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;

  const lineColor = isDark ? '#22c55e' : '#10b981';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(139,115,85,0.7)';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Format Y-axis labels - smaller and more detailed
  const formatYLabel = (value: number) => {
    if (value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}rb`;
    return `Rp${value}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Grafik Pendapatan
          </h2>
          <div className="flex items-center gap-1 flex-wrap">
            {TIME_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                  selectedFilter === filter.id
                    ? isDark ? 'bg-white/15 text-white' : 'bg-[#F5F0E8] text-slate-900'
                    : isDark ? 'text-white/40 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-3">
          <div>
            <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Total Pendapatan Bersih</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatRupiah(values.reduce((a, b) => a + b, 0))}
            </p>
          </div>
          {/* Badge tren hanya tampil untuk filter "Hari Ini" — satu-satunya
              perbandingan periode yang bisa dihitung jujur dari data booking
              (hari ini vs kemarin). Untuk filter lain, badge disembunyikan
              daripada menampilkan angka rekaan. */}
          {selectedFilter === 'today' && trendPendapatan !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
              trendPendapatan >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              {trendPendapatan >= 0 ? (
                <TrendingUp size={10} className="text-emerald-400" />
              ) : (
                <TrendingDownIcon size={10} className="text-red-400" />
              )}
              <span className={`text-[10px] font-medium ${trendPendapatan >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trendPendapatan >= 0 ? '+' : ''}{trendPendapatan}%
              </span>
              <span className={`text-[10px] ${trendPendapatan >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>dari bulan lalu</span>
            </div>
          )}
        </div>

        {/* Line Chart Container */}
        <div className="relative w-full min-h-[150px] flex-1">
          {isSeriesLoading ? (
            <Skeleton className="absolute inset-0 rounded-xl" />
          ) : (
          <>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="lineGradientFillNew" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines - horizontal (8 lines for more detail) */}
            {[0, 1/7, 2/7, 3/7, 4/7, 5/7, 6/7, 1].map((ratio, i) => (
              <line
                key={`h-${i}`}
                x1={paddingLeft}
                y1={paddingTop + chartHeight * (1 - ratio)}
                x2={svgWidth - paddingRight}
                y2={paddingTop + chartHeight * (1 - ratio)}
                stroke={gridColor}
                strokeWidth="1"
              />
            ))}

            {/* Area fill */}
            <motion.path
              d={areaPath}
              fill="url(#lineGradientFillNew)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Line */}
            <motion.path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />

            {/* Interactive hover areas */}
            {points.map((point, i) => (
              <rect
                key={`hover-${i}`}
                x={point.x - (chartWidth / values.length) / 2}
                y={paddingTop}
                width={chartWidth / values.length}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (svgRect) {
                    const relativeX = ((rect.left - svgRect.left + rect.width / 2) / svgRect.width) * 100;
                    setHoveredPoint({ index: i, x: relativeX, y: (point.y / svgHeight) * 100 });
                  }
                }}
              />
            ))}

            {/* Data points */}
            {points.map((point, i) => (
              <motion.circle
                key={`point-${i}`}
                cx={point.x}
                cy={point.y}
                r={hoveredPoint?.index === i ? 4 : 3}
                fill={hoveredPoint?.index === i ? (isDark ? '#0a0a0a' : '#ffffff') : lineColor}
                stroke={lineColor}
                strokeWidth={hoveredPoint?.index === i ? "2" : "1.5"}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
              />
            ))}

            {/* Hover line indicator */}
            {hoveredPoint && (
              <>
                <line
                  x1={points[hoveredPoint.index].x}
                  y1={paddingTop}
                  x2={points[hoveredPoint.index].x}
                  y2={paddingTop + chartHeight}
                  stroke={lineColor}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.5"
                />
              </>
            )}

            {/* Y-axis labels - 8 detailed labels aligned with grid lines */}
            {[0, 1/7, 2/7, 3/7, 4/7, 5/7, 6/7, 1].map((ratio, i) => (
              <text
                key={`ylabel-${i}`}
                x={paddingLeft - 12}
                y={paddingTop + chartHeight * (1 - ratio) + 3}
                fill={textColor}
                fontSize="7"
                textAnchor="end"
                fontWeight="400"
              >
                {formatYLabel(minValue + (maxValue - minValue) * ratio)}
              </text>
            ))}

            {/* X-axis labels - positioned below chart area */}
            {points.map((point, i) => {
              // For many data points, only show some labels
              const showLabel = days.length <= 8 || i % Math.ceil(days.length / 7) === 0 || i === days.length - 1;
              if (!showLabel) return null;
              return (
                <text
                  key={`xlabel-${i}`}
                  x={point.x}
                  y={svgHeight - 6}
                  fill={textColor}
                  fontSize="8"
                  textAnchor="middle"
                  fontWeight="400"
                >
                  {point.day}
                </text>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className={`absolute pointer-events-none z-10 px-2 py-1.5 rounded-lg shadow-lg text-xs whitespace-nowrap ${
                isDark ? 'bg-[#1a1a1a] border border-white/20' : 'bg-white border border-slate-200'
              }`}
              style={{
                left: `${hoveredPoint.x}%`,
                top: '8px',
                transform: 'translateX(-50%)',
              }}
            >
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatRupiah(points[hoveredPoint.index].value)}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                {points[hoveredPoint.index].day}
              </p>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Section 4: Booking Statistics Doughnut
function BookingStatsChart({ isDark, bookingStats }: { isDark: boolean; bookingStats?: Record<string, number> }) {
  const stats = bookingStats ? [
    { label: 'Menunggu Bayar', value: bookingStats.menunggu_pembayaran ?? 0, color: 'amber' },
    { label: 'Dikonfirmasi', value: bookingStats.dikonfirmasi ?? 0, color: 'blue' },
    { label: 'Berjalan', value: bookingStats.berjalan ?? 0, color: 'purple' },
    { label: 'Selesai', value: bookingStats.selesai ?? 0, color: 'emerald' },
    { label: 'Dibatalkan', value: bookingStats.dibatalkan ?? 0, color: 'red' },
  ] : [];
  const total = stats.reduce((a, b) => a + b.value, 0);

  const colorMap: Record<string, string> = {
    amber: '#f59e0b',
    blue: '#6366f1',
    purple: '#a855f7',
    emerald: '#10b981',
    red: '#ef4444',
  };

  // Calculate stroke-dasharray for doughnut
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Statistik Booking
        </h2>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {/* Doughnut Chart - centered */}
        <div className="flex items-center justify-center flex-1">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {stats.map((stat) => {
                const percentage = stat.value / total;
                const dashLength = circumference * percentage;
                const dashOffset = -offset;
                offset += dashLength;

                return (
                  <circle
                    key={stat.label}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={colorMap[stat.color]}
                    strokeWidth="8"
                    strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{total}</p>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Total</p>
            </div>
          </div>
        </div>
        {/* Legend - below, full width */}
        <div className="space-y-1.5 mt-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-white/5 dark:bg-white/5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colorMap[stat.color] }}
              />
              <span className={`text-xs flex-1 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                {stat.label}
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Section 5: Today's Bookings — with car thumbnails and CTA at bottom
function TodayBookingsCard({ isDark }: { isDark: boolean }) {
  // Fetch today's bookings from API
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todayBookings, isLoading } = useQuery({
    queryKey: ['admin-today-bookings'],
    queryFn: () => api.listAdminBookings({
      dari: today.toISOString(),
      sampai: tomorrow.toISOString(),
      limit: 10,
    }),
  });

  const statusColors: Record<string, string> = {
    menunggu_pembayaran: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
    dikonfirmasi: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    berjalan: isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
    selesai: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    dibatalkan: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
  };

  const statusLabels: Record<string, string> = {
    menunggu_pembayaran: 'Menunggu Bayar',
    dikonfirmasi: 'Dikonfirmasi',
    berjalan: 'Berjalan',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
  };

  const bookings = todayBookings?.data ?? [];
  const displayBookings = bookings.length > 0 ? bookings.slice(0, 5) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Booking Hari Ini
          </h2>
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
      <div className="divide-y divide-white/5 flex-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="w-16 sm:w-20 aspect-[16/9] rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-3 w-20 rounded mb-2" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            </div>
          ))
        ) : displayBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada booking hari ini</p>
          </div>
        ) : (
          displayBookings.map((booking) => {
            const imageUrl = booking.car?.images?.[0]?.url;
            return (
              <Link
                to={`/admin/pesanan/${booking.id}`}
                key={booking.id}
                className={`flex items-center gap-3 p-4 transition-colors ${
                  isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-[#F5F0E8]'
                }`}
              >
                <div className="relative w-16 sm:w-20 aspect-[16/9] rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={booking.car?.nama ?? 'Mobil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center rounded-xl ${
                      isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'
                    }`}>
                      <CarFront size={18} className={isDark ? 'text-white/50' : 'text-[#8B7355]/60'} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/70'}`}>
                    {new Date(booking.tanggalMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {booking.car?.nama ?? '-'}
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {booking.profile?.nama ?? '-'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status] ?? ''}`}>
                  {statusLabels[booking.status] ?? booking.status}
                </span>
              </Link>
            );
          })
        )}
      </div>
      <Link
        to="/admin/pesanan"
        className={`block p-4 text-center text-xs font-medium border-t ${
          isDark ? 'border-white/10 text-emerald-400 hover:text-emerald-300' : 'border-[#D4CFC7]/30 text-emerald-600 hover:text-emerald-700'
        }`}
      >
        Lihat Semua Booking
      </Link>
    </motion.div>
  );
}

// Section 6: Rented Vehicles
function RentedVehiclesCard({ isDark }: { isDark: boolean }) {
  // Fetch ongoing bookings (sedang berjalan)
  const { data: ongoingBookings, isLoading } = useQuery({
    queryKey: ['admin-ongoing-bookings'],
    queryFn: () => api.listAdminBookings({
      status: 'berjalan',
      limit: 5,
    }),
  });

  const bookings = ongoingBookings?.data ?? [];
  const displayBookings = bookings.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Mobil Sedang Disewa
        </h2>
      </div>
      <div className="divide-y divide-white/5 flex-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="w-14 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 rounded mb-1" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            </div>
          ))
        ) : displayBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada mobil sedang disewa</p>
          </div>
        ) : (
          displayBookings.map((booking) => {
            const imageUrl = booking.car?.images?.[0]?.url;
            return (
              <Link
                key={booking.id}
                to={`/admin/pesanan/${booking.id}`}
                className={`flex items-center gap-3 p-4 transition-colors ${
                  isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-100/60'
                }`}
              >
                <div className="relative w-16 sm:w-20 aspect-[16/9] rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={booking.car?.nama ?? 'Mobil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center rounded-xl ${
                      isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'
                    }`}>
                      <CarFront size={18} className={isDark ? 'text-white/50' : 'text-[#8B7355]/60'} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {booking.car?.nama ?? '-'}
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {booking.profile?.nama ?? '-'}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    Berlangsung
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/70'}`}>Tgl Kembali</p>
                  <p className={`text-xs font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {new Date(booking.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
      <Link
        to="/admin/pesanan?status=berjalan"
        className={`block p-4 text-center text-xs font-medium border-t ${
          isDark ? 'border-white/10 text-emerald-400 hover:text-emerald-300' : 'border-[#D4CFC7]/30 text-emerald-600 hover:text-emerald-700'
        }`}
      >
        Lihat Detail
      </Link>
    </motion.div>
  );
}

// Section 7: Log Aktivitas Modal & Card
function ActivityLogModal({
  isOpen,
  onClose,
  activities,
  isDark = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  activities: InstansiActivity[];
  isDark?: boolean;
}) {
  const [filterTipe, setFilterTipe] = useState<'semua' | 'pesanan' | 'armada' | 'admin_activity'>('semua');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = activities.filter((act) => {
    const matchType = filterTipe === 'semua' || act.tipe === filterTipe;
    const matchSearch =
      !search.trim() ||
      act.judul.toLowerCase().includes(search.toLowerCase()) ||
      act.deskripsi.toLowerCase().includes(search.toLowerCase()) ||
      act.status.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[88vh] overflow-hidden ${
          isDark
            ? 'border-white/15 bg-zinc-950/90 backdrop-blur-2xl text-white shadow-black/90'
            : 'border-slate-200 bg-white text-slate-900 shadow-slate-300/50'
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}>
              <Activity size={18} />
            </div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Log Aktivitas Dashboard
              </h3>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Riwayat lengkap aktivitas pemesanan dan armada instansi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filters */}
        <div className={`p-4 border-b space-y-3 ${
          isDark ? 'border-white/10 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/30'
        }`}>
          <div className="relative">
            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Cari aktivitas atau status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none transition-all ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/35 focus:border-white/30'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'semua', label: 'Semua' },
              { id: 'admin_activity', label: 'Aktivitas Admin' },
              { id: 'pesanan', label: 'Pesanan' },
              { id: 'armada', label: 'Armada' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTipe(tab.id as 'semua' | 'pesanan' | 'armada' | 'admin_activity')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filterTipe === tab.id
                    ? isDark
                      ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                      : 'bg-slate-900 text-white shadow-sm'
                    : isDark
                      ? 'bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className={`text-[11px] ml-auto ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              {filtered.length} riwayat
            </span>
          </div>
        </div>

        {/* Activity List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className={`text-center py-12 text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              Tidak ada log aktivitas yang cocok
            </div>
          ) : (
            filtered.map((act) => {
              const isPesanan = act.tipe === 'pesanan';
              const isAdmin = act.tipe === 'admin_activity';
              return (
                <div
                  key={act.id}
                  className={`p-3.5 rounded-2xl transition-all flex items-start gap-3.5 border ${
                    isDark
                      ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                    isAdmin
                      ? isDark ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : isPesanan
                        ? isDark ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                        : isDark ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isAdmin ? <Activity size={16} /> : isPesanan ? <ClipboardList size={16} /> : <CarIcon size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`font-semibold text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {act.judul}
                      </h4>
                      <span className={`text-[10px] shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                        {new Date(act.waktu).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                      {act.deskripsi}
                    </p>
                    <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
                      isDark ? 'border-white/5' : 'border-slate-200/60'
                    }`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        Status: {act.status.replace(/_/g, ' ')}
                      </span>
                      {act.detailUrl && (
                        <Link
                          to={act.detailUrl}
                          onClick={onClose}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                            isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          <span>Lihat Rincian</span>
                          <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function RecentActivitiesCard({
  isDark,
  recentBookings,
}: {
  isDark: boolean;
  recentBookings?: InstansiDashboardData['recentBookings'];
}) {
  const [filter, setFilter] = useState<'semua' | 'pesanan' | 'armada' | 'admin_activity'>('semua');
  const [showAllModal, setShowAllModal] = useState(false);

  // Fetch real activities from backend
  const { data: apiActivities, isLoading: isActivitiesLoading } = useQuery<InstansiActivity[]>({
    queryKey: ['instansi-activities'],
    queryFn: () => api.getInstansiActivities(),
    refetchInterval: 30000,
    retry: 1,
  });

  // Fallback if needed
  const activities: InstansiActivity[] = (apiActivities && apiActivities.length > 0)
    ? apiActivities
    : (recentBookings ?? []).map((b) => ({
        id: `book-${b.id}`,
        tipe: 'pesanan' as const,
        judul: `Booking: ${b.car?.nama ?? 'Armada'}`,
        deskripsi: `Pesanan oleh ${b.profile?.nama ?? 'Pelanggan'} (${b.status.replace(/_/g, ' ')})`,
        status: b.status,
        waktu: b.createdAt,
        detailUrl: `/admin/pesanan/${b.id}`,
      }));

  const filtered = activities.filter((a) => {
    if (filter === 'semua') return true;
    return a.tipe === filter;
  });

  const displayActivities = filtered.slice(0, 6);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`rounded-2xl overflow-hidden flex flex-col ${getGlassCardClass(isDark)}`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
          isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-slate-900/10 text-slate-800'}`}>
              <Activity size={16} />
            </div>
            <div>
              <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Log Aktivitas
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                Pembaruan pesanan & armada terkini
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {(['semua', 'admin_activity', 'pesanan', 'armada'] as const).map((tab) => {
              const tabLabels: Record<string, string> = {
                semua: 'Semua',
                admin_activity: 'Admin',
                pesanan: 'Pesanan',
                armada: 'Armada',
              };
              return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === tab
                    ? isDark
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-slate-900 text-white shadow-xs'
                    : isDark
                      ? 'text-white/40 hover:text-white/70'
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tabLabels[tab] ?? tab}
              </button>
              );
            })}
          </div>
        </div>

        {/* Activity Items */}
        <div className="p-4 space-y-3 max-h-72 overflow-y-auto flex-1">
          {isActivitiesLoading && activities.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-2.5 w-40 rounded" />
                </div>
              </div>
            ))
          ) : displayActivities.length === 0 ? (
            <p className={`text-sm text-center py-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Belum ada log aktivitas
            </p>
          ) : (
            displayActivities.map((act, i) => {
              const isPesanan = act.tipe === 'pesanan';
              const isAdmin = act.tipe === 'admin_activity';
              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.04 }}
                  className={`p-2.5 rounded-xl transition-all border ${
                    isDark
                      ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5'
                      : 'bg-white/40 hover:bg-white/70 border-slate-200/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                      isAdmin
                        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                        : isPesanan
                          ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                          : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {isAdmin ? <Activity size={14} /> : isPesanan ? <ClipboardList size={14} /> : <CarIcon size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-semibold truncate ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                          {act.judul}
                        </p>
                        <span className={`text-[10px] shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {new Date(act.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 line-clamp-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        {act.deskripsi}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer Button to open Full Log Modal */}
        <div className={`p-3 border-t text-center ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className={`text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <span>Buka Semua Log Aktivitas ({activities.length})</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </motion.div>

      {/* Full Modal */}
      <AnimatePresence>
        {showAllModal && (
          <ActivityLogModal
            isOpen={showAllModal}
            onClose={() => setShowAllModal(false)}
            activities={activities}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Section 8: Today's Returns — timezone-safe local date comparison
function TodayReturnsCard({ isDark }: { isDark: boolean }) {
  // Use local date parts to avoid UTC timezone offset bug
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  // Get berjalan AND dikonfirmasi bookings to find ones ending today
  const { data: berjalanData, isLoading: isLoadingBerjalan } = useQuery({
    queryKey: ['admin-returns-berjalan'],
    queryFn: () => api.listAdminBookings({
      status: 'berjalan',
      limit: 50,
    }),
  });

  const { data: dikonfirmasiData, isLoading: isLoadingDikonfirmasi } = useQuery({
    queryKey: ['admin-returns-dikonfirmasi'],
    queryFn: () => api.listAdminBookings({
      status: 'dikonfirmasi',
      limit: 50,
    }),
  });

  const isLoading = isLoadingBerjalan || isLoadingDikonfirmasi;

  // Filter bookings that are supposed to return today using LOCAL date comparison
  const allBookings = [
    ...(berjalanData?.data ?? []),
    ...(dikonfirmasiData?.data ?? []),
  ];

  const returnsToday = allBookings.filter((b) => {
    const endDate = new Date(b.tanggalSelesai);
    return (
      endDate.getFullYear() === todayYear &&
      endDate.getMonth() === todayMonth &&
      endDate.getDate() === todayDate
    );
  }).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className={`rounded-2xl overflow-hidden ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Jadwal Pengembalian Hari Ini
          </h2>
          <CalendarClock size={16} className={isDark ? 'text-white/40' : 'text-[#8B7355]/60'} />
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 rounded mb-1" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
          ))
        ) : returnsToday.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada pengembalian hari ini</p>
          </div>
        ) : (
          returnsToday.map((booking) => {
            const imageUrl = booking.car?.images?.[0]?.url;
            return (
              <Link
                to={`/admin/pesanan/${booking.id}`}
                key={booking.id}
                className={`flex items-center gap-3 p-4 transition-colors ${
                  isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-[#F5F0E8]'
                }`}
              >
                <div className="relative w-16 sm:w-20 aspect-[16/9] rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={booking.car?.nama ?? 'Mobil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center rounded-xl ${
                      isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'
                    }`}>
                      <CarFront size={18} className={isDark ? 'text-white/50' : 'text-[#8B7355]/60'} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {booking.car?.nama ?? '-'}
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {booking.profile?.nama ?? '-'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-[#8B7355]/70'}`}>Kembali</p>
                  <p className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {new Date(booking.tanggalSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// Section 9: Payments Summary
function PaymentsCard({
  isDark,
  bookingStats,
  refundStats,
}: {
  isDark: boolean;
  bookingStats?: Record<string, number>;
  refundStats?: {
    pending: number;
    diproses: number;
    totalBerhasil: number;
  };
}) {
  const stats = bookingStats ?? {};

  const payments = [
    { label: 'Menunggu', value: stats.menunggu_pembayaran ?? 0, color: 'amber', to: '/admin/pesanan' },
    { label: 'Dikonfirmasi', value: (stats.dikonfirmasi ?? 0) + (stats.berjalan ?? 0), color: 'blue', to: '/admin/pesanan' },
    { label: 'Selesai', value: stats.selesai ?? 0, color: 'emerald', to: '/admin/pesanan' },
    { label: 'Refund', value: refundStats?.pending ?? 0, color: 'rose', to: '/admin/keuangan?tab=refunds' },
  ];

  const colorMap: Record<string, string> = {
    amber: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
    emerald: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    rose: isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0 }}
      className={`rounded-2xl overflow-hidden ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Ringkasan Finansial & Pembayaran
        </h2>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {payments.map((payment) => (
          <Link
            key={payment.label}
            to={payment.to}
            className={`text-center p-3 rounded-xl transition-all ${isDark ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'bg-[#F5F0E8] hover:bg-slate-100'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${colorMap[payment.color]}`}>
              {payment.label === 'Refund' ? <RotateCcw size={16} /> : <CreditCard size={16} />}
            </div>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {payment.value}
            </p>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              {payment.label}
            </p>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data, isLoading, isError } = useQuery<InstansiDashboardData>({
    queryKey: ['instansi-dashboard'],
    queryFn: () => api.getInstansiDashboard(),
  });

  // Tren nyata (bulan ini vs bulan lalu), dihitung dari booking asli — dipakai
  // untuk badge persentase di StatCard, bukan angka statis lagi.
  const { data: trends, isLoading: isTrendsLoading } = useQuery<InstansiDashboardTrends>({
    queryKey: ['instansi-dashboard-trends'],
    queryFn: () => api.getInstansiDashboardTrends(),
    retry: 1,
    throwOnError: false,
  });

  // Skeleton awal menunggu SEMUA data utama (dashboard + tren) supaya tidak
  // ada angka 0 / badge hilang yang pop-in setelah skeleton lenyap.
  if (isLoading || isTrendsLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid isDark={isDark} />
        <SkeletonChart isDark={isDark} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonPanel isDark={isDark} rows={3} />
          <SkeletonPanel isDark={isDark} rows={3} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-center py-20 rounded-2xl ${getGlassCardClass(isDark)}`}
      >
        <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl border ${
          isDark ? 'bg-red-500/20 border-red-500/30' : 'bg-red-50 border-red-200'
        }`}>
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Gagal memuat dashboard</p>
        <p className={`text-sm ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Silakan refresh halaman</p>
      </motion.div>
    );
  }

  const activeBookings = (data.bookingStats?.dikonfirmasi ?? 0) + (data.bookingStats?.berjalan ?? 0);

  return (
    <div className="space-y-6">
      {/* Info Refund Pending — informatif, bukan aksi admin */}
      {data.refundStats && data.refundStats.pending > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
              <RotateCcw size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {data.refundStats.pending} pesanan memiliki permintaan pengembalian dana
              </p>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                Total Selesai: {formatRupiah(data.refundStats.totalBerhasil ?? 0)} • Diproses oleh SuperAdmin (bukan admin rental)
              </p>
            </div>
          </div>
          <Link
            to="/admin/keuangan?tab=refunds"
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 border ${
              isDark
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
                : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>Pantau Status</span>
            <ExternalLink size={14} />
          </Link>
        </motion.div>
      )}

      {/* Section 1: Ringkasan Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatRupiah(trends?.pendapatanBulanIni ?? 0)}
          rawValue={trends?.pendapatanBulanIni ?? 0}
          change={trends?.trendPendapatan}
          sparklineData={trends?.sparklinePendapatan}
          caption={`setelah komisi ${data.komisiPlatformPersen ?? 10}%`}
          index={0}
          isDark={isDark}
        />
        <StatCard
          label="Booking Aktif"
          value={activeBookings}
          change={trends?.trendBookingAktif}
          sparklineData={trends?.sparklineBookingAktif}
          caption="pesanan berjalan saat ini"
          index={1}
          isDark={isDark}
        />
        <StatCard
          label="Armada Tersedia"
          value={data.mobilTersedia}
          // Tanpa badge tren: ini snapshot posisi saat ini, bukan metrik
          // bulanan — badge "+0% vs bulan lalu" menyesatkan.
          change={undefined}
          sparklineData={trends?.sparklineArmadaTersedia}
          caption={`dari ${data.totalMobil} unit total`}
          index={2}
          isDark={isDark}
        />
        <StatCard
          label="Saldo Tertunda"
          value={formatRupiah(data.saldoTertunda)}
          rawValue={data.saldoTertunda}
          change={trends?.trendSaldoTertunda}
          sparklineData={trends?.sparklineSaldoTertunda}
          caption={`bersih (setelah komisi ${data.komisiPlatformPersen ?? 10}%)`}
          index={3}
          isDark={isDark}
        />
      </div>

      {/* Section 2: Chart + Stats + Rented Vehicles Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 h-full">
          <RevenueChart isDark={isDark} trendPendapatan={trends?.trendPendapatan} />
        </div>
        <div className="h-full">
          <BookingStatsChart isDark={isDark} bookingStats={data.bookingStats} />
        </div>
        <div className="h-full">
          <RentedVehiclesCard isDark={isDark} />
        </div>
      </div>

      {/* Section 3: Today's Bookings + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayBookingsCard isDark={isDark} />
        <RecentActivitiesCard isDark={isDark} recentBookings={data.recentBookings} />
      </div>

      {/* Section 4: Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayReturnsCard isDark={isDark} />
        <PaymentsCard isDark={isDark} bookingStats={data.bookingStats} refundStats={data.refundStats} />
      </div>
    </div>
  );
}