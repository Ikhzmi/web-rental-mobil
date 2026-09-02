import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, TrendingDown, Users, Car, Building2, CreditCard, Calendar, Download, Eye, Loader2 } from 'lucide-react';
import { api, type SuperAdminReportsData } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  color: string;
  stats: { label: string; value: string; change?: number }[];
}

// Tujuan tombol "Detail" tiap kategori laporan — diarahkan ke halaman
// SuperAdmin yang sudah ada, bukan halaman baru. 'customer' & 'fleet'
// sengaja tidak dipetakan: tidak ada halaman SuperAdmin khusus daftar
// customer atau daftar armada umum (yang ada cuma approval), jadi lebih
// jujur menonaktifkan tombolnya daripada mengarahkan ke tempat yang
// tidak benar-benar menampilkan detail yang dijanjikan.
const REPORT_DETAIL_LINK: Record<string, string> = {
  revenue: '/superadmin/transactions',
  booking: '/superadmin/bookings',
  rental: '/superadmin/instansi',
  commission: '/superadmin/pencairan',
};

// Default empty data for initial render
const DEFAULT_REPORTS: ReportCard[] = [
  {
    id: 'revenue',
    title: 'Laporan Pendapatan',
    description: 'Ringkasan pendapatan platform',
    icon: TrendingUp,
    color: 'emerald',
    stats: [
      { label: 'Total Pendapatan', value: '-' },
      { label: 'Pendapatan Bulan Ini', value: '-' },
      { label: 'Rata-rata Harian', value: '-' },
    ],
  },
  {
    id: 'booking',
    title: 'Laporan Pemesanan',
    description: 'Statistik dan tren pemesanan',
    icon: Calendar,
    color: 'blue',
    stats: [
      { label: 'Total Pemesanan', value: '-' },
      { label: 'Pemesanan Aktif', value: '-' },
      { label: 'Completion Rate', value: '-' },
    ],
  },
  {
    id: 'customer',
    title: 'Laporan Pelanggan',
    description: 'Analisis perilaku pelanggan',
    icon: Users,
    color: 'purple',
    stats: [
      { label: 'Total Pelanggan', value: '-' },
      { label: 'Pelanggan Baru', value: '-' },
      { label: 'Retention Rate', value: '-' },
    ],
  },
  {
    id: 'fleet',
    title: 'Laporan Armada',
    description: 'Performa kendaraan dan utilisasi',
    icon: Car,
    color: 'amber',
    stats: [
      { label: 'Total Kendaraan', value: '-' },
      { label: 'Tersedia', value: '-' },
      { label: 'Utilisasi', value: '-' },
    ],
  },
  {
    id: 'rental',
    title: 'Laporan Rental',
    description: 'Performa instansi rental',
    icon: Building2,
    color: 'teal',
    stats: [
      { label: 'Total Rental', value: '-' },
      { label: 'Rental Aktif', value: '-' },
      { label: 'Avg Revenue/Rental', value: '-' },
    ],
  },
  {
    id: 'commission',
    title: 'Laporan Komisi',
    description: 'Komisi platform dari transaksi',
    icon: CreditCard,
    color: 'rose',
    stats: [
      { label: 'Total Komisi', value: '-' },
      { label: 'Komisi Pending', value: '-' },
      { label: 'Commission Rate', value: '-' },
    ],
  },
];

