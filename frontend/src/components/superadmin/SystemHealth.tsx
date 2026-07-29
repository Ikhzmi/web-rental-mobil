import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

function HealthIndicator({ label, status, value, isDark }: { label: string; status: string; value: string; isDark: boolean }) {
  const isOnline = status === 'online' || status === 'healthy';
  const statusColor = isOnline ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-700'}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{value}</span>
        <div className={`w-2 h-2 rounded-full ${statusColor} shadow-sm`} />
      </div>
    </div>
  );
}

export function SystemHealth() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: health, isLoading } = useQuery({
    queryKey: ['superadmin-system-health'],
    queryFn: api.getSystemHealth,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const hasAlerts = health && (
    (health.alerts?.failedDisbursements ?? 0) > 0 ||
    (health.alerts?.pendingDisbursements ?? 0) > 0
  );

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          System Health
        </h3>
        {health && (
          <div className={`flex items-center gap-1 text-xs ${hasAlerts ? 'text-amber-400' : 'text-emerald-400'}`}>
            {hasAlerts ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
            <span>{hasAlerts ? 'Peringatan' : 'Normal'}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className={`h-3 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                <div className={`h-3 w-12 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
              </div>
            ))}
          </>
        ) : health ? (
          <>
            <HealthIndicator label="Server" status={health.server.status} value={health.server.uptime} isDark={isDark} />
            <HealthIndicator label="Database" status={health.database.status} value={health.database.latency} isDark={isDark} />
            <HealthIndicator label="Storage" status={health.storage.status} value={health.storage.usage} isDark={isDark} />
            <HealthIndicator label="API" status={health.api.status} value={`${health.api.requestsPerMinute} rpm`} isDark={isDark} />
            <HealthIndicator label="System" status={health.cpu.status} value={health.cpu.usage} isDark={isDark} />

            {hasAlerts && (
              <div className={`mt-3 pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {health.alerts.failedDisbursements > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                    <AlertTriangle size={10} />
                    {health.alerts.failedDisbursements} pencairan gagal
                  </p>
                )}
                {health.alerts.pendingDisbursements > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>
                    <AlertTriangle size={10} />
                    {health.alerts.pendingDisbursements} pencairan diproses
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className={`text-sm text-center py-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Data tidak tersedia</p>
        )}
      </div>
    </div>
  );
}
