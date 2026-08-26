import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  ClipboardCheck,
  MessageSquare,
  Calendar,
  Settings,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../contexts/ToastContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { NotificationResponse } from '../../lib/api';
import bgDashboardDark from '../../assets/bg-dashboard-dark.jpg';
import bgDashboardLight from '../../assets/bg-dashboard-light.png';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/armada', label: 'Armada', icon: Car },
  { to: '/admin/pesanan', label: 'Pesanan', icon: ClipboardList },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/calendar', label: 'Calendar', icon: Calendar },
];

const ADMIN_BOTTOM_LINKS = [
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

export default function AdminLayout() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showTopNav, setShowTopNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const isHeaderHidden = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Fetch notifications for admin dashboard
  const { data: notificationsData } = useQuery<NotificationResponse>({
    queryKey: ['admin-notifications'],
    queryFn: () => api.getAdminNotifications(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  const notifications = notificationsData?.data ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const markAllAsRead = async () => {
    for (const notification of notifications) {
      if (!notification.isRead) {
        try {
          await api.markAdminNotificationRead(notification.id);
        } catch {
          // Individual errors are ignored, but show toast if all fail
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    showToast('success', 'Berhasil', 'Semua notifikasi telah dibaca');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval': return <AlertCircle size={18} className="text-amber-400" />;
      case 'booking': return <ClipboardCheck size={18} className="text-blue-400" />;
      case 'success': return <CheckCircle size={18} className="text-emerald-400" />;
      case 'payment': return <Info size={18} className="text-cyan-400" />;
      case 'error': return <XCircle size={18} className="text-red-400" />;
      default: return <Bell size={18} className="text-slate-400" />;
    }
  };

  const formatNotificationTime = (dateStr: string) => {
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
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const header = headerRef.current;
      const sidebar = sidebarRef.current;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowTopNav(false);
      } else {
        setShowTopNav(true);
      }

      if (sidebar) {
        if (currentScrollY > lastScrollY && currentScrollY > 60) {
          if (!isHeaderHidden.current) {
            isHeaderHidden.current = true;
            gsap.to(header, { y: -110, duration: 0.4, ease: 'power2.out' });
            gsap.to(sidebar, { top: 20, duration: 0.4, ease: 'power2.out' });
          }
        } else if (currentScrollY < lastScrollY) {
          if (isHeaderHidden.current) {
            isHeaderHidden.current = false;
            gsap.to(header, { y: 0, duration: 0.4, ease: 'power2.out' });
            gsap.to(sidebar, { top: 88, duration: 0.4, ease: 'power2.out' });
          }
        }
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const sidebarClass = isDark ? 'sa-glass-dark' : 'sa-glass-light';
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-slate-500';
  const textAccentClass = isDark ? 'text-white' : 'text-[#1F2937]';
  const borderClass = isDark ? 'border-white/10' : 'border-slate-200/60';

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundImage: `url(${isDark ? bgDashboardDark : bgDashboardLight})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Desktop Glassmorphic Sidebar - Rounded corners, below header */}
      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        style={{ top: '88px' }}
        className={`hidden lg:flex flex-col fixed bottom-4 left-3 z-40 ${sidebarClass} pt-6 pb-6 sa-sidebar-rounded`}
      >
        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2 overflow-hidden mt-2">
          {ADMIN_LINKS.map((link, index) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-center rounded-xl text-sm font-medium h-11
                    transition-all duration-300 overflow-hidden ${
                      isActive
                        ? isDark
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100/50 text-[#1F2937]'
                        : `${textMutedClass} hover:${textClass} ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100/30'}`
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="adminActiveIndicator"
                          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full ${
                            isDark ? 'bg-white' : 'bg-[#1F2937]'
                          }`}
                        />
                      )}
                      <div className={`relative z-10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full ${!isCollapsed ? 'pl-2' : ''}`}>
                        <Icon size={20} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                              className="whitespace-nowrap overflow-hidden"
                            >
                              {link.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom Links (Settings) */}
        <div className={`px-3 space-y-2 ${borderClass} pt-4 mt-2`}>
          {ADMIN_BOTTOM_LINKS.map((link, index) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (ADMIN_LINKS.length + index) * 0.05 }}
              >
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-center rounded-xl text-sm font-medium h-11
                    transition-all duration-300 overflow-hidden ${
                      isActive
                        ? isDark
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100/50 text-[#1F2937]'
                        : `${textMutedClass} hover:${textClass} ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100/30'}`
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="adminActiveIndicatorBottom"
                          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full ${
                            isDark ? 'bg-white' : 'bg-[#1F2937]'
                          }`}
                        />
                      )}
                      <div className={`relative z-10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full ${!isCollapsed ? 'pl-2' : ''}`}>
                        <Icon size={20} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                              className="whitespace-nowrap overflow-hidden"
                            >
                              {link.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className={`px-3 border-t ${borderClass} pt-4`}>
          <button
            onClick={handleLogout}
            className={`group flex items-center justify-start rounded-xl text-sm font-medium h-11 w-full
              transition-all duration-300 ${!isCollapsed ? 'pl-2' : 'justify-center'} ${
                isDark
                  ? 'text-white/50 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
              }`}
          >
            <LogOut size={20} className={`shrink-0 transition-transform duration-300`} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden ml-3"
                >
                  Keluar
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg z-50 backdrop-blur-xl ${
            isDark
              ? 'bg-white/10 border border-white/20 text-white/50 hover:text-white hover:border-white/50'
              : 'bg-white/50 border border-white/60 text-slate-400 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* Main Content with dynamic padding based on sidebar state */}
      <main
        className="transition-all duration-300 ease-in-out"
        style={{
          paddingTop: isMobile ? '96px' : '88px',
          paddingBottom: isMobile ? '112px' : '24px',
          paddingLeft: isMobile ? '16px' : (isCollapsed ? '104px' : '304px'),
          paddingRight: isMobile ? '16px' : '32px'
        }}
      >
        <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav - Glass Style */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={`relative rounded-full overflow-hidden ${isDark ? 'sa-glass-dark' : 'sa-glass-light'}`}
        >
          <div className="relative flex items-center justify-around py-2.5 px-2">
            {ADMIN_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={() =>
                    'relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300'
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveBg"
                          className="absolute inset-0 rounded-full"
                          style={isDark ? { backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.2)' } : { backgroundColor: 'rgba(241, 245, 249, 0.95)', border: '1px solid rgba(31, 41, 55, 0.15)' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2">
                        <Icon size={20} className={isActive ? (isDark ? 'text-white' : 'text-[#1F2937]') : textMutedClass} />
                        <AnimatePresence>
                          {isActive && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`text-xs font-medium whitespace-nowrap overflow-hidden ${textAccentClass}`}
                            >
                              {link.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </motion.div>
      </nav>

      {/* Mobile Top Navbar - Shows on all admin pages */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: showTopNav ? 0 : -100 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`lg:hidden fixed top-0 left-0 right-0 z-30 overflow-hidden sa-header ${
          isDark ? 'sa-glass-dark' : 'sa-glass-light'
        }`}
      >
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Mac-style traffic lights - smaller for mobile */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-black/20 backdrop-blur-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                </div>
              </div>

              {/* Header Center Title: Admin */}
              <h1 className={`text-base font-extrabold tracking-wider ${textClass}`}>
                Admin
              </h1>

              {/* Header Right Icons */}
              <div className="flex items-center gap-1.5">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    isDark
                      ? 'glass-daftar-btn-dark'
                      : 'glass-daftar-btn-light'
                  }`}
                  aria-label="Toggle theme"
                >
                  <AnimatePresence mode="wait">
                    {isDark ? (
                      <motion.div
                        key="sun"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sun size={16} className="text-yellow-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="moon"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Moon size={16} className="text-slate-600" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-xl transition-all ${
                    isDark ? 'glass-daftar-btn-dark text-white/70 hover:text-red-400' : 'glass-daftar-btn-light text-slate-500 hover:text-red-600'
                  }`}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom decorative line */}
          <div className={`h-px ${isDark ? 'bg-white/[0.08]' : 'bg-[#D4CFC7]/50'}`} />
        </motion.div>

      {/* Desktop Header - Full Width with rounded bottom corners, SAME as SuperAdmin */}
      <div
        ref={headerRef}
        className={`hidden lg:block fixed top-0 left-0 right-0 z-30 sa-header transition-[left] duration-300 ease-in-out ${
          isDark ? 'sa-glass-dark sa-header-dark' : 'sa-glass-light sa-header-light'
        }`}
      >
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Mac-style traffic lights */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-black/20 backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
              </div>
            </div>

            {/* Header Center Title: Admin */}
            <h1 className={`text-xl font-extrabold tracking-wider ${textClass}`}>
              Admin
            </h1>

            {/* Header Right Icons */}
            <div className="flex items-center gap-2">
              {/* Notification Bell - Hover to show */}
              <div ref={notificationRef} className="relative">
                <div className="group/notif p-2 -m-2">
                  <button
                    className={`p-2.5 rounded-xl transition-all duration-300 relative ${
                      isDark
                        ? 'glass-daftar-btn-dark'
                        : 'glass-daftar-btn-light'
                    }`}
                    aria-label="Notifications"
                  >
                    <Bell size={18} className={isDark ? 'text-white/70' : 'text-slate-600'} />
                    {unreadCount > 0 && (
                      <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full -top-1 -right-1">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Popup - Glass Effect on Hover */}
                  <div className={`
                    absolute right-0 top-10 w-80 rounded-2xl overflow-hidden shadow-2xl z-50
                    pointer-events-none opacity-0 group-hover/notif:pointer-events-auto group-hover/notif:opacity-100
                    transition-all duration-300 transform translate-y-[-8px] group-hover/notif:translate-y-0
                    backdrop-blur-xl
                    ${isDark
                      ? 'bg-[#1a1a1a]/90 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
                      : 'bg-[#F9EFE8]/90 border border-[#D4CFC7]/60 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)]'
                    }
                  `}>
                    {/* Popup Header */}
                    <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/40'}`}>
                      <h3 className={`font-semibold ${textClass}`}>Notifikasi</h3>
                      <button
                        onClick={markAllAsRead}
                        className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-[#8B7355] hover:text-[#6B5344]'}`}
                      >
                        Tandai semua dibaca
                      </button>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-80">
                      {notifications.length === 0 ? (
                        <div className={`px-4 py-8 text-center ${isDark ? 'text-white/40' : 'text-[#8B7355]'}`}>
                          <Bell size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Tidak ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.map((notification: { id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string }) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 flex items-start gap-3 border-b last:border-b-0 transition-colors cursor-pointer ${
                              isDark ? 'border-white/5 hover:bg-white/10' : 'border-[#D4CFC7]/30 hover:bg-[#F5F0E8]'
                            } ${!notification.isRead ? (isDark ? 'bg-white/5' : 'bg-[#F5F0E8]/80') : ''}`}
                          >
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${textClass}`}>{notification.title}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-[#8B7355]/80'}`}>{notification.message}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-[#8B7355]/60'}`}>{formatNotificationTime(notification.createdAt)}</p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 mt-2 bg-[#e8702a] rounded-full" />
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Popup Footer */}
                    {notifications.length > 0 && (
                      <div className={`px-4 py-2.5 text-center border-t ${isDark ? 'border-white/10 text-white/30' : 'border-[#D4CFC7]/40 text-[#8B7355]/60'}`}>
                        <span className="text-xs">Menampilkan {notifications.length} notifikasi terbaru</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark
                    ? 'glass-daftar-btn-dark'
                    : 'glass-daftar-btn-light'
                }`}
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun size={18} className="text-yellow-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon size={18} className="text-slate-600" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}