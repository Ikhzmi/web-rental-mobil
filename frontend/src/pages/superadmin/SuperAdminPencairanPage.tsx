import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Search, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import type { Disbursement, StatusDisbursement } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';

const STATUS_CONFIG_DARK: Record<StatusDisbursement, { color: string; icon: React.ElementType; glow: string }> = {
  berhasil: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle, glow: 'shadow-emerald-500/20' },
  diproses: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock, glow: 'shadow-amber-500/20' },
  gagal: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, glow: 'shadow-red-500/20' },
};

const STATUS_CONFIG_LIGHT: Record<StatusDisbursement, { color: string; icon: React.ElementType; glow: string }> = {
  berhasil: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, glow: 'shadow-emerald-500/10' },
  diproses: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, glow: 'shadow-amber-500/10' },
  gagal: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, glow: 'shadow-red-500/10' },
};

function StatusBadge({ status, isDark }: { status: StatusDisbursement; isDark: boolean }) {
  const config = isDark ? STATUS_CONFIG_DARK[status] : STATUS_CONFIG_LIGHT[status];
  const Icon = config.icon;

  const labels = {
    berhasil: 'Berhasil',
    diproses: 'Diproses',
    gagal: 'Gagal',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} shadow-lg ${config.glow}`}>
      <Icon size={12} />
      {labels[status]}
    </span>
  );
}

function DisbursementCard({ disbursement, index, isDark }: { disbursement: Disbursement; index: number; isDark: boolean }) {
  const date = new Date(disbursement.createdAt);
  const formattedDate = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-white/8 via-white/5 to-white/3 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 hover:border-blue-500/30 hover:shadow-blue-500/10'
          : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 hover:border-blue-300 hover:shadow-blue-500/10'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              isDark
                ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-500/30 shadow-blue-500/10'
                : 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 shadow-blue-500/10'
            }`}>
              <Wallet size={22} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{disbursement.instansi.namaInstansi}</h3>
              <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{formattedDate}</p>
            </div>
          </div>
          <StatusBadge status={disbursement.status} isDark={isDark} />
        </div>

        {/* Amount Breakdown */}
        <div className={`rounded-xl p-4 mb-4 border ${
          isDark
            ? 'bg-gradient-to-br from-[#0d1424]/80 to-[#0a0f1a]/80 border-white/5'
            : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Jumlah Kotor</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(Number(disbursement.jumlahKotor))}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Komisi Platform</span>
            <span className={isDark ? 'text-red-400' : 'text-red-500'}>-{formatRupiah(Number(disbursement.komisiPlatform))}</span>
          </div>
          <div className={`flex items-center justify-between pt-2 ${isDark ? 'border-t border-white/10' : 'border-t border-slate-200'}`}>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Jumlah Bersih</span>
            <span className={`font-bold text-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatRupiah(Number(disbursement.jumlahBersih))}</span>
          </div>
        </div>

        {/* Items */}
        <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
            {disbursement.items.length} booking
          </div>
          {disbursement.xenditDisbursementId && (
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'}`} />
              <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Ref: {disbursement.xenditDisbursementId.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function SuperAdminPencairanPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filter, setFilter] = useState<StatusDisbursement | ''>('');
  const [search, setSearch] = useState('');

  const { data: disbursements, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['superadmin-disbursements', filter],
    queryFn: () => api.listSuperAdminDisbursements({
      status: filter || undefined,
    }),
  });

  const stats = {
    total: disbursements?.length ?? 0,
    berhasil: disbursements?.filter(d => d.status === 'berhasil').length ?? 0,
    diproses: disbursements?.filter(d => d.status === 'diproses').length ?? 0,
    gagal: disbursements?.filter(d => d.status === 'gagal').length ?? 0,
    totalKotor: disbursements?.reduce((sum, d) => sum + Number(d.jumlahKotor), 0) ?? 0,
    totalKomisi: disbursements?.reduce((sum, d) => sum + Number(d.komisiPlatform), 0) ?? 0,
  };

  const filteredDisbursements = search
    ? disbursements?.filter(d =>
        d.instansi.namaInstansi.toLowerCase().includes(search.toLowerCase())
      )
    : disbursements;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Pencairan Dana</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => refetch()}
          disabled={isFetching}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:border-slate-300'
          }`}
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { key: '', label: 'Total', value: stats.total, darkBg: 'bg-white/5 border-white/10 hover:bg-white/10', lightBg: 'bg-slate-50 border-slate-200 hover:bg-slate-100' },
          { key: 'berhasil', label: 'Berhasil', value: stats.berhasil, darkBg: 'bg-emerald-500/15 border-emerald-500/30', lightBg: 'bg-emerald-50 border-emerald-200' },
          { key: 'diproses', label: 'Diproses', value: stats.diproses, darkBg: 'bg-amber-500/15 border-amber-500/30', lightBg: 'bg-amber-50 border-amber-200' },
          { key: 'gagal', label: 'Gagal', value: stats.gagal, darkBg: 'bg-red-500/15 border-red-500/30', lightBg: 'bg-red-50 border-red-200' },
        ].map((stat, i) => (
          <motion.button
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(filter === stat.key ? '' : stat.key as StatusDisbursement)}
            className={`rounded-xl p-4 text-left transition-all border ${
              filter === stat.key
                ? isDark
                  ? stat.darkBg
                  : stat.lightBg
                : isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <p className={`text-xs mb-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{stat.label}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
          </motion.button>
        ))}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className={`rounded-2xl overflow-hidden mb-6 ${
          isDark
            ? 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5 backdrop-blur-xl border border-blue-500/30 shadow-xl shadow-blue-500/10'
            : 'bg-gradient-to-br from-blue-50 via-blue-50/50 to-blue-50/30 backdrop-blur-xl border border-blue-200 shadow-xl shadow-blue-500/10'
        }`}
      >
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className={`text-sm mb-1 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Total Kotor</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(stats.totalKotor)}</p>
          </div>
          <div className={`w-px h-12 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className="text-right">
            <p className={`text-sm mb-1 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Total Komisi</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{formatRupiah(stats.totalKomisi)}</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative mb-6"
      >
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Cari nama instansi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
          }`}
        />
      </motion.div>

      {/* List */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : !filteredDisbursements?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
              isDark
                ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 shadow-blue-500/20'
                : 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 shadow-blue-500/10'
            }`}
          >
            <Wallet size={40} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </motion.div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Belum ada pencairan dana</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Pencairan akan muncul setelah ada booking selesai</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDisbursements.map((d, i) => (
            <DisbursementCard key={d.id} disbursement={d} index={i} isDark={isDark} />
          ))}
        </div>
      )}
    </div>
  );
}
