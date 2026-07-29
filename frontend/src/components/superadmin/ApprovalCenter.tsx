import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

export function ApprovalCenter() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['superadmin-approvals'],
    queryFn: api.getSuperAdminApprovals,
    staleTime: 2 * 60 * 1000,
  });

  const totalPending = (approvals?.rentalCompanies ?? 0) + (approvals?.vehicles ?? 0) + (approvals?.drivers ?? 0) + (approvals?.payments ?? 0);

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)} flex flex-col`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Pusat Persetujuan
      </h3>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className={`h-4 w-24 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                <div className={`h-4 w-8 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <span className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Rental Company</span>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                (approvals?.rentalCompanies ?? 0) > 0
                  ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                  : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {approvals?.rentalCompanies ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <span className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Kendaraan</span>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                (approvals?.vehicles ?? 0) > 0
                  ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                  : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {approvals?.vehicles ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <span className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Pengemudi</span>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                (approvals?.drivers ?? 0) > 0
                  ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                  : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {approvals?.drivers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <span className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Pembayaran</span>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                (approvals?.payments ?? 0) > 0
                  ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                  : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {approvals?.payments ?? 0}
              </span>
            </div>
          </>
        )}
      </div>

      {totalPending > 0 && (
        <Link
          to="/superadmin/instansi"
          className={`block w-full text-center text-xs font-medium mt-3 py-2.5 rounded-xl transition-all ${
            isDark
              ? 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/10'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          Lihat Semua
        </Link>
      )}
    </div>
  );
}
