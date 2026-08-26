import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { useMockDataContext } from '../../contexts/MockDataContext';
import { MOCK_BOOKING_STATUS_DATA } from '../../lib/mockData';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const STATUS_COLORS: Record<string, string> = {
  'Menunggu Bayar': '#f59e0b',
  'Dikonfirmasi': '#3b82f6',
  'Berjalan': '#8b5cf6',
  'Selesai': '#10b981',
  'Dibatalkan': '#ef4444',
};

// Map backend status to display label
const STATUS_LABELS: Record<string, string> = {
  'menunggu_pembayaran': 'Menunggu Bayar',
  'dikonfirmasi': 'Dikonfirmasi',
  'berjalan': 'Berjalan',
  'selesai': 'Selesai',
  'dibatalkan': 'Dibatalkan',
};

export function BookingDoughnutChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { useMockData } = useMockDataContext();

  // Ambil data dari dashboard endpoint (sudah kumulatif semua waktu)
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['superadmin-dashboard'],
    queryFn: api.getSuperAdminDashboard,
    staleTime: 5 * 60 * 1000,
    enabled: !useMockData,
  });

  // Transform bookingStats dari backend ke format chart
  const bookingStats = dashboardData?.bookingStats ?? {};
  const chartData = Object.entries(bookingStats)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[STATUS_LABELS[status]] || '#94a3b8',
    }));

  const totalBookings = chartData.reduce((sum, d) => sum + d.value, 0);

  // Use mock data when needed
  const mockChartData = MOCK_BOOKING_STATUS_DATA?.map((item) => ({
    name: item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#94a3b8',
  })) ?? [];
  const mockTotal = mockChartData.reduce((sum, d) => sum + d.value, 0);

  const displayChartData = useMockData ? mockChartData : chartData;
  const displayTotal = useMockData ? mockTotal : totalBookings;
  const isDataLoading = useMockData ? false : isLoading;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Statistik Booking
          </h2>
          <Link
            to="/superadmin/bookings"
            className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lihat Semua
          </Link>
        </div>
      </div>
      <div className="p-4 flex flex-1">
        {/* Left: Pie Chart */}
        <div className="w-2/5 flex items-center justify-center">
          <div className="relative w-36 h-36">
            {isDataLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`w-10 h-10 border-2 rounded-full animate-spin ${
                  isDark ? 'border-white/20 border-t-blue-400' : 'border-slate-200 border-t-blue-500'
                }`} />
              </div>
            ) : displayChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {displayChartData.map((entry, index) => (
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
            {!isDataLoading && displayChartData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayTotal}</p>
                <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Total</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Legend */}
        <div className="flex-1 flex flex-col justify-center pl-4">
          {isDataLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className={`h-3 w-24 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-6 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>
              ))}
            </div>
          ) : displayChartData.length === 0 ? (
            <p className={`text-sm text-center ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada data booking</p>
          ) : (
            <div className="space-y-1.5">
              {displayChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{item.name}</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}