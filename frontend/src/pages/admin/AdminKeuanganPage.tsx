import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Download,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { api, type InstansiFinancialData } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

export default function AdminKeuanganPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'transactions' | 'disbursements' | 'refunds'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'belum_dicairkan' | 'diproses' | 'selesai' | 'refunded' | 'dibatalkan'>('all');

  const { data: financialResp, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-financials'],
    queryFn: () => api.getInstansiFinancials(),
    staleTime: 2 * 60 * 1000,
  });

  const financialData: InstansiFinancialData | undefined = (financialResp as any)?.data ?? financialResp;

  const filteredBookings = useMemo(() => {
    if (!financialData?.bookings) return [];
    return financialData.bookings.filter((b) => {
      const matchSearch =
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.carNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customerNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.carPlat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.statusBooking.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'belum_dicairkan' && b.disbursementStatus === 'belum_dicairkan') ||
        (statusFilter === 'diproses' && b.disbursementStatus === 'diproses') ||
        (statusFilter === 'selesai' && (b.disbursementStatus === 'selesai' || b.disbursementStatus === 'berhasil')) ||
        (statusFilter === 'refunded' && (b.disbursementStatus === 'refunded' || !!b.refundStatus)) ||
        (statusFilter === 'dibatalkan' && (b.disbursementStatus === 'dibatalkan' || b.statusBooking === 'dibatalkan'));

      return matchSearch && matchStatus;
    });
  }, [financialData?.bookings, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!financialData) return;

    if (activeTab === 'refunds') {
      const headers = ['ID Booking', 'Armada', 'Plat Nomor', 'Nama Penyewa', 'Alasan', 'Jumlah Refund (Rp)', 'Rekening Tujuan', 'Status Refund', 'Tanggal'];
      const rows = refunds.map((r) => [
        `"${r.bookingId}"`,
        `"${r.carNama.replace(/"/g, '""')}"`,
        `"${r.carPlat}"`,
        `"${r.customerNama.replace(/"/g, '""')}"`,
        `"${r.alasan.replace(/"/g, '""')}"`,
        r.jumlahRefund,
        `"${r.rekeningTujuan}"`,
        `"${r.status}"`,
        `"${new Date(r.createdAt).toLocaleDateString('id-ID')}"`,
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Refund_${financialData.instansi.namaInstansi.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      'ID Pesanan',
      'Tanggal Dibuat',
      'Nama Armada',
      'Plat Nomor',
      'Nama Penyewa',
      'Status Booking',
      'Total Kotor (Rp)',
      'Komisi Platform (Rp)',
      'Pendapatan Bersih (Rp)',
      'Status Pencairan / Refund',
    ];

    const rows = filteredBookings.map((b) => {
      let statusLabel = 'Belum Dicairkan';
      if (b.disbursementStatus === 'selesai' || b.disbursementStatus === 'berhasil') statusLabel = 'Sudah Dicairkan';
      else if (b.disbursementStatus === 'diproses') statusLabel = 'Proses Pencairan';
      else if (b.disbursementStatus === 'refunded') statusLabel = `Refund (${b.refundStatus || 'Diproses'})`;
      else if (b.disbursementStatus === 'dibatalkan') statusLabel = 'Dibatalkan';
      else if (b.disbursementStatus === 'menunggu_pembayaran') statusLabel = 'Menunggu Pembayaran';

      return [
        `"${b.id}"`,
        `"${new Date(b.createdAt).toLocaleDateString('id-ID')}"`,
        `"${b.carNama.replace(/"/g, '""')}"`,
        `"${b.carPlat}"`,
        `"${b.customerNama.replace(/"/g, '""')}"`,
        `"${b.statusBooking}"`,
        b.gross,
        b.komisiPlatform,
        b.nett,
        `"${statusLabel}"`,
      ];
    });

    // Total summary row
    const totalGross = filteredBookings.reduce((sum, item) => sum + item.gross, 0);
    const totalKomisi = filteredBookings.reduce((sum, item) => sum + item.komisiPlatform, 0);
    const totalNett = filteredBookings.reduce((sum, item) => sum + item.nett, 0);

    const summaryRow = [
      '"TOTAL"',
      '""',
      '""',
      '""',
      '""',
      '""',
      totalGross,
      totalKomisi,
      totalNett,
      '""',
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Keuangan_${financialData.instansi.namaInstansi.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className={`p-8 rounded-2xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
          <div className="h-6 w-48 bg-white/20 rounded mb-3" />
          <div className="h-4 w-96 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-32 rounded-2xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-white/60'}`} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !financialData) {
    return (
      <div className={`p-8 rounded-2xl text-center ${getGlassCardClass(isDark)}`}>
        <AlertCircle size={40} className="mx-auto text-rose-500 mb-3" />
        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Gagal Memuat Detail Keuangan
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          Terjadi kesalahan saat mengambil data laporan keuangan instansi Anda.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
        >
          <RefreshCw size={16} /> Coba Lagi
        </button>
      </div>
    );
  }

  const { instansi, summary, disbursements } = financialData;
  const refunds = financialData.refunds ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 sm:p-8 rounded-3xl relative overflow-hidden ${getGlassCardClass(isDark)}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                Laporan & Transaksi Keuangan
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                Potongan Komisi: {instansi.komisiPlatformPersen}%
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Rincian Keuangan {instansi.namaInstansi}
            </h1>
            <p className={`text-xs sm:text-sm mt-1 flex items-center gap-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              <Building2 size={15} className="shrink-0 text-amber-500" />
              Rekening Bank Instansi: <strong className={isDark ? 'text-white/90' : 'text-slate-800'}>{instansi.rekeningBank || 'Belum diatur'}</strong>
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-lg ${
              isDark
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <FileSpreadsheet size={18} />
            <span>Ekspor Excel / CSV</span>
            <Download size={16} />
          </button>
        </div>
      </motion.div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Pendapatan Bersih */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-5 rounded-2xl ${getGlassCardClass(isDark)} border-emerald-500/20`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Total Pendapatan Bersih
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatRupiah(summary.totalNetRevenue)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Kotor: {formatRupiah(summary.totalGrossRevenue)}
          </p>
        </motion.div>

        {/* Stat 2: Saldo Siap Dicairkan */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-5 rounded-2xl ${getGlassCardClass(isDark)} border-amber-500/20`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Saldo Siap Dicairkan
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Wallet size={18} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {formatRupiah(summary.saldoSiapDicairkanNett)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Booking selesai belum masuk batch cair
          </p>
        </motion.div>

        {/* Stat 3: Total Sudah Dicairkan */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-5 rounded-2xl ${getGlassCardClass(isDark)} border-blue-500/20`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Dana Sudah Dicairkan
            </span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {formatRupiah(summary.saldoSudahDicairkanNett)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Proses: {formatRupiah(summary.saldoDalamProsesNett)}
          </p>
        </motion.div>

        {/* Stat 4: Komisi Platform */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-5 rounded-2xl ${getGlassCardClass(isDark)} border-purple-500/20`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Potongan Komisi ({instansi.komisiPlatformPersen}%)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <DollarSign size={18} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
            {formatRupiah(summary.totalPlatformCommission)}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Kontribusi Komisi Platform
          </p>
        </motion.div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl space-y-4 ${getGlassCardClass(isDark)}`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b pb-4 border-white/10">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-black/20 backdrop-blur-md flex-wrap">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'transactions'
                  ? isDark
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDark
                  ? 'text-white/50 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rincian Transaksi ({filteredBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('disbursements')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'disbursements'
                  ? isDark
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDark
                  ? 'text-white/50 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat Batch Pencairan ({disbursements.length})
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'refunds'
                  ? isDark
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDark
                  ? 'text-white/50 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat Refund ({refunds.length})
            </button>
          </div>

          {/* Search & Status Filter */}
          {activeTab === 'transactions' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Cari armada, pelanggan, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                    isDark
                      ? 'bg-black/30 border-white/10 text-white placeholder-white/40 focus:border-emerald-500'
                      : 'bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                  }`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`py-2 px-3 text-xs rounded-xl border outline-none transition-all ${
                  isDark
                    ? 'bg-black/30 border-white/10 text-white focus:border-emerald-500'
                    : 'bg-white/80 border-slate-200 text-slate-900 focus:border-emerald-600'
                }`}
              >
                <option value="all" className={isDark ? 'bg-zinc-900' : ''}>Semua Status Transaksi</option>
                <option value="belum_dicairkan" className={isDark ? 'bg-zinc-900' : ''}>Belum Dicairkan</option>
                <option value="diproses" className={isDark ? 'bg-zinc-900' : ''}>Proses Pencairan</option>
                <option value="selesai" className={isDark ? 'bg-zinc-900' : ''}>Sudah Dicairkan</option>
                <option value="refunded" className={isDark ? 'bg-zinc-900' : ''}>Refund / Pengembalian Dana</option>
                <option value="dibatalkan" className={isDark ? 'bg-zinc-900' : ''}>Dibatalkan</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Transactions Breakdown */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-sm opacity-50">
                Tidak ada transaksi yang cocok dengan filter pencarian.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-3 font-semibold">ID Pesanan</th>
                    <th className="py-3 px-3 font-semibold">Armada</th>
                    <th className="py-3 px-3 font-semibold">Penyewa</th>
                    <th className="py-3 px-3 font-semibold">Tanggal Sewa</th>
                    <th className="py-3 px-3 font-semibold text-right">Total Kotor</th>
                    <th className="py-3 px-3 font-semibold text-right">Komisi ({instansi.komisiPlatformPersen}%)</th>
                    <th className="py-3 px-3 font-semibold text-right">Pendapatan Bersih</th>
                    <th className="py-3 px-3 font-semibold text-center">Status Pencairan / Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.map((b) => {
                    return (
                      <tr
                        key={b.id}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono text-[11px] font-semibold">
                          #{b.id.slice(0, 8)}
                          <div className="mt-0.5">
                            <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded capitalize ${
                              b.statusBooking === 'selesai' ? 'bg-emerald-500/10 text-emerald-400' :
                              b.statusBooking === 'berjalan' ? 'bg-blue-500/10 text-blue-400' :
                              b.statusBooking === 'dikonfirmasi' ? 'bg-purple-500/10 text-purple-400' :
                              b.statusBooking === 'dibatalkan' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {b.statusBooking.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold">{b.carNama}</p>
                          <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{b.carPlat}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium">{b.customerNama}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p>{new Date(b.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(b.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {formatRupiah(b.gross)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-400 font-medium">
                          -{formatRupiah(b.komisiPlatform)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {formatRupiah(b.nett)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {b.disbursementStatus === 'selesai' || b.disbursementStatus === 'berhasil' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 size={12} /> Sudah Dicairkan
                            </span>
                          ) : b.disbursementStatus === 'diproses' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              <Clock size={12} /> Diproses
                            </span>
                          ) : b.disbursementStatus === 'refunded' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              <AlertCircle size={12} /> Refund {b.refundStatus ? `(${b.refundStatus})` : ''}
                            </span>
                          ) : b.disbursementStatus === 'dibatalkan' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <AlertCircle size={12} /> Dibatalkan
                            </span>
                          ) : b.disbursementStatus === 'menunggu_pembayaran' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                              <Clock size={12} /> Menunggu Bayar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Belum Dicairkan
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Disbursements Batches */}
        {activeTab === 'disbursements' && (
          <div className="overflow-x-auto">
            {disbursements.length === 0 ? (
              <div className="py-12 text-center text-sm opacity-50">
                Belum ada riwayat batch pencairan dana dari SuperAdmin.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-3 font-semibold">ID Batch</th>
                    <th className="py-3 px-3 font-semibold">Tanggal Pembuatan</th>
                    <th className="py-3 px-3 font-semibold">Rekening Bank Tujuan</th>
                    <th className="py-3 px-3 font-semibold text-right">Jumlah Kotor</th>
                    <th className="py-3 px-3 font-semibold text-right">Komisi Platform</th>
                    <th className="py-3 px-3 font-semibold text-right">Jumlah Bersih Diterima</th>
                    <th className="py-3 px-3 font-semibold text-center">Status Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {disbursements.map((d) => (
                    <tr
                      key={d.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-[11px] font-semibold">
                        #{d.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium">{new Date(d.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        {d.dicairkanPada && (
                          <p className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            Cair: {new Date(d.dicairkanPada).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {d.rekeningTujuan}
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {formatRupiah(d.jumlahKotor)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-400 font-medium">
                        -{formatRupiah(d.komisiPlatform)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {formatRupiah(d.jumlahBersih)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {d.status === 'berhasil' || d.status === 'selesai' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 size={12} /> Selesai / Ditransfer
                          </span>
                        ) : d.status === 'diproses' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <Clock size={12} /> Sedang Diproses
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <AlertCircle size={12} /> Gagal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Refunds History */}
        {activeTab === 'refunds' && (
          <div className="overflow-x-auto">
            {refunds.length === 0 ? (
              <div className="py-12 text-center text-sm opacity-50">
                Belum ada riwayat pengembalian dana (refund) untuk instansi ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-3 font-semibold">ID Booking</th>
                    <th className="py-3 px-3 font-semibold">Armada</th>
                    <th className="py-3 px-3 font-semibold">Penyewa</th>
                    <th className="py-3 px-3 font-semibold">Alasan Refund</th>
                    <th className="py-3 px-3 font-semibold text-right">Jumlah Refund</th>
                    <th className="py-3 px-3 font-semibold">Rekening Tujuan</th>
                    <th className="py-3 px-3 font-semibold text-center">Status Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {refunds.map((r) => (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-[11px] font-semibold">
                        #{r.bookingId.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold">{r.carNama}</p>
                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{r.carPlat}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium">{r.customerNama}</p>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate" title={r.alasan}>
                        {r.alasan}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">
                        {formatRupiah(r.jumlahRefund)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {r.rekeningTujuan}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.status === 'berhasil' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 size={12} /> Selesai / Dikembalikan
                          </span>
                        ) : r.status === 'ditolak' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <AlertCircle size={12} /> Ditolak
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock size={12} /> Diproses / Menunggu
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
