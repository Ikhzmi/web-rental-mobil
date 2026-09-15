import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';
import { Skeleton } from '../../components/Skeleton';

function getActivityIcon(type: string, isDark: boolean) {
  const iconMap: Record<string, { emoji: string; color: string }> = {
    booking_created: { emoji: '📋', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    booking_confirmed: { emoji: '🚗', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    booking_completed: { emoji: '✅', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    payment_received: { emoji: '💰', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    instansi_registered: { emoji: '🏢', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
    instansi_approved: { emoji: '🏬', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
    vehicle_approved: { emoji: '🚗', color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
    vehicle_registered: { emoji: '🚘', color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
    customer_registered: { emoji: '👤', color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
    refund_processed: { emoji: '🔄', color: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
    disbursement: { emoji: '💳', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    admin_activity: { emoji: '🔔', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  };
  return iconMap[type] || { emoji: '📌', color: isDark ? 'bg-white/10 text-white/70 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200' };
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

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
  instansiNama?: string | null;
}

export function ActivitiesTimeline() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: activities, isLoading } = useQuery<DashboardActivity[]>({
    queryKey: ['superadmin-activities'],
    queryFn: api.getSuperAdminActivities,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const activitiesList = activities ?? [];

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Aktivitas Terbaru
        </h3>
        <Link
          to="/superadmin/bookings"
          className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Lihat Semua
        </Link>
      </div>

      <div className="space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-3/4 rounded mb-1" />
                  <Skeleton className="h-2 w-1/2 rounded" />
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
            const { emoji, color } = getActivityIcon(activity.type, isDark);
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${color}`}>
                  <span>{emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <p className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activity.title}
                    </p>
                    {activity.instansiNama && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                        isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {activity.instansiNama}
                      </span>
                    )}
                  </div>
                  {activity.description && (
                    <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {activity.description}
                    </p>
                  )}
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
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
