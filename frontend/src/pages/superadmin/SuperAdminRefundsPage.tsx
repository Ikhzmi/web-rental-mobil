import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type StatusRefund, type RefundData } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const STATUS_TABS: Array<{ id: StatusRefund | 'semua'; label: string }> = [
  { id: 'semua', label: 'Semua Status' },
  { id: 'menunggu_persetujuan', label: 'Menunggu' },
  { id: 'disetujui', label: 'Disetujui' },
  { id: 'diproses', label: 'Diproses' },
  { id: 'berhasil', label: 'Berhasil' },
  { id: 'ditolak', label: 'Ditolak' },
];

export default function SuperAdminRefundsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = useState<StatusRefund | 'semua'>('semua');
  const [selectedInstansi, setSelectedInstansi] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal actions
  const [selectedRefund, setSelectedRefund] = useState<RefundData | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<StatusRefund>('disetujui');
  const [catatan, setCatatan] = useState('');

  // Fetch instansi list for filter
  const { data: instansiList } = useQuery({
    queryKey: ['superadmin-instansi-list'],
    queryFn: () => api.listInstansi(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-refunds', selectedTab, selectedInstansi, search, page],
    queryFn: () =>
      api.listSuperAdminRefunds({
        page,
        limit: 15,
        instansiId: selectedInstansi || undefined,
        status: selectedTab === 'semua' ? undefined : selectedTab,
        cari: search.trim() || undefined,
      }),
  });

  const refunds = data?.data ?? [];
  const stats = data?.stats;
  const meta = data?.meta;

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRefund) return;
      return await api.actionSuperAdminRefund(selectedRefund.id, {
        status: overrideStatus,
        catatan: catatan.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-refunds'] });
      setSelectedRefund(null);
      setCatatan('');
    },
  });

  const cardClass = getGlassCardClass(isDark);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Monitoring Refund Lintas Platform
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Pengawasan seluruh pengembalian dana 100% penuh dari rental mobil ke pelanggan.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Total Refund Berhasil
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className={`text-xl font-black mt-2 text-emerald-500 truncate`}>
            {formatRupiah(stats?.totalNilaiRefundBerhasil ?? 0)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            {stats?.berhasil ?? 0} transaksi berhasil ditransfer
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Total Refund Pending
            </span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className={`text-xl font-black mt-2 text-amber-500 truncate`}>
            {formatRupiah(stats?.totalNilaiRefundPending ?? 0)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            {(stats?.menunggu_persetujuan ?? 0) + (stats?.diproses ?? 0)} transaksi antre transfer
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
            Menunggu konfirmasi bank
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              Pengajuan Ditolak
            </span>
            <Ban size={16} className="text-rose-500" />
          </div>
          <p className={`text-2xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats?.ditolak ?? 0}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Tidak memenuhi syarat pembatalan
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border ${cardClass} space-y-4`}>
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
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

          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Filter by Instansi */}
            <select
              value={selectedInstansi}
              onChange={(e) => {
                setSelectedInstansi(e.target.value);
                setPage(1);
              }}
              className={`text-xs rounded-xl px-3 py-2.5 outline-none transition-all border ${
                isDark
                  ? 'bg-[#1a1a1a] border-white/10 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="">Semua Instansi Rental</option>
              {instansiList?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.namaInstansi}
                </option>
              ))}
            </select>

            {/* Search Bar */}
            <div className="relative flex-1 lg:w-64">
              <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari ID, penyewa, rekening..."
                className={`w-full text-xs rounded-xl pl-9 pr-3.5 py-2.5 outline-none transition-all border ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        {isLoading ? (
          <div className="py-20 flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
            <span className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Memuat data refund lintas platform...</span>
          </div>
        ) : refunds.length === 0 ? (
          <div className="py-20 text-center">
            <p className={`text-sm font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Tidak ada data refund yang ditemukan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b uppercase font-bold text-[10px] tracking-wider ${
                isDark ? 'border-white/10 text-white/40 bg-white/[0.02]' : 'border-slate-200 text-slate-500 bg-slate-50/50'
              }`}>
                <tr>
                  <th className="py-3 px-4">Booking / Unit</th>
                  <th className="py-3 px-4">Instansi Rental</th>
                  <th className="py-3 px-4">Penyewa</th>
                  <th className="py-3 px-4">Rekening Tujuan</th>
                  <th className="py-3 px-4">Jumlah (100%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Intervensi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {refunds.map((r) => {
                  const statusColor = {
                    menunggu_persetujuan: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-800',
                    disetujui: isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-800',
                    diproses: isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-800',
                    berhasil: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-800',
                    ditolak: isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-800',
                  }[r.status];

                  return (
                    <tr key={r.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-emerald-500">
                          #{r.bookingId.slice(0, 8)}
                        </span>
                        <p className={`font-medium text-xs mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {r.booking?.car?.nama ?? '-'}
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-amber-500 shrink-0" />
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {r.booking?.car?.instansi?.namaInstansi ?? '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {r.booking?.profile?.nama ?? '-'}
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {r.booking?.profile?.noHp ?? r.booking?.profile?.email ?? '-'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className={`font-mono font-medium ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                          {r.rekeningTujuan || '-'}
                        </p>
                        {r.alasan && (
                          <p className={`text-[10px] italic mt-0.5 line-clamp-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                            "{r.alasan}"
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-emerald-500">
                          {formatRupiah(Number(r.jumlahRefund))}
                        </p>
                        <span className="text-[10px] text-emerald-600/80">100% full refund</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {r.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRefund(r);
                            setOverrideStatus(r.status);
                            setCatatan(r.catatan || '');
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                          }`}
                        >
                          Intervensi
                        </button>
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
          <div className={`p-4 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-500'
          }`}>
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

      {/* SuperAdmin Override Modal */}
      <AnimatePresence>
        {selectedRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedRefund(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
                isDark ? 'bg-[#141414] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">Super Admin Override Refund</h3>
                <button
                  onClick={() => setSelectedRefund(null)}
                  className={isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={`p-3.5 rounded-xl mb-4 text-xs space-y-1.5 ${isDark ? 'bg-white/5' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/50' : 'text-slate-500'}>ID Booking:</span>
                  <span className="font-mono font-bold">#{selectedRefund.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Jumlah:</span>
                  <span className="font-bold text-emerald-500">{formatRupiah(Number(selectedRefund.jumlahRefund))}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Rekening:</span>
                  <span className="font-mono text-right">{selectedRefund.rekeningTujuan}</span>
                </div>
              </div>

              <div className="mb-3">
                <label className={`text-xs mb-1.5 block font-semibold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                  Ubah Status Menjadi
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as StatusRefund)}
                  className={`w-full text-xs rounded-xl p-3 outline-none border ${
                    isDark
                      ? 'bg-[#1f1f1f] border-white/10 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="disetujui">Disetujui (Antrean Transfer)</option>
                  <option value="diproses">Diproses (Sedang Ditransfer)</option>
                  <option value="berhasil">Berhasil (Dana Telah Diterima Pelanggan)</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>

              <div className="mb-4">
                <label className={`text-xs mb-1.5 block font-semibold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                  Catatan Intervensi Platform
                </label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={2}
                  placeholder="Catatan alasan perubahan status..."
                  className={`w-full text-xs rounded-xl p-3 outline-none resize-none border ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                  }`}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => actionMutation.mutate()}
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {actionMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  Simpan Perubahan
                </button>
                <button
                  onClick={() => setSelectedRefund(null)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-medium transition-colors ${
                    isDark ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
