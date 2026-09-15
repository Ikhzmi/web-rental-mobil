import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Sun, Moon, MessageSquare, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.webp';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import { NotificationBell } from './NotificationBell';

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
  const lastScrollYRef = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;

  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toggleChat, unreadCount } = useChat();
  // Hooks sesi/profil WAJIB di atas early return agar urutan hooks stabil
  // di semua render (aturan hooks React). Sebelumnya ada di bawah
  // `if (isAdminPage) return null` sehingga jumlah hooks berubah-ubah.
  const { session } = useSession();
  const { profile, isAdmin } = useProfile();
  const isSuperAdmin = (profile?.role as string) === 'super_admin';

  const isDark = theme === 'dark';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Toggle scrolled state saat melebihi 20px
      setScrolled(currentScrollY > 20);

      const diff = currentScrollY - lastScrollYRef.current;

      if (currentScrollY > 60) {
        // Scroll ke bawah (diff > 5) -> animasi navbar NAIK KE ATAS (sembunyi)
        if (diff > 5) {
          if (!openRef.current) setVisible(false);
        }
        // Scroll ke atas (diff < -5) -> animasi navbar TURUN (tampil)
        else if (diff < -5) {
          setVisible(true);
        }
      } else {
        setVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const handleLogout = async () => {
    // scope 'local': hanya perangkat ini yang keluar — perangkat lain tetap login (multi-device)
    await supabase.auth.signOut({ scope: 'local' });
    setOpen(false);
    navigate('/');
  };

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin');
  if (isAdminPage) return null;

  return (
    <>
      <motion.nav
        initial={{ y: '-100%' }}
        animate={{ y: visible ? '0%' : '-100%' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={[
          // Base layout
          'fixed z-[100] flex items-center justify-between',
          // Gunakan glass saat scrolled ATAU saat sedang tersembunyi (agar tidak ada flash borderless)
          (scrolled || !visible)
            ? `top-0 left-0 right-0 ${open ? 'rounded-b-none' : 'rounded-b-3xl'} p-3 md:p-4 shadow-xl md:shadow-2xl backdrop-blur-2xl ${isDark ? 'nav-mobile-glass-dark nav-desktop-glass-dark' : 'nav-mobile-glass-light nav-desktop-glass-light'}`
            : 'top-0 left-0 right-0 p-4 md:p-6 nav-desktop-transparent',
        ].join(' ')}
      >

        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="KerenTal Kita" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
          <span className={`text-xl sm:text-2xl font-playfair italic ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            KerenTal Kita
          </span>
        </Link>

        {/* Desktop Navigation - Glass Pill Container (Always horizontally centered) */}
        <div className={`
          hidden md:flex items-center
          glass-nav-links backdrop-blur-xl rounded-full px-3 py-2
          absolute left-1/2 -translate-x-1/2
        `}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                isActive(link.to)
                  ? `${isDark ? 'bg-white/15' : 'bg-neutral-900/10'} px-4 py-1.5 rounded-full text-sm font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`
                  : `px-4 py-1.5 rounded-full text-sm font-medium ${isDark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900'} transition-colors`
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side Actions - NOT in glass pill */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {/* Theme Toggle — gaya disamakan dengan ikon notifikasi di sebelahnya */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
              isDark
                ? 'glass-daftar-btn-dark text-white/70 hover:text-white'
                : 'glass-daftar-btn-light text-slate-500 hover:text-slate-900'
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
                  <Moon size={18} className="text-neutral-600" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {!session ? (
            <>
              <Link
                to="/login"
                className={`text-sm font-medium px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Masuk
              </Link>
              <Link
                to="/daftar"
                className={`text-sm font-semibold px-5 py-2 rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                  isDark
                    ? 'bg-white text-neutral-950 hover:bg-white/90 shadow-lg'
                    : 'bg-white text-neutral-900 shadow-lg hover:bg-white/90'
                }`}
              >
                Daftar
              </Link>
            </>
          ) : isSuperAdmin ? (
            <>
              <Link
                to="/superadmin"
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-amber-300 hover:text-amber-200'
                    : 'text-amber-900'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Panel Super Admin</span>
              </Link>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
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
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-blue-300 hover:text-blue-200'
                    : 'text-blue-900'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Panel Admin</span>
              </Link>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <LogOut size={14} />
                Keluar
              </button>
            </>
          ) : (
            <>
              {/* Notification Bell Icon */}
              <NotificationBell align="right" />

              {/* Message Icon Button */}
              <button
                onClick={toggleChat}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                aria-label="Pesan / Chat"
                title="Pesan / Chat Rental"
              >
                <MessageSquare size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-neutral-900 shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <Link
                to="/akun/profil"
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <User size={15} />
                {profile?.nama ?? 'Profil Saya'}
              </Link>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full glass-nav-links transition-all duration-300 ${
                  isDark
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
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
            className={`p-2 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
              isDark
                ? 'glass-daftar-btn-dark text-white/70 hover:text-white'
                : 'glass-daftar-btn-light text-slate-500 hover:text-slate-900'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-neutral-600" />}
          </button>

          {/* Mobile Notification & Message Buttons */}
          {session && (
            <>
              <NotificationBell align="right" />
              <button
                onClick={toggleChat}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 glass-nav-links transition-all duration-300 ${
                  isDark ? 'text-white/80 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                aria-label="Pesan / Chat"
              >
                <MessageSquare size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </>
          )}

          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 glass-nav-links transition-all duration-300 ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu - Sibling element outside motion.nav to prevent nested backdrop-filter clipping bug */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`md:hidden fixed left-0 right-0 z-[99] p-5 flex flex-col gap-2 rounded-b-2xl shadow-2xl backdrop-blur-2xl ${
              scrolled ? 'top-[59px]' : 'top-[72px]'
            } ${isDark ? 'nav-mobile-glass-dark' : 'nav-mobile-glass-light'}`}
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
                      : 'bg-neutral-100 text-neutral-900'
                    : isDark
                      ? 'text-white/80 hover:bg-white/10'
                      : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className={`h-px my-2 ${isDark ? 'bg-white/10' : 'bg-neutral-200'}`} />

            {!session ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'text-white/80 hover:bg-white/10' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  onClick={() => setOpen(false)}
                  className={`mt-1 text-center text-sm font-semibold px-6 py-2.5 rounded-full transition-all ${
                    isDark
                      ? 'bg-white text-neutral-950 hover:bg-white/90'
                      : 'glass-daftar-btn-light'
                  }`}
                >
                  Daftar
                </Link>
              </>
            ) : (
              <>
                {isSuperAdmin ? (
                  <Link
                    to="/superadmin"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    <LayoutDashboard size={16} />
                    <span>Panel Super Admin</span>
                  </Link>
                ) : isAdmin ? (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-900'
                    }`}
                  >
                    <LayoutDashboard size={16} />
                    <span>Panel Admin</span>
                  </Link>
                ) : (
                  <Link
                    to="/akun/profil"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isDark ? 'text-white/80 hover:bg-white/10' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <User size={16} />
                    <span>{profile?.nama ?? 'Profil Saya'}</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className={`mt-1 text-center text-sm font-semibold px-6 py-2.5 rounded-full transition-colors ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15 text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  Keluar
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
