import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Search, CheckCircle, Clock, XCircle, RefreshCw, Plus, X, Building2, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { Disbursement, StatusDisbursement, SaldoTertundaInstansi } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../contexts/ToastContext';
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

/** Modal liquid glass — pilih instansi mana yang mau dicairkan, dengan
 * preview breakdown kotor/komisi/bersih sebelum batch dibuat. */
function CreateDisbursementModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bankTransferId, setBankTransferId] = useState('');

  const { data: saldoList, isLoading } = useQuery({
    queryKey: ['instansi-saldo'],
    queryFn: () => api.listInstansiSaldo(),
  });

  const eligible = (saldoList ?? []).filter((s) => s.saldoTertunda > 0);
  const selected = eligible.find((s) => s.id === selectedId) ?? null;
  const komisi = selected ? Math.round(selected.saldoTertunda * (selected.komisiPlatformPersen / 100)) : 0;
  const bersih = selected ? selected.saldoTertunda - komisi : 0;

  const createMutation = useMutation({
    mutationFn: () => api.createDisbursement({ instansiId: selectedId!, bankTransferId: bankTransferId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['instansi-saldo'] });
      showToast('success', 'Berhasil', 'Batch pencairan dibuat, status: Diproses');
      onClose();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Gagal membuat pencairan';
      showToast('error', 'Gagal', message);
    },
  });

  const inputClass = `w-full text-sm rounded-xl px-4 py-3 outline-none transition-all ${
    isDark
      ? 'bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-white/30'
      : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl overflow-hidden my-10 ${isDark ? 'login-card-dark' : 'login-card-light'}`}
      >
        {/* Header */}
        <div className={`relative px-6 py-5 flex items-center justify-between ${isDark ? 'border-b border-white/10' : 'border-b border-[#D4CFC7]/40'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#f5ebe0]'}`}>
              <Wallet size={20} className={isDark ? 'text-white' : 'text-[#6b5545]'} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pencairan Baru</h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Transfer dilakukan manual di luar sistem
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Pilih instansi */}
          <div>
            <label className={`text-sm mb-2 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Instansi dengan saldo tertunda
            </label>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
                ))}
              </div>
            ) : eligible.length === 0 ? (
              <div className={`text-center py-8 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <Building2 size={22} className={`mx-auto mb-2 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  Tidak ada instansi dengan saldo tertunda saat ini
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {eligible.map((s: SaldoTertundaInstansi) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      selectedId === s.id
                        ? isDark ? 'bg-white/15 ring-1 ring-white/30' : 'bg-slate-900 text-white'
                        : isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        selectedId === s.id ? (isDark ? 'text-white' : 'text-white') : (isDark ? 'text-white' : 'text-slate-900')
                      }`}>
                        {s.namaInstansi}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        selectedId === s.id ? (isDark ? 'text-white/60' : 'text-white/60') : (isDark ? 'text-white/40' : 'text-slate-400')
                      }`}>
                        {s.jumlahBookingTertunda} booking selesai
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${
                      selectedId === s.id ? 'text-emerald-300' : isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      {formatRupiah(s.saldoTertunda)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Referensi transfer (opsional) */}
          <div>
            <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Referensi Transfer Bank <span className="opacity-50">(opsional)</span>
            </label>
            <input
              type="text"
              value={bankTransferId}
              onChange={(e) => setBankTransferId(e.target.value)}
              placeholder="Nomor referensi transfer, bisa diisi belakangan"
              className={inputClass}
            />
          </div>

          {/* Preview breakdown */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`overflow-hidden rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
              >
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Jumlah Kotor</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatRupiah(selected.saldoTertunda)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Komisi Platform ({selected.komisiPlatformPersen}%)</span>
                    <span className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>-{formatRupiah(komisi)}</span>
                  </div>
                  <div className={`flex items-center justify-between pt-1.5 mt-1 ${isDark ? 'border-t border-white/10' : 'border-t border-slate-200'}`}>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Jumlah Bersih</span>
                    <span className="text-base font-bold text-emerald-500">{formatRupiah(bersih)}</span>
                  </div>
                  {!selected.rekeningBank && (
                    <p className={`text-[11px] pt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      ⚠ Instansi ini belum punya rekening bank tersimpan.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => createMutation.mutate()}
            disabled={!selectedId || createMutation.isPending}
            className={`w-full px-4 py-3 font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Buat Batch Pencairan
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DisbursementCard({ disbursement, index, isDark }: { disbursement: Disbursement; index: number; isDark: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const date = new Date(disbursement.createdAt);
  const formattedDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusMutation = useMutation({
    mutationFn: (status: 'berhasil' | 'gagal') => api.updateDisbursementStatus(disbursement.id, { status }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-disbursements'] });
      showToast('success', 'Tersimpan', `Ditandai sebagai ${status === 'berhasil' ? 'Berhasil' : 'Gagal'}`);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui status';
      showToast('error', 'Gagal', message);
    },
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
              isDark ? 'bg-[#6b5545]/20 border-[#6b5545]/30' : 'bg-[#f5ebe0] border-[#d5c9bc]'
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
          isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white/50 border-[#D4CFC7]/30'
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
        <div className={`flex items-center gap-3 text-sm mb-1 ${isDark ? 'text-white/50' : 'text-[#8B7355]/60'}`}>
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

        {/* Manual status actions — hanya muncul saat masih 'diproses' */}
        {disbursement.status === 'diproses' && (
          <div className={`flex items-center gap-2 mt-4 pt-4 ${isDark ? 'border-t border-white/10' : 'border-t border-[#D4CFC7]/30'}`}>
            <button
              onClick={() => statusMutation.mutate('berhasil')}
              disabled={statusMutation.isPending}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle size={13} /> Tandai Berhasil
            </button>
            <button
              onClick={() => statusMutation.mutate('gagal')}
              disabled={statusMutation.isPending}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                isDark ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <XCircle size={13} /> Tandai Gagal
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function SuperAdminPencairanPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filter, setFilter] = useState<StatusDisbursement | ''>('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        <div className="flex items-center gap-2">
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Plus size={16} />
            Pencairan Baru
          </motion.button>
        </div>
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
              isDark ? 'bg-[#6b5545]/20 border-[#6b5545]/30' : 'bg-[#f5ebe0] border-[#d5c9bc]'
            }`}
          >
            <Wallet size={40} className={isDark ? 'text-[#f5ebe0]/60' : 'text-[#6b5545]/60'} />
          </motion.div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Belum ada pencairan dana</p>
          <p className={`text-sm mb-5 ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Buat batch pencairan untuk instansi dengan saldo tertunda</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Plus size={16} /> Pencairan Baru
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDisbursements.map((d, i) => (
            <DisbursementCard key={d.id} disbursement={d} index={i} isDark={isDark} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateDisbursementModal onClose={() => setShowCreateModal(false)} isDark={isDark} />
        )}
      </AnimatePresence>
    </div>
  );
}