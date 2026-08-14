import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, XCircle, ArrowRight, Clock, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api, type SuperAdminTransactionItem } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

type FilterType = 'all' | 'payment' | 'refund' | 'commission' | 'disbursement';
type FilterStatus = 'all' | 'pending' | 'success' | 'failed';

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeIcon(type: SuperAdminTransactionItem['type']) {
  switch (type) {
    case 'payment':
      return <CreditCard size={16} />;
    case 'commission':
      return <CheckCircle size={16} />;
    case 'disbursement':
      return <ArrowRight size={16} />;
    case 'refund':
      return <XCircle size={16} />;
    default:
      return <Clock size={16} />;
  }
}

function getTypeColor(type: SuperAdminTransactionItem['type'], isDark: boolean) {
  switch (type) {
    case 'payment':
      return isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600';
    case 'commission':
      return isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600';
    case 'disbursement':
      return isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600';
    case 'refund':
      return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600';
    default:
      return isDark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600';
  }
}

function getStatusConfig(status: SuperAdminTransactionItem['status'], isDark: boolean) {
  switch (status) {
    case 'success':
      return {
        label: 'Berhasil',
        bg: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
      };
    case 'pending':
      return {
        label: 'Pending',
        bg: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
      };
    case 'failed':
      return {
        label: 'Gagal',
        bg: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
      };
  }
}

export default function SuperAdminTransactionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch transactions from API
  const { data, isLoading, isError } = useQuery({
    queryKey: ['superadmin-transactions', filterType, filterStatus, search, currentPage],
    queryFn: () => api.listSuperAdminTransactions({
      type: filterType !== 'all' ? filterType : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      cari: search || undefined,
      page: currentPage,
      limit: itemsPerPage,
    }),
    placeholderData: (prev) => prev,
  });

  const transactions: SuperAdminTransactionItem[] = data?.data || [];
  const summary = data?.summary || { totalMasuk: 0, totalRefund: 0 };
  const totalItems = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  // Reset page when filter changes
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const totalAmount = summary.totalMasuk;
  const totalRefund = summary.totalRefund;
  const totalCommission = transactions
    .filter((t) => t.type === 'commission' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Riwayat Transaksi
        </h1>
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Kelola semua transaksi di platform
        </p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-xl ${getGlassCardClass(isDark)}`}>
          <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Total Masuk</p>
          <p className={`text-xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatRupiah(totalAmount)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${getGlassCardClass(isDark)}`}>
          <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Total Refund</p>
          <p className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {formatRupiah(totalRefund)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${getGlassCardClass(isDark)}`}>
          <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Total Komisi</p>
          <p className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {formatRupiah(totalCommission)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'payment', label: 'Pembayaran' },
            { key: 'commission', label: 'Komisi' },
            { key: 'disbursement', label: 'Pencairan' },
            { key: 'refund', label: 'Refund' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => { setFilterType(item.key as FilterType); handleFilterChange(); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                filterType === item.key
                  ? isDark
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-blue-100 text-slate-700 border-slate-300'
                  : isDark
                  ? 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Semua Status' },
            { key: 'success', label: 'Berhasil' },
            { key: 'pending', label: 'Pending' },
            { key: 'failed', label: 'Gagal' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => { setFilterStatus(item.key as FilterStatus); handleFilterChange(); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                filterStatus === item.key
                  ? isDark
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-blue-100 text-slate-700 border-slate-300'
                  : isDark
                  ? 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Cari transaksi, instansi, atau customer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/30'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
          }`}
        />
      </div>

      {/* Results count */}
      <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
        Menampilkan {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} transaksi
      </p>

      {/* List */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <Loader2 size={48} className={`mx-auto mb-4 animate-spin ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Memuat data...</p>
        </motion.div>
      ) : isError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <CreditCard size={48} className={`mx-auto mb-4 ${isDark ? 'text-red-400/40' : 'text-red-400'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Gagal memuat data</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Silakan coba lagi nanti</p>
        </motion.div>
      ) : !transactions.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <CreditCard size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Tidak ada transaksi</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Transaksi akan muncul di sini</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn, index) => {
            const statusConfig = getStatusConfig(txn.status, isDark);
            return (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-2xl p-4 ${getGlassCardClass(isDark)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Icon & Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(txn.type, isDark)}`}>
                      {getTypeIcon(txn.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {txn.description}
                      </p>
                      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        <span>{txn.instansi ?? '-'}</span>
                        {txn.customer && (
                          <>
                            <span>•</span>
                            <span>{txn.customer}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatTanggal(txn.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Status */}
                  <div className="flex items-center gap-4 sm:gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${txn.type === 'refund' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {txn.type === 'refund' ? '-' : '+'}{formatRupiah(txn.amount)}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className={`flex items-center justify-between mt-6 p-4 rounded-2xl ${getGlassCardClass(isDark)}`}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              currentPage === 1
                ? isDark ? 'text-white/30 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : isDark
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft size={16} />
            Sebelumnya
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                  currentPage === page
                    ? isDark
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-slate-900'
                    : isDark
                    ? 'text-white/50 hover:bg-white/10'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              currentPage === totalPages
                ? isDark ? 'text-white/30 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : isDark
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Selanjutnya
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
