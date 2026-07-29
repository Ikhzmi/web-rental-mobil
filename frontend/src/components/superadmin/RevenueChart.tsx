import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api, type AnalyticsPeriod } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '6B', value: '6m' },
  { label: '1T', value: '1y' },
];

function formatDate(dateStr: string, period: AnalyticsPeriod) {
  const date = new Date(dateStr);
  if (period === '7d') {
    return date.toLocaleDateString('id-ID', { weekday: 'short' });
  } else if (period === '30d' || period === '6m') {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

export function RevenueChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 500, height: 260 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setChartSize({ width: rect.width, height: rect.height });
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-analytics', period],
    queryFn: () => api.getSuperAdminAnalytics(period),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = data?.revenueData?.map((d) => ({
    ...d,
    date: formatDate(d.date, period),
  })) ?? [];

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Ringkasan Pendapatan
          </h3>
          <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Total: {data ? formatRupiah(data.totalRevenue) : '-'}
          </p>
        </div>

        <div className={`flex gap-1 p-1 rounded-xl ${
          isDark ? 'bg-white/10' : 'bg-slate-100/80'
        }`}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.value
                  ? isDark ? 'bg-blue-500/30 text-blue-400 shadow-lg' : 'bg-blue-500 text-white shadow'
                  : isDark ? 'text-white/50 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64" ref={containerRef}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
              isDark ? 'border-white/20 border-t-blue-400' : 'border-slate-200 border-t-blue-500'
            }`} />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada data revenue</p>
          </div>
        ) : (
          <LineChart data={chartData} width={chartSize.width} height={chartSize.height} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
            <Tooltip contentStyle={{
              backgroundColor: isDark ? 'rgba(26, 31, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
              borderRadius: '12px',
              color: isDark ? '#fff' : '#1e293b',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: isDark ? '#1a1f2e' : '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        )}
      </div>
    </div>
  );
}
