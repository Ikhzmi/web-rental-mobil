import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

export function CommissionCard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: commission, isLoading } = useQuery({
    queryKey: ['superadmin-commission'],
    queryFn: api.getCommissionStats,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Komisi Bulanan
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          <div className={`h-8 w-3/4 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
          <div className={`h-6 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
          <div className={`h-3 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Komisi diterima</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatRupiah(commission?.commission ?? 0)}
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Revenue</span>
              <span className={`font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                {formatRupiah(commission?.revenue ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Target</span>
              <span className={`font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                {formatRupiah(commission?.targetCommission ?? 0)}
              </span>
            </div>
          </div>

          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (commission?.targetProgress ?? 0) >= 100 ? 'bg-emerald-500'
                  : (commission?.targetProgress ?? 0) >= 50 ? 'bg-blue-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(commission?.targetProgress ?? 0, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-slate-500'} mt-1 block`}>
            {commission?.targetProgress ?? 0}% Pencapaian
          </span>

          {commission?.growth !== undefined && (
            <p className={`text-xs font-semibold mt-3 ${
              commission.growth >= 0
                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                : isDark ? 'text-red-400' : 'text-red-600'
            }`}>
              {commission.growth >= 0 ? '+' : ''}{commission.growth}% dari bulan lalu
            </p>
          )}
        </>
      )}
    </div>
  );
}
