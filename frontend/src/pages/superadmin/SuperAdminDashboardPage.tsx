import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, Database, Clock, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { useMockDataContext } from '../../contexts/MockDataContext';
import {
  MOCK_DASHBOARD_DATA,
  MOCK_TREND_DATA,
  MOCK_POPULAR_VEHICLES,
} from '../../lib/mockData';

// Components
import { RevenueChart } from '../../components/superadmin/RevenueChart';
import { BookingDoughnutChart } from '../../components/superadmin/BookingDoughnutChart';
import { ActivitiesTimeline } from '../../components/superadmin/ActivitiesTimeline';
import { ApprovalCenter } from '../../components/superadmin/ApprovalCenter';
import { TodayBookings } from '../../components/superadmin/TodayBookings';
import { TopCompanies } from '../../components/superadmin/TopCompanies';
import { PopularVehicles } from '../../components/superadmin/PopularVehicles';
import { NotificationCenter } from '../../components/superadmin/NotificationCenter';
import { SystemHealth } from '../../components/superadmin/SystemHealth';
import { PlatformSummary } from '../../components/superadmin/PlatformSummary';
import { QuickActions } from '../../components/superadmin/QuickActions';
import { RecentTransactions } from '../../components/superadmin/RecentTransactions';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

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
  href?: string;
}

