import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function NotificationCenter() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['superadmin-notifications'],
    queryFn: () => api.getSuperAdminNotifications(false),
    staleTime: 2 * 60 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications'] });
    },
  });

  const notifications = notificationsData?.data ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Notifikasi
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
              isDark ? 'bg-white/10 text-white/60' : 'bg-blue-100 text-slate-600'
            }`}>
              {unreadCount} baru
            </span>
          )}
          <Link
            to="/superadmin/notifications"
            className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lihat Semua
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2 p-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                <div className="flex-1">
                  <div className={`h-4 w-3/4 rounded mb-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} animate-pulse`} />
                </div>
              </div>
            ))}
          </>
        ) : notifications.length === 0 ? (
          <p className={`text-sm text-center py-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tidak ada notifikasi</p>
        ) : (
          notifications.slice(0, 4).map((notification) => (
            <div
              key={notification.id}
              className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                !notification.isRead
                  ? isDark ? 'bg-white/5' : 'bg-slate-50'
                  : ''
              }`}
              onClick={() => {
                if (!notification.isRead) markReadMutation.mutate(notification.id);
              }}
            >
              <div className="flex items-start gap-2">
                {!notification.isRead && (
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isDark ? 'bg-blue-400' : 'bg-white/50'}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {notification.title}
                  </p>
                  <p className={`text-[10px] line-clamp-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {notification.message}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
