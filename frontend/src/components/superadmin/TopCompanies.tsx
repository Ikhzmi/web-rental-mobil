import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

export function TopCompanies() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: companies, isLoading } = useQuery({
    queryKey: ['superadmin-top-companies'],
    queryFn: api.getTopCompanies,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Perusahaan Rental Teratas
        </h3>
        <Link
          to="/superadmin/instansi"
          className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Lihat Semua
        </Link>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                <div className="flex-1">
                  <div className={`h-4 w-3/4 rounded mb-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                </div>
              </div>
            ))}
          </>
        ) : !companies?.length ? (
          <p className={`text-sm text-center py-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada data</p>
        ) : (
          companies.map((company, index) => (
            <div key={company.id} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-amber-500/20 text-amber-400'
                  : index === 1 ? 'bg-slate-400/20 text-slate-300'
                    : index === 2 ? 'bg-amber-600/20 text-amber-500'
                      : isDark ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-500'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {company.namaInstansi}
                </p>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  {formatRupiah(company.totalRevenue)}
                </p>
              </div>
              <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                company.growth >= 0
                  ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                  : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              }`}>
                {company.growth > 0 ? '+' : ''}{company.growth}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
