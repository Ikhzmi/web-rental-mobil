import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

export function PopularVehicles() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['superadmin-popular-vehicles'],
    queryFn: api.getPopularVehicles,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Kendaraan Populer
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`rounded-xl overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div className="h-14 bg-slate-200 animate-pulse" />
                <div className="p-2">
                  <div className={`h-3 w-3/4 rounded mb-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-2 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                </div>
              </div>
            ))}
          </>
        ) : !vehicles?.length ? (
          <p className={`text-sm col-span-3 text-center py-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada kendaraan</p>
        ) : (
          vehicles.map((vehicle) => (
            <div key={vehicle.id} className={`rounded-xl overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div className="h-14 relative overflow-hidden">
                {vehicle.thumbnail ? (
                  <img src={vehicle.thumbnail} alt={vehicle.nama} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                    <span className="text-lg">🚗</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className={`text-[10px] font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {vehicle.nama}
                </p>
                <div className={`flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <span className="text-xs font-bold">{vehicle.bookingCount}x</span>
                  <span className="text-[10px] opacity-70">penyewaan</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
