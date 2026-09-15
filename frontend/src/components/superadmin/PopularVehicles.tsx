import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

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
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Kendaraan Populer
        </h3>
        <Link
          to="/superadmin/armada/approval"
          className={`text-xs font-medium ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Lihat Semua
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col bg-transparent">
                <div className="h-16 bg-transparent mb-1 flex items-center justify-center">
                  <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                </div>
                <div className={`p-2.5 rounded-xl backdrop-blur-md border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                  <div className={`h-3 w-3/4 rounded mb-1.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-2 w-full rounded mb-1.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-2.5 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                </div>
              </div>
            ))}
          </>
        ) : !vehicles?.length ? (
          <p className={`text-sm col-span-3 text-center py-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Belum ada kendaraan
          </p>
        ) : (
          vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              to={`/armada/${vehicle.id}`}
              state={{ from: '/superadmin', fromLabel: 'Dashboard Super Admin' }}
              className={`group p-3 rounded-2xl border transition-all duration-300 flex flex-col hover:-translate-y-1 ${
                isDark
                  ? 'bg-white/[0.05] hover:bg-white/[0.10] border-white/10 hover:border-white/20 text-white shadow-lg shadow-black/20'
                  : 'sa-glass-light hover:bg-white/50 border-white/70 text-slate-900 shadow-sm shadow-slate-200/50'
              }`}
            >
              {/* Gambar Mobil */}
              <div className="h-20 relative overflow-hidden flex items-center justify-center rounded-xl mb-2 bg-black/5 dark:bg-white/5">
                {vehicle.thumbnail ? (
                  <img
                    src={vehicle.thumbnail}
                    alt={vehicle.nama}
                    className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-105 filter drop-shadow-md"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">🚗</span>
                  </div>
                )}
              </div>

              {/* Informasi Mobil */}
              <div>
                <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {vehicle.nama}
                </p>
                {vehicle.namaInstansi && (
                  <p className={`text-[10px] font-medium truncate mt-0.5 ${
                    isDark ? 'text-white/50' : 'text-slate-500'
                  }`}>
                    🏢 {vehicle.namaInstansi}
                  </p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <span className="text-xs font-extrabold">{vehicle.bookingCount}x</span>
                  <span className="text-[10px] opacity-80 font-medium">penyewaan</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
