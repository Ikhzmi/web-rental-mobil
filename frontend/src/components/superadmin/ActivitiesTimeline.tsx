import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle, AlertCircle, CreditCard, Building2, Car, User } from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

function getActivityIcon(type: string, isDark: boolean) {
  const iconMap: Record<string, { icon: typeof Clock; color: string }> = {
    booking_confirmed: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/20' },
    payment_received: { icon: CreditCard, color: 'text-blue-400 bg-blue-500/20' },
    instansi_registered: { icon: Building2, color: 'text-purple-400 bg-purple-500/20' },
    vehicle_approved: { icon: Car, color: 'text-cyan-400 bg-cyan-500/20' },
    customer_registered: { icon: User, color: 'text-amber-400 bg-amber-500/20' },
    refund_processed: { icon: AlertCircle, color: 'text-red-400 bg-red-500/20' },
  };
  return iconMap[type] || { icon: Clock, color: isDark ? 'text-white/40 bg-white/10' : 'text-slate-400 bg-slate-100' };
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function ActivitiesTimeline() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: activities, isLoading } = useQuery({
    queryKey: ['superadmin-activities'],
    queryFn: api.getSuperAdminActivities,
    staleTime: 2 * 60 * 1000,
  });

  const activitiesList = activities ?? [];

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Aktivitas Terbaru
      </h3>

      <div className="space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-white/10' : 'bg-slate-100'} animate-pulse`} />
                <div className="flex-1">
                  <div className={`h-3 w-3/4 rounded mb-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-2 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                </div>
              </div>
            ))}
          </>
        ) : !activitiesList.length ? (
          <p className={`text-sm text-center py-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Belum ada aktivitas
          </p>
        ) : (
          activitiesList.slice(0, 5).map((activity) => {
            const { icon: Icon, color } = getActivityIcon(activity.type, isDark);
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {activity.title}
                  </p>
                  <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    {formatTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
