import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

export function TodayBookings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['superadmin-today-bookings'],
    queryFn: api.getTodayBookings,
    staleTime: 2 * 60 * 1000,
  });

  const stats = [
    { key: 'completed', label: 'Selesai', color: 'bg-emerald-500' },
    { key: 'running', label: 'Berjalan', color: 'bg-purple-500' },
    { key: 'pending', label: 'Menunggu', color: 'bg-amber-500' },
    { key: 'cancelled', label: 'Dibatalkan', color: 'bg-red-500' },
  ] as const;

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Booking Hari Ini
      </h3>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <div className={`h-3 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                <div className={`h-3 w-8 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map((stat) => {
            const value = (bookings?.[stat.key] as number) ?? 0;
            const total = bookings?.total ?? 1;
            const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

            return (
              <div key={stat.key}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                    {stat.label}
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {value}
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${stat.color}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