// Build reports from API data
function buildReportsFromData(data: SuperAdminReportsData): ReportCard[] {
  return [
    {
      id: 'revenue',
      title: 'Laporan Pendapatan',
      description: 'Ringkasan pendapatan platform',
      icon: TrendingUp,
      color: 'emerald',
      stats: [
        { label: 'Total Pendapatan', value: formatRupiah(data.revenue.total), change: data.trends.revenue },
        { label: 'Pendapatan Bulan Ini', value: formatRupiah(data.revenue.thisMonth) },
        { label: 'Rata-rata Harian', value: formatRupiah(data.revenue.daily) },
      ],
    },
    {
      id: 'booking',
      title: 'Laporan Pemesanan',
      description: 'Statistik dan tren pemesanan',
      icon: Calendar,
      color: 'blue',
      stats: [
        { label: 'Total Pemesanan', value: String(data.booking.total), change: data.trends.booking },
        { label: 'Pemesanan Aktif', value: String(data.booking.active) },
        { label: 'Completion Rate', value: `${data.booking.completionRate}%` },
      ],
    },
    {
      id: 'customer',
      title: 'Laporan Pelanggan',
      description: 'Analisis perilaku pelanggan',
      icon: Users,
      color: 'purple',
      stats: [
        { label: 'Total Pelanggan', value: String(data.customer.total) },
        { label: 'Pelanggan Baru', value: String(data.customer.newThisPeriod) },
        { label: 'Retention Rate', value: `${data.customer.retentionRate}%` },
      ],
    },
    {
      id: 'fleet',
      title: 'Laporan Armada',
      description: 'Performa kendaraan dan utilisasi',
      icon: Car,
      color: 'amber',
      stats: [
        { label: 'Total Kendaraan', value: String(data.fleet.total) },
        { label: 'Tersedia', value: String(data.fleet.available) },
        { label: 'Utilisasi', value: `${data.fleet.utilization}%` },
      ],
    },
    {
      id: 'rental',
      title: 'Laporan Rental',
      description: 'Performa instansi rental',
      icon: Building2,
      color: 'teal',
      stats: [
        { label: 'Total Rental', value: String(data.rental.total) },
        { label: 'Rental Aktif', value: String(data.rental.active) },
        { label: 'Avg Revenue/Rental', value: formatRupiah(data.rental.avgRevenue) },
      ],
    },
    {
      id: 'commission',
      title: 'Laporan Komisi',
      description: 'Komisi platform dari transaksi',
      icon: CreditCard,
      color: 'rose',
      stats: [
        { label: 'Total Komisi', value: formatRupiah(data.commission.total), change: data.trends.revenue },
        { label: 'Komisi Pending', value: formatRupiah(data.commission.pending) },
        { label: 'Commission Rate', value: `${data.commission.rate}%` },
      ],
    },
  ];
}

