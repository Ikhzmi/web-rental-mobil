import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { Sparklines, SparklinesLine } from 'react-sparklines';

// Components
import { RevenueChart } from '../../components/superadmin/RevenueChart';
import { BookingDoughnutChart } from '../../components/superadmin/BookingDoughnutChart';
import { ActivitiesTimeline } from '../../components/superadmin/ActivitiesTimeline';
import { ApprovalCenter } from '../../components/superadmin/ApprovalCenter';
import { TodayBookings } from '../../components/superadmin/TodayBookings';
import { TopCompanies } from '../../components/superadmin/TopCompanies';
import { PopularVehicles } from '../../components/superadmin/PopularVehicles';
import { CommissionCard } from '../../components/superadmin/CommissionCard';
import { NotificationCenter } from '../../components/superadmin/NotificationCenter';
import { SystemHealth } from '../../components/superadmin/SystemHealth';
import { PlatformSummary } from '../../components/superadmin/PlatformSummary';
import { QuickActions } from '../../components/superadmin/QuickActions';

interface DashboardData {
  totalInstansiAktif: number;
  totalInstansiMenunggu: number;
  totalUsers: number;
  totalMobil: number;
  mobilMenungguApproval: number;
  totalPendapatanPlatform: number;
  totalKomisiTerkumpul: number;
  bookingStats: Record<string, number>;
}

interface DashboardTrendData {
  trendInstansi: number;
  trendUsers: number;
  trendArmada: number;
  trendKomisi: number;
  sparklineInstansi: number[];
  sparklineUsers: number[];
  sparklineArmada: number[];
  sparklineKomisi: number[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  trend: number;
  sparklineData: number[];
  isDark: boolean;
}

// Glassmorphism card styles - unified with sidebar
const getGlassCardClass = (isDark: boolean) => {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
};

function StatCard({ label, value, trend, sparklineData, isDark }: StatCardProps) {
  const isPositive = trend >= 0;

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      {/* Label */}
      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{label}</p>

      {/* Value - Large Number */}
      <p className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>

      {/* Trend Badge + Sparkline on right */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-full ${
          isPositive
            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
        }`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
          <span className={`font-normal ${isDark ? 'text-white/40' : 'text-slate-400'}`}>dari bulan lalu</span>
        </div>

        {/* Sparkline */}
        <div className="h-8 w-20">
          <Sparklines data={sparklineData} margin={2}>
            <SparklinesLine
              style={{ strokeWidth: 2, fill: 'none' }}
              color={isPositive ? '#22c55e' : '#ef4444'}
            />
          </Sparklines>
        </div>
      </div>
    </div>
  );
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export default function SuperAdminDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data, isError, isLoading } = useQuery<DashboardData>({
    queryKey: ['superadmin-dashboard'],
    queryFn: api.getSuperAdminDashboard,
  });

  const { data: trendData } = useQuery<DashboardTrendData>({
    queryKey: ['superadmin-dashboard-trends'],
    queryFn: api.getDashboardTrends,
    enabled: !!data,
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="animate-pulse">
          <div className={`h-8 w-48 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className={`h-4 w-64 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`p-5 rounded-2xl h-[140px] ${getGlassCardClass(isDark)}`}>
              <div className={`h-3 w-20 rounded mb-3 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              <div className={`h-8 w-24 rounded mb-3 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              <div className={`h-10 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex flex-col items-center justify-center min-h-[60vh] ${isDark ? 'text-white/60' : 'text-slate-600'}`}
      >
        <p className="text-lg font-medium mb-2">Gagal memuat data dashboard</p>
        <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Silakan refresh halaman</p>
      </motion.div>
    );
  }

  const trendInstansi = trendData?.trendInstansi ?? 0;
  const trendUsers = trendData?.trendUsers ?? 0;
  const trendArmada = trendData?.trendArmada ?? 0;
  const trendKomisi = trendData?.trendKomisi ?? 0;
  const sparklineInstansi = trendData?.sparklineInstansi ?? [];
  const sparklineUsers = trendData?.sparklineUsers ?? [];
  const sparklineArmada = trendData?.sparklineArmada ?? [];
  const sparklineKomisi = trendData?.sparklineKomisi ?? [];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Ringkasan Dashboard
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Pantau performa platform KerenTal
        </p>
      </motion.div>

      {/* ROW 1: 4 Statistics Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Instansi Aktif"
          value={data.totalInstansiAktif}
          trend={trendInstansi}
          sparklineData={sparklineInstansi}
          isDark={isDark}
        />
        <StatCard
          label="Total Pengguna"
          value={data.totalUsers.toLocaleString('id-ID')}
          trend={trendUsers}
          sparklineData={sparklineUsers}
          isDark={isDark}
        />
        <StatCard
          label="Total Armada"
          value={data.totalMobil}
          trend={trendArmada}
          sparklineData={sparklineArmada}
          isDark={isDark}
        />
        <StatCard
          label="Total Komisi"
          value={formatRupiah(data.totalKomisiTerkumpul ?? 0)}
          trend={trendKomisi}
          sparklineData={sparklineKomisi}
          isDark={isDark}
        />
      </motion.div>

      {/* ROW 2: Quick Actions */}
      <motion.div variants={fadeInUp}>
        <QuickActions />
      </motion.div>

      {/* ROW 3: Analytics */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <RevenueChart />
        </div>
        <div className="lg:col-span-5">
          <BookingDoughnutChart />
        </div>
      </motion.div>

      {/* ROW 4: Three Cards - Activity, Approval, Today */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActivitiesTimeline />
        <ApprovalCenter />
        <TodayBookings />
      </motion.div>

      {/* ROW 5: Three Cards - Companies, Vehicles, Commission */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TopCompanies />
        <PopularVehicles />
        <CommissionCard />
      </motion.div>

      {/* ROW 6: Three Cards - Notification, System, Summary */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NotificationCenter />
        <SystemHealth />
        <PlatformSummary />
      </motion.div>
    </motion.div>
  );
}
