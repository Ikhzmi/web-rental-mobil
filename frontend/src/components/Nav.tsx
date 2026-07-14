import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut, User } from 'lucide-react';
import logo from '../assets/logo.webp';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';

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

  // Status login + role — inilah yang tadinya sama sekali tidak dicek,
  // jadi Nav selalu tampil seolah-olah belum ada yang login.
  const { session } = useSession();
  const { profile, isAdmin } = useProfile();

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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5 transition-all duration-300 transform ${
      visible ? 'translate-y-0' : '-translate-y-full'
    } ${
      scrolled ? 'bg-black/60 backdrop-blur-md py-3 sm:py-4 shadow-lg' : 'bg-transparent'
    }`}>
      <Link to="/" className="flex items-center gap-2">
        <img src={logo} alt="KerenTal Kita" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
        <span className="text-white text-xl sm:text-2xl font-playfair italic">
          KerenTal Kita
        </span>
      </Link>

      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              isActive(link.to)
                ? 'px-4 py-1.5 rounded-full text-sm font-medium text-white'
                : 'px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors'
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3">
        {!session ? (
          <>
            <Link
              to="/login"
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Masuk
            </Link>
            <Link
              to="/daftar"
              className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100"
            >
              Daftar
            </Link>
          </>
        ) : isAdmin ? (
          <>
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <LayoutDashboard size={15} />
              Dashboard Admin
            </Link>
            <span className="text-white/30">|</span>
            <span className="text-white/60 text-sm">{profile?.nama ?? 'Admin'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </>
        ) : (
          <>
            <Link
              to="/akun/pesanan"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <User size={15} />
              {profile?.nama ?? 'Akun Saya'}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </>
        )}
      </div>

      <button
        className="md:hidden text-white p-2"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4 bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="text-left px-4 py-2.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {!session ? (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="text-left px-4 py-2.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                Masuk
              </Link>
              <Link
                to="/daftar"
                onClick={() => setOpen(false)}
                className="mt-1 text-center bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100"
              >
                Daftar
              </Link>
            </>
          ) : (
            <>
              <Link
                to={isAdmin ? '/admin' : '/akun/pesanan'}
                onClick={() => setOpen(false)}
                className="text-left px-4 py-2.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                {isAdmin ? 'Dashboard Admin' : (profile?.nama ?? 'Akun Saya')}
              </Link>
              <button
                onClick={handleLogout}
                className="mt-1 text-center bg-white/10 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-white/20"
              >
                Keluar
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}