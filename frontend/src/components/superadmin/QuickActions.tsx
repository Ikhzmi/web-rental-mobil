import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Plus, CheckCircle, FileText, Wallet, Building2, Users } from 'lucide-react';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const vibrantActions = [
  {
    label: 'Tambah Rental',
    href: '/superadmin/instansi',
    icon: Plus,
    gradient: 'from-emerald-600/80 to-emerald-700/80',
    hoverGradient: 'hover:from-emerald-500/90 hover:to-emerald-600/90',
    textClass: 'text-white/90',
  },
  {
    label: 'Lihat Pesanan',
    href: '/superadmin/bookings',
    icon: FileText,
    gradient: 'from-violet-600/80 to-violet-700/80',
    hoverGradient: 'hover:from-violet-500/90 hover:to-violet-600/90',
    textClass: 'text-white/90',
  },
  {
    label: 'Approve Kendaraan',
    href: '/superadmin/armada/approval',
    icon: CheckCircle,
    gradient: 'from-zinc-600/80 to-zinc-700/80',
    hoverGradient: 'hover:from-zinc-500/90 hover:to-zinc-600/90',
    textClass: 'text-white/90',
  },
  {
    label: 'Kelola Komisi',
    href: '/superadmin/pencairan',
    icon: Wallet,
    gradient: 'from-amber-600/80 to-amber-700/80',
    hoverGradient: 'hover:from-amber-500/90 hover:to-amber-600/90',
    textClass: 'text-white/90',
  },
  {
    label: 'Kelola Instansi',
    href: '/superadmin/instansi',
    icon: Building2,
    gradient: 'from-teal-600/80 to-teal-700/80',
    hoverGradient: 'hover:from-teal-500/90 hover:to-teal-600/90',
    textClass: 'text-white/90',
  },
  {
    label: 'Kelola Akun',
    href: '/superadmin/admin',
    icon: Users,
    gradient: 'from-rose-600/80 to-rose-700/80',
    hoverGradient: 'hover:from-rose-500/90 hover:to-rose-600/90',
    textClass: 'text-white/90',
  },
];

export function QuickActions() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`px-5 py-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center gap-3 overflow-visible flex-wrap">
        <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
          Aksi Cepat:
        </span>
        {vibrantActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 bg-gradient-to-r ${action.gradient} ${action.hoverGradient} ${action.textClass} shadow-md hover:shadow-lg`}
            >
              <Icon size={14} />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
