import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { api, type AnalyticsPeriod } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const TIME_FILTERS = [
  { id: 'today', label: 'Hari Ini' },
  { id: '7days', label: '7 Hari' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'year', label: 'Tahun Ini' },
];

const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const MOCK_CHART_DATA: Record<string, { days: string[]; values: number[] }> = {
  today: { days: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00'], values: [0, 0, 1500000, 3500000, 4500000, 3000000, 2000000] },
  '7days': { days: DAYS_ID, values: [4500000, 6800000, 5200000, 7800000, 6500000, 8900000, 7200000] },
  month: { days: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'], values: [28000000, 32000000, 29000000, 35000000] },
  year: { days: MONTHS_ID, values: [450000000, 520000000, 480000000, 550000000, 620000000, 680000000, 720000000, 750000000, 690000000, 780000000, 820000000, 950000000] },
};

function getPeriodForApi(filter: string): AnalyticsPeriod {
  if (filter === 'today' || filter === '7days') return '7d';
  if (filter === 'month') return '30d';
  return '1y';
}

export function RevenueChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedFilter, setSelectedFilter] = useState('7days');
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-analytics', selectedFilter],
    queryFn: () => api.getSuperAdminAnalytics(getPeriodForApi(selectedFilter)),
    staleTime: 5 * 60 * 1000,
  });

  // Use real API data if available, otherwise fall back to mock data
  const hasRealData = data?.revenueData && data.revenueData.length > 0;

  // Convert API data to chart format if available
  const realChartData = hasRealData ? {
    days: data!.revenueData.map((d: { date: string }) => {
      // Format date based on filter
      const date = new Date(d.date);
      if (selectedFilter === 'today') {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      } else if (selectedFilter === '7days') {
        return date.toLocaleDateString('id-ID', { weekday: 'short' });
      } else if (selectedFilter === 'month') {
        return `Minggu ${Math.ceil(date.getDate() / 7)}`;
      } else {
        return date.toLocaleDateString('id-ID', { month: 'short' });
      }
    }),
    values: data!.revenueData.map((d: { revenue: number }) => d.revenue),
  } : null;

  const chartData = realChartData || MOCK_CHART_DATA[selectedFilter] || MOCK_CHART_DATA['7days'];
  const values = chartData.values;
  const days = chartData.days;

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const svgWidth = 400;
  const svgHeight = 200;
  const paddingTop = 15;
  const paddingBottom = 35;
  const paddingLeft = 50;
  const paddingRight = 15;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const points = values.map((v: number, i: number) => {
    const x = paddingLeft + (values.length === 1 ? chartWidth / 2 : (i / (values.length - 1)) * chartWidth);
    const y = paddingTop + chartHeight - ((v - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, value: v, day: days[i] };
  });

  const linePath = points.reduce((path: string, point: { x: number; y: number }, i: number) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = prev.x + (point.x - prev.x) * 2 / 3;
    return `${path} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;

  const lineColor = isDark ? '#22c55e' : '#10b981';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(139,115,85,0.7)';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const formatYLabel = (value: number) => {
    if (value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}rb`;
    return `Rp${value}`;
  };

  const totalRevenue = data?.totalRevenue ?? values.reduce((a: number, b: number) => a + b, 0);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Grafik Pendapatan
            </h2>
            {isLoading && (
              <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} title="Memuat data..." />
            )}
          </div>
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
              {formatRupiah(totalRevenue)}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20">
            <TrendingUp size={10} className="text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400">+15%</span>
            <span className="text-[10px] text-emerald-400/70">dari kemarin</span>
          </div>
        </div>

        <div className="relative w-full min-h-[150px] flex-1">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="lineGradientFillSA" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 1/7, 2/7, 3/7, 4/7, 5/7, 6/7, 1].map((ratio: number, i: number) => (
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

            <motion.path
              d={areaPath}
              fill="url(#lineGradientFillSA)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

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

            {points.map((point: { x: number; y: number; value: number; day: string }, i: number) => (
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

            {points.map((point: { x: number; y: number }, i: number) => (
              <motion.circle
                key={`point-${i}`}
                cx={point.x}
                cy={point.y}
                r={hoveredPoint?.index === i ? 4 : 3}
                fill={hoveredPoint?.index === i ? (isDark ? '#0a0a0a' : '#ffffff') : lineColor}
                stroke={lineColor}
                strokeWidth={hoveredPoint?.index === i ? 2 : 1.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
              />
            ))}

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

            {[0, 1/7, 2/7, 3/7, 4/7, 5/7, 6/7, 1].map((ratio: number, i: number) => (
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

            {points.map((point: { x: number; day: string }, i: number) => {
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
        </div>
      </div>
    </motion.div>
  );
}