import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { LayoutDashboard, Car, ClipboardList, ChevronLeft, ChevronRight, LogOut, Sun, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import bgDashboardDark from '../../assets/bg-dashboard-dark.jpg';
import bgDashboardLight from '../../assets/bg-dashboard-light.png';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/armada', label: 'Armada', icon: Car },
  { to: '/admin/pesanan', label: 'Pesanan', icon: ClipboardList },
];

export default function AdminLayout() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showTopNav, setShowTopNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isHeaderHidden = useRef(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

      {/* Main Content - Desktop */}
      <main
        className="hidden lg:block"
        style={{ paddingTop: '88px', paddingLeft: isCollapsed ? '80px' : '280px' }}
      >
        <div className="px-8 py-6">
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

      {/* Mobile Top Navbar - Glass Style */}
      {location.pathname === '/admin' && (
        <motion.div
          initial={{ y: -80 }}
          animate={{ y: showTopNav ? 0 : -80 }}
          transition={{ duration: 0.2 }}
          className={`lg:hidden fixed top-0 left-0 right-0 z-30 ${
            isDark ? 'sa-glass-dark border-b border-white/[0.12]' : 'sa-glass-light border-b border-white/70'
          }`}
        >
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className={`text-lg font-semibold ${textClass}`}>Dashboard</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-xl transition-all ${
                    isDark ? 'glass-daftar-btn-dark' : 'glass-daftar-btn-light'
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
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-xl transition-all ${
                    isDark ? 'bg-white/10 text-white/70 hover:text-red-400 hover:bg-red-500/10' : 'bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Page Content */}
      <main className="lg:hidden px-4 pt-24 pb-28">
        <Outlet />
      </main>

      {/* Desktop Header - Full Width with rounded bottom corners */}
      <div
        ref={headerRef}
        className={`hidden lg:block fixed top-0 left-0 right-0 z-30 sa-header ${
          isDark ? 'sa-glass-dark' : 'sa-glass-light'
        }`}
      >
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo KerenTal on Left */}
            <div className="flex items-center gap-3">
              <img src="/favicon.webp" alt="Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-black/40" />
              <div>
                <p className={`font-bold text-sm tracking-wide ${textClass}`}>KerenTal</p>
                <p className={`text-xs font-medium ${textMutedClass}`}>Portal Admin</p>
              </div>
            </div>

            {/* Header Center Title */}
            <h1 className={`text-xl font-extrabold tracking-wider ${textClass}`}>
              Admin
            </h1>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                isDark ? 'glass-daftar-btn-dark' : 'glass-daftar-btn-light'
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
  );
}
