import { useState, useRef, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';

import {
  LayoutDashboard,
  Building2,
  Users,
  Car,
  Wallet,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sun,
  Moon,
  ClipboardList,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

import { useTheme } from '../../hooks/useTheme';
import { NotificationBell } from '../../components/NotificationBell';
import bgDashboardDark from '../../assets/bg-dashboard-dark.jpg';
import bgDashboardLight from '../../assets/bg-dashboard-light.png';

const navItems = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/instansi', label: 'Instansi', icon: Building2, end: false },
  { to: '/superadmin/armada', label: 'Armada', icon: Car, end: false },
  { to: '/superadmin/bookings', label: 'Pesanan', icon: ClipboardList, end: false },
];

const navItemsSlide2 = [
  { to: '/superadmin/transactions', label: 'Transaksi', icon: Receipt, end: false },
  { to: '/superadmin/pencairan', label: 'Pencairan', icon: Wallet, end: false },
  { to: '/superadmin/admin', label: 'Akun', icon: Users, end: false },
  { to: '/superadmin/reports', label: 'Laporan', icon: BarChart3, end: false },
];

// Loading fallback for content with skeleton shimmer matching card sizes
function ContentFallback() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className={`h-8 w-64 rounded-xl ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
        <div className={`h-4 w-96 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-32 rounded-2xl p-5 flex flex-col justify-between ${
              isDark ? 'bg-white/[0.04] border border-white/5' : 'bg-white border border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`h-4 w-24 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>
            <div className={`h-7 w-32 rounded ${isDark ? 'bg-white/15' : 'bg-slate-300'}`} />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`lg:col-span-2 h-80 rounded-3xl p-6 ${
            isDark ? 'bg-white/[0.04] border border-white/5' : 'bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <div className={`h-5 w-48 rounded mb-6 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className={`h-16 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>
        <div
          className={`h-80 rounded-3xl p-6 ${
            isDark ? 'bg-white/[0.04] border border-white/5' : 'bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <div className={`h-5 w-36 rounded mb-6 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className={`w-40 h-40 mx-auto rounded-full ${isDark ? 'bg-white/5 border-8 border-white/10' : 'bg-slate-100 border-8 border-slate-200'}`} />
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminLayout() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';


  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showTopNav, setShowTopNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileSlide, setMobileSlide] = useState(0);
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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const header = headerRef.current;
      const sidebar = sidebarRef.current;

      // Calculate new state for mobile top nav
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowTopNav(false);
      } else {
        setShowTopNav(true);
      }

      // GSAP Animations for Desktop - sidebar moves with scroll, header stays fixed
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
        <nav className="flex-1 px-3 mt-2 space-y-2 overflow-hidden">
          {[...navItems, ...navItemsSlide2].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavLink
                  to={item.to}
                  end={item.end}
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
                          layoutId="saActiveIndicator"
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
                              className="overflow-hidden whitespace-nowrap"
                            >
                              {item.label}
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

        {/* Logout Button */}
        <div className={`px-3 border-t ${borderClass} pt-4`}>
          <button
            onClick={handleLogout}
            className={`group flex items-center justify-start rounded-xl text-sm font-medium h-11 w-full
              transition-all duration-300 ${!isCollapsed ? 'pl-1' : 'justify-center'} ${
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
                  className="ml-3 overflow-hidden whitespace-nowrap"
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

      {/* Main Content */}
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
          <Suspense fallback={<ContentFallback />} key={location.pathname}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile Bottom Nav - Glass Style with 2 Slides */}
      <nav className="fixed z-40 max-w-md mx-auto lg:hidden bottom-4 left-4 right-4">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={`relative rounded-full overflow-hidden ${
            isDark ? 'sa-glass-dark' : 'sa-glass-light'
          }`}
        >
          {/* Slide indicator dots */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-50">
            <button
              onClick={() => setMobileSlide(0)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                mobileSlide === 0
                  ? 'bg-[#e8702a] w-4'
                  : isDark ? 'bg-white/30 hover:bg-white/50' : 'bg-slate-400/50 hover:bg-slate-400'
              }`}
            />
            <button
              onClick={() => setMobileSlide(1)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                mobileSlide === 1
                  ? 'bg-[#e8702a] w-4'
                  : isDark ? 'bg-white/30 hover:bg-white/50' : 'bg-slate-400/50 hover:bg-slate-400'
              }`}
            />
          </div>

          <div className="relative flex items-center py-2.5 px-2">
            {/* Arrow to slide 0 - on LEFT (Previous) */}
            <button
              onClick={() => setMobileSlide(0)}
              className={`p-2.5 rounded-full transition-all duration-300 shrink-0 ${
                mobileSlide === 1
                  ? isDark
                    ? 'text-white/50 hover:text-white hover:bg-white/10'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/50'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <motion.div
                animate={{ x: 0 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
              >
                <ChevronLeft size={18} />
              </motion.div>
            </button>

            {/* Slide Content */}
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {mobileSlide === 0 ? (
                  <motion.div
                    key="slide0"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-center justify-around"
                  >
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          className="relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300"
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.div
                                  layoutId="saMobileActiveBg"
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
                                      {item.label}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </div>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="slide1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-center justify-around"
                  >
                    {navItemsSlide2.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          className="relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300"
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.div
                                  layoutId="saMobileActiveBg"
                                  className="absolute inset-0 rounded-full"
                                  style={isDark ? { backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.2)' } : { backgroundColor: 'rgba(241, 245, 249, 0.95)', border: '1px solid rgba(31, 41, 55, 0.15)' } }
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
                                      {item.label}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </div>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Arrow to slide 1 - on RIGHT (Next) */}
            <button
              onClick={() => setMobileSlide(1)}
              className={`p-2.5 rounded-full transition-all duration-300 shrink-0 ${
                mobileSlide === 0
                  ? isDark
                    ? 'text-white/50 hover:text-white hover:bg-white/10'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/50'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <motion.div
                animate={{ x: 0 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
              >
                <ChevronRight size={18} />
              </motion.div>
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Mobile Top Navbar - Shows on all superadmin pages */}
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

              {/* Header Center Title: Super Admin */}
              <h1 className={`text-base font-extrabold tracking-wider ${textClass}`}>
                Super Admin
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

      {/* Desktop Header - Full Width with inverted left corner, ABOVE sidebar */}
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

            {/* Header Center Title: Super Admin */}
            <h1 className={`text-xl font-extrabold tracking-wider ${textClass}`}>
              Super Admin
            </h1>

            {/* Header Right Icons */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell align="right" />

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
