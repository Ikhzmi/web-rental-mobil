import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api, type SuperAdminTransactionItem } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'commission' | 'disbursement';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  description: string;
  createdAt: string;
  instansi?: string;
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getTypeIcon(type: Transaction['type']) {
  switch (type) {
    case 'payment':
      return <CreditCard size={14} />;
    case 'commission':
      return <CheckCircle size={14} />;
    case 'disbursement':
      return <Clock size={14} />;
    case 'refund':
      return <XCircle size={14} />;
    default:
      return <Clock size={14} />;
  }
}

function getTypeColor(type: Transaction['type'], isDark: boolean) {
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

function getStatusBadge(status: Transaction['status'], isDark: boolean) {
  switch (status) {
    case 'success':
      return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
        }`}>
          Berhasil
        </span>
      );
    case 'pending':
      return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
        }`}>
          Pending
        </span>
      );
    case 'failed':
      return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
        }`}>
          Gagal
        </span>
      );
  }
}

export function RecentTransactions() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Fetch from real API
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['superadmin-recent-transactions'],
    queryFn: () => api.listSuperAdminTransactions({ limit: 5 }),
    staleTime: 30 * 1000,
  });

  const transactions: Transaction[] = (transactionsData?.data ?? []).map((t: SuperAdminTransactionItem) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    status: t.status,
    description: t.description,
    createdAt: t.createdAt,
    instansi: t.instansi,
  }));

  return (
    <div className={`p-5 rounded-2xl ${getGlassCardClass(isDark)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Transaksi Terbaru
        </h3>
        <Link
          to="/superadmin/transactions"
          className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Lihat Semua
        </Link>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-lg animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className="flex-1">
                  <div className={`h-3 w-3/4 rounded animate-pulse mb-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-2 w-1/2 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>
              </div>
            ))}
          </>
        ) : transactions.length === 0 ? (
          <p className={`text-sm text-center py-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Belum ada transaksi
          </p>
        ) : (
          transactions.slice(0, 5).map((txn) => (
          <div
            key={txn.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
            }`}
          >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getTypeColor(txn.type, isDark)}`}>
              {getTypeIcon(txn.type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {txn.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  {txn.instansi ?? '-'}
                </span>
                <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                  • {formatTimeAgo(txn.createdAt)}
                </span>
              </div>
            </div>

            {/* Amount & Status */}
            <div className="text-right shrink-0">
              <p className={`text-xs font-semibold ${txn.type === 'refund' ? 'text-red-400' : 'text-emerald-400'}`}>
                {txn.type === 'refund' ? '-' : '+'}{formatRupiah(txn.amount)}
              </p>
              {getStatusBadge(txn.status, isDark)}
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}
