import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Search, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import type { Disbursement, StatusDisbursement } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getDisbursementStatusConfig } from '../../lib/statusConfig';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

function StatusBadge({ status, isDark }: { status: StatusDisbursement; isDark: boolean }) {
  const config = getDisbursementStatusConfig(status, isDark);

  const Icon = status === 'berhasil' ? CheckCircle : status === 'diproses' ? Clock : XCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-xl ${config.bg}`}>
      <Icon size={12} />
      {config.label}
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
      whileHover={{ y: -2 }}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${getGlassCardClass(isDark)}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-xl border ${
              isDark
                ? 'bg-[#6b5545]/20 border-[#6b5545]/30'
                : 'bg-[#f5ebe0] border-[#d5c9bc]'
            }`}>
              <Wallet size={22} className={isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'} />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{disbursement.instansi.namaInstansi}</h3>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>{formattedDate}</p>
            </div>
          </div>
          <StatusBadge status={disbursement.status} isDark={isDark} />
        </div>

        {/* Amount Breakdown */}
        <div className={`rounded-xl p-4 mb-4 backdrop-blur-xl border ${
          isDark
            ? 'bg-white/[0.02] border-white/5'
            : 'bg-white/50 border-[#D4CFC7]/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Jumlah Kotor</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(Number(disbursement.jumlahKotor))}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Komisi Platform</span>
            <span className={isDark ? 'text-red-400' : 'text-red-500'}>-{formatRupiah(Number(disbursement.komisiPlatform))}</span>
          </div>
          <div className={`flex items-center justify-between pt-2 ${isDark ? 'border-t border-white/10' : 'border-t border-[#D4CFC7]/30'}`}>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Jumlah Bersih</span>
            <span className={`font-bold text-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatRupiah(Number(disbursement.jumlahBersih))}</span>
          </div>
        </div>

        {/* Items */}
        <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/60'}`}>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#f5ebe0]' : 'bg-[#6b5545]'}`} />
            {disbursement.items.length} booking
          </div>
          {disbursement.bankTransferId && (
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'}`} />
              <span className={isDark ? 'text-white/30' : 'text-[#8B7355]/40'}>Ref: {disbursement.bankTransferId.slice(0, 12)}...</span>
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Pencairan Dana</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Kelola pencairan dana ke instansi rental</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => refetch()}
          disabled={isFetching}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all backdrop-blur-xl border ${
            isDark
              ? 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:border-white/20'
              : 'bg-white/60 border-[#D4CFC7]/50 text-[#8B7355] hover:bg-white/80 hover:border-[#D4CFC7]/70'
          }`}
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: '', label: 'Total', value: stats.total, activeBg: 'bg-white/[0.03]' },
          { key: 'berhasil', label: 'Berhasil', value: stats.berhasil, activeBg: 'bg-emerald-500/10' },
          { key: 'diproses', label: 'Diproses', value: stats.diproses, activeBg: 'bg-amber-500/10' },
          { key: 'gagal', label: 'Gagal', value: stats.gagal, activeBg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <motion.button
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(filter === stat.key ? '' : stat.key as StatusDisbursement)}
            className={`rounded-2xl p-5 text-left ${getGlassCardClass(isDark)} ${filter === stat.key ? stat.activeBg : ''}`}
          >
            <p className={`text-xs font-medium mb-3 ${isDark ? 'text-white/60' : 'text-[#8B7355]/70'}`}>{stat.label}</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
          </motion.button>
        ))}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl overflow-hidden ${getGlassCardClass(isDark)}`}
      >
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className={`text-sm mb-1 ${isDark ? 'text-white/60' : 'text-[#8B7355]/70'}`}>Total Kotor</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(stats.totalKotor)}</p>
          </div>
          <div className={`w-px h-12 ${isDark ? 'bg-white/10' : 'bg-[#D4CFC7]/30'}`} />
          <div className="text-right">
            <p className={`text-sm mb-1 ${isDark ? 'text-white/60' : 'text-[#8B7355]/70'}`}>Total Komisi</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>{formatRupiah(stats.totalKomisi)}</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative"
      >
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`} />
        <input
          type="text"
          placeholder="Cari nama instansi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all backdrop-blur-xl border ${
            isDark
              ? 'bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/20'
              : 'bg-white/50 border-[#D4CFC7]/60 text-slate-900 placeholder:text-[#8B7355]/50 focus:border-[#8b7355]/50 focus:ring-2 focus:ring-[#8b7355]/20'
          }`}
        />
      </motion.div>

      {/* List */}
      {isLoading ? (
        <SkeletonList count={4} isDark={isDark} />
      ) : !filteredDisbursements?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-20 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl border ${
              isDark
                ? 'bg-[#6b5545]/20 border-[#6b5545]/30'
                : 'bg-[#f5ebe0] border-[#d5c9bc]'
            }`}
          >
            <Wallet size={40} className={isDark ? 'text-[#f5ebe0]/60' : 'text-[#6b5545]/60'} />
          </motion.div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Belum ada pencairan dana</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Pencairan akan muncul setelah ada booking selesai</p>
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