function StatCard({ label, value, trend, sparklineData, isDark, href }: StatCardProps) {
  const isPositive = trend >= 0;

  const cardContent = (
    <div className={`p-5 rounded-2xl transition-all duration-200 ${getGlassCardClass(isDark)} ${href ? 'hover:scale-[1.02] cursor-pointer group' : ''}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{label}</p>
        {href && (
          <ChevronRight size={16} className={`transition-transform ${isDark ? 'text-white/30 group-hover:text-white/60' : 'text-slate-300 group-hover:text-slate-500'} group-hover:translate-x-1`} />
        )}
      </div>

      {/* Value - Large Number */}
      <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>

      {/* Trend Badge + Sparkline on right */}
      <div className="flex items-center justify-between mt-3">
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

  if (href) {
    return <Link to={href}>{cardContent}</Link>;
  }

  return cardContent;
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
  const { useMockData, setUseMockData } = useMockDataContext();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isError, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['superadmin-dashboard'],
    queryFn: api.getSuperAdminDashboard,
    retry: 1,
    throwOnError: false,
    enabled: !useMockData,
  });

  const { data: trendData } = useQuery<DashboardTrendData>({
    queryKey: ['superadmin-dashboard-trends'],
    queryFn: api.getDashboardTrends,
    enabled: !!data && !useMockData,
    retry: 1,
    throwOnError: false,
  });

  // Use mock data when toggle is active
  const displayData = useMockData ? MOCK_DASHBOARD_DATA : (data ?? MOCK_DASHBOARD_DATA);
  const displayTrendData = useMockData ? MOCK_TREND_DATA : (trendData ?? MOCK_TREND_DATA);

  // Extract trend data BEFORE early return
  const trendInstansi = displayTrendData?.trendInstansi ?? 0;
  const trendUsers = displayTrendData?.trendUsers ?? 0;
  const trendArmada = displayTrendData?.trendArmada ?? 0;
  const trendKomisi = displayTrendData?.trendKomisi ?? 0;
  const sparklineInstansi = displayTrendData?.sparklineInstansi ?? [];
  const sparklineUsers = displayTrendData?.sparklineUsers ?? [];
  const sparklineArmada = displayTrendData?.sparklineArmada ?? [];
  const sparklineKomisi = displayTrendData?.sparklineKomisi ?? [];

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard-trends'] });
    await queryClient.invalidateQueries({ queryKey: ['superadmin-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['superadmin-activities'] });
    await queryClient.invalidateQueries({ queryKey: ['superadmin-approvals'] });
    await queryClient.invalidateQueries({ queryKey: ['superadmin-notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['superadmin-today-bookings'] });
    setIsRefreshing(false);
  };

  // Get pending counts for quick summary
  const pendingApprovals = (displayData as DashboardData).mobilMenungguApproval ?? 0;
  const pendingInstansi = (displayData as DashboardData).totalInstansiMenunggu ?? 0;

  // Kondisi urut: loading dulu, lalu error (kecuali sedang pakai mock data),
  // baru render konten. Sebelumnya ada dua blok return yang isinya nyaris
  // identik — satu ditandai komentar "DEBUG" yang selalu tereksekusi lebih
  // dulu, sehingga blok animasi di bawahnya jadi dead code. Sudah disatukan.
  if (isLoading && !useMockData) {
    return (
      <motion.div
        key="dashboard-loading"
        initial={false}
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

  if ((isError || !data) && !useMockData) {
    return (
      <motion.div
        key="dashboard-error"
        initial={false}
        animate={{ opacity: 1 }}
        className={`flex flex-col items-center justify-center min-h-[60vh] ${isDark ? 'text-white/60' : 'text-slate-600'}`}
      >
        <div className={`p-4 rounded-full mb-4 ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <AlertTriangle size={32} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
        </div>
        <p className="text-lg font-medium mb-2">Gagal memuat data dashboard</p>
        <p className={`text-sm mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          Pastikan database dan server berjalan
        </p>
        <button
          onClick={() => refetch()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <RefreshCw size={16} />
          Coba Lagi
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div key="dashboard-content" initial={false} animate="animate" variants={staggerContainer} className="space-y-6 lg:pl-0 xl:pl-0">
      {/* Header with Quick Summary */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Ringkasan Dashboard
          </h1>
          {/* Quick Summary Badges */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {pendingApprovals > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle size={12} />
                {pendingApprovals} Kendaraan Pending
              </span>
            )}
            {pendingInstansi > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Clock size={12} />
                {pendingInstansi} Instansi Pending
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'}`}>
              <Clock size={12} />
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || useMockData}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              isRefreshing
                ? isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-slate-50 text-slate-300 border-slate-200'
                : isDark
                ? 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Mock Data Toggle */}
          <button
            onClick={() => setUseMockData(!useMockData)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              useMockData
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : isDark
                ? 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Database size={16} />
            {useMockData ? 'Data Mockup' : 'Mockup'}
          </button>
        </div>
      </motion.div>

      {/* ROW 1: 4 Statistics Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Instansi Aktif" value={displayData.totalInstansiAktif} trend={trendInstansi} sparklineData={sparklineInstansi} isDark={isDark} href="/superadmin/instansi" />
        <StatCard label="Total Pengguna" value={displayData.totalUsers.toLocaleString('id-ID')} trend={trendUsers} sparklineData={sparklineUsers} isDark={isDark} href="/superadmin/reports" />
        <StatCard label="Total Armada" value={displayData.totalMobil} trend={trendArmada} sparklineData={sparklineArmada} isDark={isDark} href="/superadmin/armada/approval" />
        <StatCard label="Total Komisi" value={formatRupiah(displayData.totalKomisiTerkumpul ?? 0)} trend={trendKomisi} sparklineData={sparklineKomisi} isDark={isDark} href="/superadmin/pencairan" />
      </motion.div>

      {/* ROW 2: Quick Actions */}
      <motion.div variants={fadeInUp}>
        <QuickActions />
      </motion.div>

      {/* ROW 3: Charts - TodayBookings below Statistik Booking */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7"><RevenueChart /></div>
        <div className="lg:col-span-5 flex flex-col gap-6">
          <BookingDoughnutChart />
          <TodayBookings />
        </div>
      </motion.div>

      {/* ROW 4: Activity + Approval + Transactions (3 columns) */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivitiesTimeline />
        <ApprovalCenter />
        <RecentTransactions />
      </motion.div>

      {/* ROW 5: Top Companies + Popular Vehicles */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopCompanies />
        {useMockData ? (
          <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Kendaraan Populer</h3>
            <div className="space-y-3">
              {MOCK_POPULAR_VEHICLES.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{vehicle.nama}</p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{vehicle.kategori} • {vehicle.totalBooking}x</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    ⭐ {vehicle.rating}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <PopularVehicles />
        )}
      </motion.div>

      {/* ROW 6: Notification, System, Summary */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NotificationCenter />
        <SystemHealth />
        <PlatformSummary />
      </motion.div>

      {/* Footer - Last Updated */}
      <motion.div variants={fadeInUp} className={`flex items-center justify-between text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
        <span>Dashboard SuperAdmin - KerenTal Kita</span>
        <span>Terakhir diupdate: {new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </motion.div>
    </motion.div>
  );
}