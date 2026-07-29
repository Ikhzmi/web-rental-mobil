import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const STATUS_COLORS: Record<string, string> = {
  'Menunggu Bayar': '#f59e0b',
  'Dikonfirmasi': '#3b82f6',
  'Berjalan': '#8b5cf6',
  'Selesai': '#10b981',
  'Dibatalkan': '#ef4444',
};

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

export function BookingDoughnutChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-analytics-bookings'],
    queryFn: () => api.getSuperAdminAnalytics('30d'),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = data?.bookingStatusData?.map((item) => ({
    name: item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#94a3b8',
  })) ?? [];

  const totalBookings = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)} h-full`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Statistik Booking
      </h3>

      <div className="flex flex-col items-center justify-center gap-4 h-[calc(100%-40px)]">
        {/* Pie Chart */}
        <div className="relative w-36 h-36 flex-shrink-0">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
                isDark ? 'border-white/20 border-t-blue-400' : 'border-slate-200 border-t-blue-500'
              }`} />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600">
              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>No data</span>
            </div>
          )}
          {!isLoading && chartData.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalBookings}</p>
              <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Total</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className={`h-3 w-20 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-6 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>
              ))}
            </>
          ) : chartData.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada data booking</p>
          ) : (
            chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{item.name}</span>
                </div>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
