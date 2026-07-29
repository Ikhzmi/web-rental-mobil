import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, ClipboardList, Gauge, TrendingUp, ArrowRight, Car, CheckCircle, Clock } from 'lucide-react';
import { api, type InstansiDashboardData } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonStatsGrid, SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  index,
  isLink = false,
  isDark,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  index: number;
  isLink?: boolean;
  isDark: boolean;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: isLink ? 0 : -4 }}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 sa-glass-light p-4 sm:p-5 ${
        isLink ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon size={18} className="sm:w-[22px] sm:h-[22px]" />
        </div>
      </div>

      <p className={`text-[10px] sm:text-xs mb-1 font-medium uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {subValue && (
        <p className={`text-[10px] sm:text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {subValue}
        </p>
      )}
    </motion.div>
  );

  if (isLink) {
    return (
      <Link to="/admin/pencairan" className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data, isLoading, isError } = useQuery<InstansiDashboardData>({
    queryKey: ['instansi-dashboard'],
    queryFn: () => api.getInstansiDashboard(),
  });

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <SkeletonStatsGrid />
        </div>
        <SkeletonList count={2} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16 sm:py-20"
      >
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
          isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <TrendingUp size={32} className="text-red-500 sm:w-10 sm:h-10" />
        </div>
        <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Gagal memuat dashboard</p>
        <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Silakan refresh halaman</p>
      </motion.div>
    );
  }

  const activeBookings = (data.bookingStats?.dikonfirmasi ?? 0) + (data.bookingStats?.berjalan ?? 0);

  const cardClass = 'sa-glass-light rounded-2xl overflow-hidden';

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          icon={Wallet}
          label="Pendapatan"
          value={formatRupiah(data.totalPendapatanBulanIni)}
          subValue="Bulan ini"
          color={isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}
          index={0}
          isDark={isDark}
        />
        <StatCard
          icon={ClipboardList}
          label="Pesanan Aktif"
          value={activeBookings}
          subValue="Sedang berjalan"
          color={isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-600 border border-blue-200'}
          index={1}
          isDark={isDark}
        />
        <StatCard
          icon={Car}
          label="Total Armada"
          value={data.totalMobil}
          subValue={`${data.mobilTersedia} tersedia`}
          color={isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-600 border border-purple-200'}
          index={2}
          isDark={isDark}
        />
        <StatCard
          icon={TrendingUp}
          label="Saldo Tertunda"
          value={formatRupiah(data.saldoTertunda)}
          subValue="Tersedia"
          color={isDark ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-600 border border-orange-200'}
          index={3}
          isLink
          isDark={isDark}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-2xl overflow-hidden ${cardClass}`}
        >
          <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <ClipboardList size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <span className="text-sm sm:text-base">Pesanan Terbaru</span>
              </h2>
              <Link to="/admin/pesanan" className={`text-xs sm:text-sm flex items-center gap-1 hover:underline ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}>
                Lihat semua <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {data.recentBookings?.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {data.recentBookings.slice(0, 5).map((booking, i) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center justify-between text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <Car size={16} className={isDark ? 'text-white/50 sm:w-[18px] sm:h-[18px]' : 'text-slate-400 sm:w-[18px] sm:h-[18px]'} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{booking.car.nama}</p>
                        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{booking.profile.nama}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(Number(booking.totalHarga))}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                        isDark
                          ? booking.status === 'selesai'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : booking.status === 'berjalan'
                            ? 'bg-blue-500/10 text-blue-400'
                            : booking.status === 'dikonfirmasi'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-amber-500/10 text-amber-400'
                          : booking.status === 'selesai'
                            ? 'bg-emerald-100 text-emerald-700'
                            : booking.status === 'berjalan'
                            ? 'bg-blue-100 text-blue-700'
                            : booking.status === 'dikonfirmasi'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status === 'dikonfirmasi' && <CheckCircle size={10} />}
                        {booking.status === 'berjalan' && <Clock size={10} />}
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className={`text-sm text-center py-6 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Belum ada pesanan</p>
            )}
          </div>
        </motion.div>

        {/* Booking Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`rounded-2xl overflow-hidden ${cardClass}`}
        >
          <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                <Gauge size={16} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
              </div>
              <span className="text-sm sm:text-base">Statistik Booking</span>
            </h2>
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { label: 'Menunggu Bayar', value: data.bookingStats?.menunggu_pembayaran ?? 0, color: 'amber' },
              { label: 'Dikonfirmasi', value: data.bookingStats?.dikonfirmasi ?? 0, color: 'blue' },
              { label: 'Berjalan', value: data.bookingStats?.berjalan ?? 0, color: 'purple' },
              { label: 'Selesai', value: data.bookingStats?.selesai ?? 0, color: 'emerald' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl ${
                  isDark
                    ? `bg-${stat.color}-500/5 border border-${stat.color}-500/10`
                    : `bg-${stat.color}-50 border border-${stat.color}-100`
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                  isDark ? `bg-${stat.color}-500/20` : `bg-${stat.color}-100`
                }`}>
                  {stat.color === 'amber' && <Clock size={16} className={isDark ? 'text-amber-400' : 'text-amber-600'} />}
                  {stat.color === 'blue' && <CheckCircle size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />}
                  {stat.color === 'purple' && <Car size={16} className={isDark ? 'text-purple-400' : 'text-purple-600'} />}
                  {stat.color === 'emerald' && <CheckCircle size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />}
                </div>
                <div>
                  <p className={`text-[10px] sm:text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{stat.label}</p>
                  <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
