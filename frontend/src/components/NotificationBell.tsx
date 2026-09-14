import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Clock,
  Car,
  CreditCard,
  ShieldCheck,
  Wallet,
  Star,
  MessageSquare,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { api, type Notification as NotificationType } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface NotificationBellProps {
  /**
   * Kustomisasi posisi popover atau kelas tombol jika diperlukan
   */
  align?: 'left' | 'right';
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  align = 'right',
  className = '',
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ambil data notifikasi
  const { data: response, isLoading } = useQuery({
    queryKey: ['notifications', filterUnread],
    queryFn: () => api.getNotifications({ unreadOnly: filterUnread, limit: 20 }),
    refetchInterval: 20 * 1000, // Polling setiap 20 detik
    staleTime: 10 * 1000,
  });

  const notifications = response?.data ?? [];
  const unreadCount = response?.unreadCount ?? 0;

  // Mutasi tandai 1 notifikasi dibaca
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mutasi tandai semua dibaca
  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Handle klik di luar untuk menutup popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handler klik pada item notifikasi
  const handleNotificationClick = (item: NotificationType) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    const actionUrl = item.data?.actionUrl as string | undefined;
    if (actionUrl) {
      setIsOpen(false);
      navigate(actionUrl);
    }
  };

  // Format waktu relatif dalam bahasa Indonesia
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} mnt lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Helper ikon berdasarkan jenis notifikasi
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CreditCard size={15} />
          </div>
        );
      case 'approval':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <ShieldCheck size={15} />
          </div>
        );
      case 'disbursement':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Wallet size={15} />
          </div>
        );
      case 'review':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Star size={15} />
          </div>
        );
      case 'chat':
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0 border border-cyan-500/20">
            <MessageSquare size={15} />
          </div>
        );
      case 'booking':
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Car size={15} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-neutral-500/15 text-neutral-400 flex items-center justify-center shrink-0 border border-neutral-500/20">
            <AlertCircle size={15} />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Tombol Lonceng Notifikasi */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
          isOpen
            ? isDark
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-neutral-100 text-neutral-900 border border-neutral-300'
            : isDark
            ? 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/10'
            : 'bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border border-neutral-200/80 shadow-sm'
        }`}
        aria-label="Notifikasi"
        title="Notifikasi"
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-neutral-900 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2.5 z-50 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0 sm:right-0' : 'left-0'
          } ${
            isDark
              ? 'bg-neutral-900/95 border-white/10 text-neutral-100 shadow-black/60'
              : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-300/60'
          }`}
        >
          {/* Header Popover */}
          <div className="p-4 border-b border-neutral-200/60 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/20">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className={`text-xs font-medium flex items-center gap-1 transition-colors px-2 py-1 rounded-lg ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-white/5'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title="Tandai semua telah dibaca"
              >
                <CheckCheck size={14} className="text-emerald-500" />
                <span>Baca semua</span>
              </button>
            )}
          </div>

          {/* Filter Tab: Semua vs Belum Dibaca */}
          <div className="px-4 pt-2 pb-1.5 flex gap-2 text-xs border-b border-neutral-200/40 dark:border-white/5">
            <button
              type="button"
              onClick={() => setFilterUnread(false)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                !filterUnread
                  ? isDark
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'bg-neutral-900 text-white shadow-sm'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterUnread(true)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterUnread
                  ? isDark
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'bg-neutral-900 text-white shadow-sm'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Belum Dibaca {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {/* Daftar Notifikasi */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-200/40 dark:divide-white/5 custom-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-2.5 text-neutral-400">
                  <Bell size={20} />
                </div>
                <p className="text-xs font-medium text-neutral-500">
                  {filterUnread ? 'Tidak ada notifikasi belum dibaca' : 'Belum ada notifikasi'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Aktivitas dan pembaruan penting akan muncul di sini
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const hasAction = Boolean(item.data?.actionUrl);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 flex gap-3 items-start transition-all cursor-pointer relative group ${
                      !item.isRead
                        ? isDark
                          ? 'bg-white/[0.04] hover:bg-white/[0.08]'
                          : 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                        : isDark
                        ? 'hover:bg-white/[0.03]'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    {/* Icon Tipe */}
                    {getNotificationIcon(item.type)}

                    {/* Isi Notifikasi */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 justify-between">
                        <p
                          className={`text-xs font-semibold truncate ${
                            !item.isRead
                              ? isDark
                                ? 'text-white'
                                : 'text-neutral-900'
                              : isDark
                              ? 'text-neutral-300'
                              : 'text-neutral-700'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 shrink-0 flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p
                        className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                          isDark ? 'text-neutral-400' : 'text-neutral-600'
                        }`}
                      >
                        {item.message}
                      </p>

                      {/* Tautan Aksi */}
                      {hasAction && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 group-hover:underline">
                          <span>Buka rincian</span>
                          <ChevronRight size={12} />
                        </div>
                      )}
                    </div>

                    {/* Indikator Belum Dibaca (Dot Biru) */}
                    {!item.isRead && (
                      <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
