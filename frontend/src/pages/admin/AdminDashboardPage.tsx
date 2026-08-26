import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon,
  Clock, CheckCircle, Car as CarIcon,
  CreditCard, AlertTriangle,
  CarFront, CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import {
  api,
  type InstansiDashboardData,
  type InstansiDashboardTrends,
  type InstansiRevenueSeries,
} from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonStatsGrid, SkeletonList } from '../../components/Skeleton';
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

// Section 1: Stats Card - Clean style like SuperAdmin (no icon)

function StatCard({
  label,
  value,
  change,
  sparklineData,
  caption,
  index,
  isDark,
}: {
  label: string;
  value: string | number;
  /** Persentase perubahan nyata vs kemarin. Undefined = tidak ada data historis
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}
    >
      {/* Label */}
      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{label}</p>

      {/* Value - Large Number */}
      <p className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>

      {/* Trend Badge + Sparkline on right (hanya jika ada data nyata) */}
      <div className="flex items-center justify-between">
        {hasTrend ? (
          <div className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-full ${
            isPositive
              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
          }`}>
            <TrendIcon size={12} />
            {Math.abs(change ?? 0)}%
            <span className={`font-normal ${isDark ? 'text-white/40' : 'text-slate-400'}`}>vs kemarin</span>
          </div>
        ) : (
          <span className={`text-xs ${isDark ? 'text-white/35' : 'text-slate-400'}`}>{caption}</span>
        )}

        {/* Sparkline */}
        {sparklineData && (
          <div className="h-8 w-20">
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
            <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Total Pendapatan</p>
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
              <span className={`text-[10px] ${trendPendapatan >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>dari kemarin</span>
            </div>
          )}
        </div>

        {/* Line Chart Container */}
        <div className="relative w-full min-h-[150px] flex-1">
          {isSeriesLoading ? (
            <div className={`absolute inset-0 rounded-xl animate-pulse ${isDark ? 'bg-white/[0.03]' : 'bg-slate-100'}`} />
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

// Section 5: Today's Bookings
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
      className={`rounded-2xl overflow-hidden ${getGlassCardClass(isDark)}`}
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
      <div className="divide-y divide-white/5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-white/5 animate-pulse' : 'bg-[#F5F0E8] animate-pulse'}`} />
              <div className="flex-1">
                <div className={`h-3 w-20 rounded mb-2 ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
                <div className={`h-3 w-32 rounded ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
              </div>
            </div>
          ))
        ) : displayBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada booking hari ini</p>
          </div>
        ) : (
          displayBookings.map((booking) => (
            <Link
              to={`/admin/pesanan/${booking.id}`}
              key={booking.id}
              className={`flex items-center gap-3 p-4 transition-colors ${
                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-[#F5F0E8]'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'
              }`}>
                <Clock size={16} className={isDark ? 'text-white/50' : 'text-[#8B7355]/60'} />
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
          ))
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
              <div className={`w-14 h-10 rounded-lg ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-100 animate-pulse'}`} />
              <div className="flex-1">
                <div className={`h-3 w-24 rounded mb-1 ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
                <div className={`h-3 w-32 rounded ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
              </div>
            </div>
          ))
        ) : displayBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada mobil sedang disewa</p>
          </div>
        ) : (
          displayBookings.map((booking) => (
            <div key={booking.id} className="flex items-center gap-3 p-4">
              <div className={`w-14 h-10 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'
              }`}>
                <CarFront size={20} className={isDark ? 'text-white/50' : 'text-[#8B7355]/60'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {booking.car?.nama ?? '-'}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  {booking.profile?.nama ?? '-'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/70'}`}>Selesai</p>
                <p className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-700'}`}>
                  {new Date(booking.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <Link
        to="/admin/armada"
        className={`block p-4 text-center text-xs font-medium border-t ${
          isDark ? 'border-white/10 text-emerald-400 hover:text-emerald-300' : 'border-[#D4CFC7]/30 text-emerald-600 hover:text-emerald-700'
        }`}
      >
        Lihat Detail
      </Link>
    </motion.div>
  );
}

// Section 7: Recent Activities
function RecentActivitiesCard({ isDark, recentBookings }: { isDark: boolean; recentBookings?: InstansiDashboardData['recentBookings'] }) {
  const colorMap: Record<string, string> = {
    emerald: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    amber: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
    purple: isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
    pink: isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-600',
    cyan: isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600',
    // 'dibatalkan' pakai warna 'red' di statusIcons di bawah, tapi
    // sebelumnya tidak ada entry 'red' di sini — badge aktivitas booking
    // yang dibatalkan tampil tanpa warna latar sama sekali.
    red: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
  };

  const statusIcons: Record<string, { icon: LucideIcon; color: string }> = {
    menunggu_pembayaran: { icon: Clock, color: 'amber' },
    dikonfirmasi: { icon: CheckCircle, color: 'blue' },
    berjalan: { icon: CarIcon, color: 'purple' },
    selesai: { icon: CheckCircle, color: 'emerald' },
    dibatalkan: { icon: AlertTriangle, color: 'red' },
  };

  const statusLabels: Record<string, string> = {
    menunggu_pembayaran: 'Booking baru',
    dikonfirmasi: 'Dikonfirmasi',
    berjalan: 'Sedang berjalan',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
  };

  const activities = (recentBookings ?? []).map((booking) => {
    const config = statusIcons[booking.status] ?? { icon: Clock, color: 'cyan' };
    return {
      icon: config.icon,
      color: config.color,
      text: `${statusLabels[booking.status] ?? booking.status}: ${booking.car?.nama ?? '-'} - ${booking.profile?.nama ?? '-'}`,
      time: new Date(booking.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    };
  });

  const displayActivities = activities.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className={`rounded-2xl overflow-hidden ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Aktivitas Terbaru
        </h2>
      </div>
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {displayActivities.length === 0 ? (
          <p className={`text-sm text-center py-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada aktivitas</p>
        ) : (
          displayActivities.map((activity, i) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[activity.color]}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{activity.text}</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{activity.time}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// Section 8: Today's Returns
function TodayReturnsCard({ isDark }: { isDark: boolean }) {
  // Fetch bookings that finish today (sedang berjalan, tanggal selesai = hari ini)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all berjalan bookings to find ones ending today
  const { data: allOngoing, isLoading } = useQuery({
    queryKey: ['admin-ongoing-all'],
    queryFn: () => api.listAdminBookings({
      status: 'berjalan',
      limit: 50,
    }),
  });

  // Filter bookings that are supposed to return today
  const todayStr = today.toISOString().split('T')[0];
  const returnsToday = (allOngoing?.data ?? []).filter((b) => {
    const endDate = new Date(b.tanggalSelesai).toISOString().split('T')[0];
    return endDate === todayStr;
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
              <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-100 animate-pulse'}`} />
              <div className="flex-1">
                <div className={`h-3 w-24 rounded mb-1 ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
                <div className={`h-3 w-32 rounded ${isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
              </div>
            </div>
          ))
        ) : returnsToday.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada pengembalian hari ini</p>
          </div>
        ) : (
          returnsToday.map((booking) => (
            <div key={booking.id} className="flex items-center gap-3 p-4">
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'
              }`}>
                <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                  {new Date(booking.tanggalSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {booking.car?.nama ?? '-'}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  {booking.profile?.nama ?? '-'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// Section 9: Payments Summary
function PaymentsCard({ isDark, bookingStats }: { isDark: boolean; bookingStats?: Record<string, number> }) {
  const stats = bookingStats ?? {};

  const payments = [
    { label: 'Menunggu', value: stats.menunggu_pembayaran ?? 0, color: 'amber' },
    { label: 'Dikonfirmasi', value: (stats.dikonfirmasi ?? 0) + (stats.berjalan ?? 0), color: 'blue' },
    { label: 'Selesai', value: stats.selesai ?? 0, color: 'emerald' },
  ];

  const colorMap: Record<string, string> = {
    amber: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
    emerald: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
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
          Pembayaran
        </h2>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {payments.map((payment) => (
          <Link
            key={payment.label}
            to="/admin/pesanan"
            className={`text-center p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-[#F5F0E8]'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${colorMap[payment.color]}`}>
              <CreditCard size={16} />
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

  // Tren nyata (hari ini vs kemarin), dihitung dari booking asli — dipakai
  // untuk badge persentase di StatCard, bukan angka statis lagi.
  const { data: trends } = useQuery<InstansiDashboardTrends>({
    queryKey: ['instansi-dashboard-trends'],
    queryFn: () => api.getInstansiDashboardTrends(),
    retry: 1,
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid isDark={isDark} />
        <SkeletonList count={4} isDark={isDark} />
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
      {/* Section 1: Ringkasan Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatRupiah(trends?.pendapatanHariIni ?? 0)}
          change={trends?.trendPendapatan}
          sparklineData={trends?.sparklinePendapatan}
          index={0}
          isDark={isDark}
        />
        <StatCard
          label="Booking Aktif"
          value={activeBookings}
          caption="pesanan berjalan saat ini"
          index={1}
          isDark={isDark}
        />
        <StatCard
          label="Armada Tersedia"
          value={data.mobilTersedia}
          caption={`dari ${data.totalMobil} unit total`}
          index={2}
          isDark={isDark}
        />
        <StatCard
          label="Saldo Tertunda"
          value={formatRupiah(data.saldoTertunda)}
          caption="menunggu pencairan"
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
        <PaymentsCard isDark={isDark} bookingStats={data.bookingStats} />
      </div>
    </div>
  );
}