function StatCard({ label, value, change, isDark, color }: { label: string; value: string; change?: number; isDark: boolean; color: string }) {
  const colorClasses: Record<string, { bg: string; text: string; positive: string; negative: string }> = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', positive: 'text-emerald-400', negative: 'text-red-400' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', positive: 'text-blue-400', negative: 'text-red-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', positive: 'text-purple-400', negative: 'text-red-400' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', positive: 'text-amber-400', negative: 'text-red-400' },
    teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', positive: 'text-teal-400', negative: 'text-red-400' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', positive: 'text-rose-400', negative: 'text-red-400' },
  };

  const colors = colorClasses[color] || colorClasses.emerald;

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
      <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{label}</p>
      <div className="flex items-center justify-between">
        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        {change !== undefined && change !== 0 && (
          <span className={`flex items-center gap-1 text-xs font-medium ${
            change > 0 ? colors.positive : 'text-red-400'
          }`}>
            {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, isDark }: { report: ReportCard; isDark: boolean }) {
  const Icon = report.icon;
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
    teal: 'from-teal-500/20 to-teal-600/20 border-teal-500/30',
    rose: 'from-rose-500/20 to-rose-600/20 border-rose-500/30',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
    teal: 'text-teal-400 bg-teal-500/20',
    rose: 'text-rose-400 bg-rose-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${colorMap[report.color]} ${getGlassCardClass(isDark)}`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColorMap[report.color]}`}>
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{report.title}</h3>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{report.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {report.stats.map((stat, index) => (
            <StatCard key={index} {...stat} isDark={isDark} color={report.color} />
          ))}
        </div>
      </div>

      {/* Actions — sebelumnya kedua tombol ini TIDAK punya onClick sama
          sekali (dead button). "Detail" sekarang diarahkan ke halaman
          SuperAdmin paling relevan yang sudah ada (bukan halaman baru,
          demi menghindari duplikasi tampilan data). "Export" jujur
          dinonaktifkan dengan penjelasan, bukan dibiarkan aktif-tapi-diam
          — section "Coming Soon" di bawah sudah lebih dulu mengaku fitur
          ini belum ada. */}
      <div className={`flex border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        {REPORT_DETAIL_LINK[report.id] ? (
          <Link
            to={REPORT_DETAIL_LINK[report.id]}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              isDark
                ? 'text-white/70 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Eye size={16} />
            Detail
          </Link>
        ) : (
          <span className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-not-allowed ${
            isDark ? 'text-white/25' : 'text-slate-300'
          }`}>
            <Eye size={16} />
            Detail
          </span>
        )}
        <button
          disabled
          title="Fitur export belum tersedia"
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-l cursor-not-allowed ${
            isDark
              ? 'text-white/25 border-white/10'
              : 'text-slate-300 border-slate-200'
          }`}
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </motion.div>
  );
}

export default function SuperAdminReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch reports data from API
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-reports', selectedPeriod],
    queryFn: () => api.getSuperAdminReports(selectedPeriod),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build reports from API data or use default
  const reports = data ? buildReportsFromData(data) : DEFAULT_REPORTS;

  // Quick stats from API data
  const statsData = data ? {
    revenue: data.revenue.total,
    bookings: data.booking.total,
    customers: data.customer.total,
    commission: data.commission.total,
  } : {
    revenue: 0,
    bookings: 0,
    customers: 0,
    commission: 0,
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Laporan & Analitik
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Lihat performa dan statistik platform
            </p>
          </div>

          {/* Period Selector */}
          <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            {[
              { key: '7d', label: '7 Hari' },
              { key: '30d', label: '30 Hari' },
              { key: '90d', label: '90 Hari' },
              { key: '1y', label: '1 Tahun' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedPeriod(item.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === item.key
                    ? isDark
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDark
                    ? 'text-white/50 hover:text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl mb-8 ${getGlassCardClass(isDark)}`}
        >
          <Loader2 size={48} className={`mx-auto mb-4 animate-spin ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Memuat data laporan...</p>
        </motion.div>
      )}

      {/* Quick Stats */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {[
          { label: 'Total Pendapatan', value: formatRupiah(statsData.revenue), change: data?.trends.revenue, icon: TrendingUp, color: 'emerald' },
          { label: 'Total Pemesanan', value: String(statsData.bookings), change: data?.trends.booking, icon: Calendar, color: 'blue' },
          { label: 'Total Pengguna', value: String(statsData.customers), icon: Users, color: 'purple' },
          { label: 'Total Komisi', value: formatRupiah(statsData.commission), icon: CreditCard, color: 'rose' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-2xl ${getGlassCardClass(isDark)}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  stat.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                  stat.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                  stat.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  <Icon size={16} />
                </div>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{stat.label}</p>
              </div>
              <div className="flex items-end justify-between">
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                {/* Sebelumnya badge ini render TANPA guard sama sekali
                    (stat.change > 0 langsung dipanggil di `undefined` kalau
                    query belum resolve -> selalu jatuh ke cabang merah
                    "turun 0%", bukan cuma sekadar hardcode 0). Sekarang
                    disembunyikan total kalau memang tidak ada data tren
                    asli untuk metrik itu (Total Pengguna & Total Komisi
                    di quick stats ini belum ada perbandingan periode). */}
                {stat.change !== undefined && (
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    stat.change > 0 ? 'text-emerald-400' : stat.change < 0 ? 'text-red-400' : isDark ? 'text-white/40' : 'text-slate-400'
                  }`}>
                    {stat.change > 0 ? <TrendingUp size={12} /> : stat.change < 0 ? <TrendingDown size={12} /> : null}
                    {stat.change === 0 ? '0%' : `${Math.abs(stat.change)}%`}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Report Cards */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ReportCard report={report} isDark={isDark} />
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`mt-8 p-6 rounded-2xl text-center ${getGlassCardClass(isDark)} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <BarChart3 size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Laporan Lengkap
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Fitur export laporan dalam format PDF dan Excel akan segera hadir
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
            📊 Export PDF
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
            📈 Export Excel
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
            📧 Scheduled Reports
          </span>
        </div>
      </motion.div>
    </div>
  );
}