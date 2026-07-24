import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, ClipboardList, Users, ArrowLeft } from 'lucide-react';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/armada', label: 'Kelola Armada', icon: Car },
  { to: '/admin/pesanan', label: 'Kelola Pesanan', icon: ClipboardList },
  { to: '/admin/pengguna', label: 'Kelola Pengguna', icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-20 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/10 px-4 py-6 sticky top-20 h-[calc(100vh-5rem)]">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs mb-6 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke situs
        </Link>

        <nav className="flex flex-col gap-1">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to, link.exact);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#2563eb]/15 text-[#2563eb]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 border-t md:hidden bg-black/90 backdrop-blur-md border-white/10">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to, link.exact);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
                active ? 'text-[#2563eb]' : 'text-white/50'
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 min-w-0 px-5 py-6 pb-24 sm:px-8 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
}