import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  RotateCcw,
} from 'lucide-react';
import { api, type StatusRefund, type RefundData } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { SkeletonStatsGrid, SkeletonTable } from '../../components/Skeleton';

const STATUS_TABS: Array<{ id: StatusRefund | 'semua'; label: string }> = [
  { id: 'semua', label: 'Semua Status' },
  { id: 'menunggu_persetujuan', label: 'Menunggu' },
  { id: 'disetujui', label: 'Disetujui' },
  { id: 'diproses', label: 'Diproses' },
  { id: 'berhasil', label: 'Berhasil' },
  { id: 'ditolak', label: 'Ditolak' },
];

const STATUS_CONFIG: Record<StatusRefund, { label: string; darkBg: string; lightBg: string }> = {
  menunggu_persetujuan: {
    label: 'Menunggu Persetujuan',
    darkBg: 'bg-amber-500/15 text-amber-400',
    lightBg: 'bg-amber-100 text-amber-800',
  },
  disetujui: {
    label: 'Disetujui SuperAdmin',
    darkBg: 'bg-sky-500/15 text-sky-400',
    lightBg: 'bg-sky-100 text-sky-800',
  },
  diproses: {
    label: 'Sedang Ditransfer',
    darkBg: 'bg-indigo-500/15 text-indigo-400',
    lightBg: 'bg-indigo-100 text-indigo-800',
  },
  berhasil: {
    label: 'Berhasil Dikembalikan',
    darkBg: 'bg-emerald-500/15 text-emerald-400',
    lightBg: 'bg-emerald-100 text-emerald-800',
  },
  ditolak: {
    label: 'Ditolak',
    darkBg: 'bg-rose-500/15 text-rose-400',
    lightBg: 'bg-rose-100 text-rose-800',
  },
};

export default function AdminRefundsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedTab, setSelectedTab] = useState<StatusRefund | 'semua'>('semua');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds', selectedTab, search, page],
    queryFn: () =>
      api.listAdminRefunds({
        page,
        limit: 15,
        status: selectedTab === 'semua' ? undefined : selectedTab,
        cari: search.trim() || undefined,
      }),
  });

  const refunds: RefundData[] = data?.data ?? [];
  const stats = data?.stats;
  const meta = data?.meta;

  const cardClass = isDark
    ? 'bg-white/[0.03] border-white/10'
    : 'bg-white/40 border-white/60 shadow-sm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Riwayat Pengembalian Dana
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Pantau status refund pelanggan yang membatalkan pesanan di instansi Anda.
        </p>
      </div>

      {/* Info Banner — menjelaskan alur refund, tidak ada aksi di sini */}
      <div
        className={`flex gap-3 items-start p-4 rounded-2xl border ${
          isDark
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}
      >
        <Info size={18} className="shrink-0 mt-0.5 text-blue-400" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold mb-0.5">Halaman ini hanya untuk monitoring — tidak ada aksi.</p>
          <p className={isDark ? 'text-blue-200/70' : 'text-blue-700'}>
            Pembayaran pelanggan masuk langsung ke rekening <strong>SuperAdmin</strong>. Proses
            persetujuan, transfer, dan konfirmasi pengembalian dana sepenuhnya dikelola oleh
            SuperAdmin. Anda hanya dapat memantau status refund dari pesanan yang dibatalkan.
          </p>
        </div>
      </div>

      {/* Stat Cards — skeleton saat loading agar tidak flash 0/Rp0 */}
      {isLoading ? (
        <SkeletonStatsGrid isDark={isDark} count={4} />
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Menunggu Review
            </span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className={`text-2xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats?.menunggu_persetujuan ?? 0}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Belum diproses SuperAdmin
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Sedang Ditransfer
            </span>
            <RefreshCw size={16} className="text-indigo-500" />
          </div>
          <p className={`text-2xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats?.diproses ?? 0}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Dalam proses transfer
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Selesai Ditransfer
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className={`text-2xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats?.berhasil ?? 0}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Refund berhasil dikirim
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              Total Dana Dikembalikan
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className={`text-xl font-black mt-2 text-emerald-500 truncate`}>
            {formatRupiah(stats?.totalNilaiRefund ?? 0)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            100% penuh tanpa potongan
          </p>
        </div>
      </div>
      )}

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border ${cardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTab(tab.id);
                  setPage(1);
                }}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari ID, penyewa, armada..."
              className={`w-full text-xs rounded-xl pl-9 pr-3.5 py-2.5 outline-none transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        {isLoading ? (
          <SkeletonTable rows={5} cols={6} isDark={isDark} />
        ) : refunds.length === 0 ? (
          <div className="py-20 text-center">
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              <RotateCcw size={24} className={isDark ? 'text-white/30' : 'text-slate-400'} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Tidak ada data pengajuan refund.
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              Refund muncul saat pelanggan membatalkan pesanan yang sudah dibayar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b uppercase font-bold text-[10px] tracking-wider ${
                  isDark
                    ? 'border-white/10 text-white/40 bg-white/[0.02]'
                    : 'border-slate-200 text-slate-500 bg-slate-50/50'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Pesanan / Armada</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Rekening Tujuan</th>
                  <th className="py-3 px-4">Jumlah Refund</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {refunds.map((r) => {
                  const cfg = STATUS_CONFIG[r.status];
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}
                    >
                      {/* Pesanan */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/pesanan/${r.bookingId}`}
                          className="font-mono font-semibold text-emerald-500 hover:underline"
                        >
                          #{r.bookingId.slice(0, 8)}
                        </Link>
                        <p className={`font-medium text-xs mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {r.booking?.car?.nama ?? '-'}
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {new Date(r.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </td>

                      {/* Pelanggan */}
                      <td className="py-3.5 px-4">
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {r.booking?.profile?.nama ?? '-'}
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {r.booking?.profile?.noHp ?? r.booking?.profile?.email ?? '-'}
                        </p>
                      </td>

                      {/* Rekening */}
                      <td className="py-3.5 px-4">
                        {r.rekeningTujuan ? (
                          <p className={`font-mono font-medium ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                            {r.rekeningTujuan}
                          </p>
                        ) : (
                          <span className={`text-[10px] italic ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            Belum diisi
                          </span>
                        )}
                        {r.alasan && (
                          <p className={`text-[10px] italic mt-0.5 line-clamp-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                            "{r.alasan}"
                          </p>
                        )}
                      </td>

                      {/* Jumlah */}
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-emerald-500">
                          {formatRupiah(Number(r.jumlahRefund))}
                        </p>
                        <span className="text-[10px] text-emerald-600/80">0% potongan</span>
                      </td>

                      {/* Status — read-only badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDark ? cfg?.darkBg : cfg?.lightBg
                          }`}
                        >
                          {cfg?.label ?? r.status}
                        </span>
                        {r.status === 'ditolak' && r.catatan && (
                          <p className={`text-[10px] italic mt-1 line-clamp-1 ${isDark ? 'text-rose-400/70' : 'text-rose-600'}`}>
                            {r.catatan}
                          </p>
                        )}
                      </td>

                      {/* View only — NO action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/pesanan/${r.bookingId}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                            isDark
                              ? 'border-white/10 hover:bg-white/10 text-white/60 hover:text-white'
                              : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Eye size={13} />
                          <span>Lihat</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div
            className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span>
              Halaman {meta.page} dari {meta.totalPages} ({meta.total} refund)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`p-1.5 rounded-lg border disabled:opacity-40 ${
                  isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className={`p-1.5 rounded-lg border disabled:opacity-40 ${
                  isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

