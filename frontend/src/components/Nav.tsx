import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut, User, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.webp';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../hooks/useTheme';

const NAV_LINKS: { label: string; to: string }[] = [
  { label: 'Beranda', to: '/' },
  { label: 'Armada', to: '/armada' },
  { label: 'Tentang', to: '/tentang' },
  { label: 'Kontak', to: '/kontak' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY) {
          if (!open) setVisible(false);
        } else {
          setVisible(true);
        }
      } else {
        setVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, open]);

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate('/');
  };

  // Hide Nav on admin/superadmin pages
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin');
  if (isAdminPage) return null;

  const { session } = useSession();
  const { profile, isAdmin } = useProfile();
  const isSuperAdmin = (profile?.role as string) === 'super_admin';

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`
        fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-3 sm:p-4
        transition-all duration-500
        ${scrolled
          ? isDark
            ? 'glass-nav'
            : 'glass-nav'
          : 'bg-transparent'
        }
      `}
    >
      <Link to="/" className="flex items-center gap-2">
        <img src={logo} alt="KerenTal Kita" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
        <span className={`text-xl sm:text-2xl font-playfair italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
          KerenTal Kita
        </span>
      </Link>

      {/* Desktop Navigation - Glass Pill Container */}
      <div className={`
        hidden md:flex items-center
        glass-nav-links rounded-full px-3 py-2
      `}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              isActive(link.to)
                ? `${isDark ? 'bg-white/15' : 'bg-slate-900/10'} px-4 py-1.5 rounded-full text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`
                : `px-4 py-1.5 rounded-full text-sm font-medium ${isDark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'} transition-colors`
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right Side Actions - NOT in glass pill */}
      <div className="hidden md:flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-full transition-all duration-300 ${
            isDark
              ? 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50'
              : 'bg-white/80 hover:bg-white border border-slate-200/50 shadow-sm'
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

        {!session ? (
          <>
            <Link
              to="/login"
              className={`text-sm font-medium transition-colors ${isDark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Masuk
            </Link>
            <Link
              to="/daftar"
              className={`
                text-sm font-semibold px-6 py-2.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]
                ${isDark
                  ? 'glass-daftar-btn-dark'
                  : 'glass-daftar-btn-light'
                }
              `}
            >
              Daftar
            </Link>
          </>
        ) : isSuperAdmin ? (
          <>
            <Link
              to="/superadmin"
              className="flex items-center gap-1.5 text-[#e8702a] hover:text-[#f59e0b] text-sm font-medium transition-colors"
            >
              <LayoutDashboard size={15} />
              Super Admin
            </Link>
            <span className={isDark ? 'text-white/30' : 'text-slate-300'}>|</span>
            <span className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{profile?.nama ?? 'Super Admin'}</span>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <LogOut size={14} />
              Keluar
            </button>
          </>
        ) : isAdmin ? (
          <>
            <Link
              to="/admin"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isDark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <LayoutDashboard size={15} />
              Dashboard Admin
            </Link>
            <span className={isDark ? 'text-white/30' : 'text-slate-300'}>|</span>
            <span className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{profile?.nama ?? 'Admin'}</span>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <LogOut size={14} />
              Keluar
            </button>
          </>
        ) : (
          <>
            <Link
              to="/akun/pesanan"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isDark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <User size={15} />
              {profile?.nama ?? 'Akun Saya'}
            </Link>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <LogOut size={14} />
              Keluar
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-all ${
            isDark
              ? 'bg-zinc-800/50 hover:bg-zinc-700/50'
              : 'bg-white/80 hover:bg-slate-100 shadow-sm'
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>

        <button
          className={`p-2 rounded-full ${isDark ? 'text-white' : 'text-slate-900'}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu - Glassmorphism with bottom rounded */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`md:hidden absolute top-full left-0 right-0 mt-3 mx-3 rounded-b-2xl p-5 flex flex-col gap-2 sa-glass-light`}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? isDark
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-100 text-slate-900'
                    : isDark
                      ? 'text-white/80 hover:bg-white/10'
                      : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className={`h-px my-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            {!session ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-white/80 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  onClick={() => setOpen(false)}
                  className={`mt-1 text-center text-sm font-semibold px-6 py-2.5 rounded-full ${
                    isDark
                      ? 'glass-daftar-btn-dark'
                      : 'glass-daftar-btn-light'
                  }`}
                >
                  Daftar
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={isAdmin ? '/admin' : '/akun/pesanan'}
                  onClick={() => setOpen(false)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-white/80 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {isAdmin ? 'Dashboard Admin' : (profile?.nama ?? 'Akun Saya')}
                </Link>
                <button
                  onClick={handleLogout}
                  className={`mt-1 text-center text-sm font-semibold px-6 py-2.5 rounded-full transition-colors ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Keluar
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
