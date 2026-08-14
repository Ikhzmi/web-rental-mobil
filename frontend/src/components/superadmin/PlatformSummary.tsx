import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

export function PlatformSummary() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: summary, isLoading } = useQuery({
    queryKey: ['superadmin-platform-summary'],
    queryFn: api.getPlatformSummary,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Platform Summary
      </h3>

      <div className="space-y-2">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className={`h-3 w-20 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                <div className={`h-3 w-12 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between py-1.5">
              <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Rental Aktif</span>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {summary?.totalRentalCompanies ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Kendaraan</span>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {summary?.totalVehicles ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Booking</span>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {summary?.totalBookings ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Pelanggan</span>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {summary?.totalCustomers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Total Revenue</span>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatRupiah(summary?.totalRevenue ?? 0)}
              </span>
            </div>
            {summary && (
              <div className={`pt-2 mt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between py-1.5">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Avg Monthly</span>
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatRupiah(summary.avgMonthlyRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Commission</span>
                  <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatRupiah(summary.platformCommission)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
