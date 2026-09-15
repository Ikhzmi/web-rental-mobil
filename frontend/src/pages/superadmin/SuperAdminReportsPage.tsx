import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  CreditCard,
  Calendar,
  Download,
  CheckCircle2,
  DollarSign,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import { api, type SuperAdminReportsData } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';
import { SkeletonStatsGrid, SkeletonPanel } from '../../components/Skeleton';

export default function SuperAdminReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch reports data from API
  const { data, isLoading, isError, refetch } = useQuery<SuperAdminReportsData>({
    queryKey: ['superadmin-reports', selectedPeriod],
    queryFn: () => api.getSuperAdminReports(selectedPeriod),
    staleTime: 5 * 60 * 1000,
  });

  // Export Excel generator with rich formatting & styles
  const handleExportExcel = () => {
    if (!data) return;

    const periodLabel =
      selectedPeriod === '7d' ? '7 Hari Terakhir'
      : selectedPeriod === '30d' ? '30 Hari Terakhir'
      : selectedPeriod === '90d' ? '90 Hari Terakhir'
      : '1 Tahun Terakhir';

    const dateStr = new Date().toLocaleString('id-ID');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Superadmin</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .title { font-size: 16pt; font-weight: bold; color: #065f46; text-align: left; padding: 10px 0; }
          .meta { font-size: 10pt; color: #475569; margin-bottom: 15px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th { background-color: #065f46; color: #ffffff; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #047857; }
          td { padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 10pt; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .category { font-weight: bold; color: #0f172a; background-color: #e2e8f0; }
          .currency { text-align: right; font-family: monospace; font-weight: 600; }
          .number { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="title">LAPORAN KINERJA PLATFORM KERENTAL KITA</div>
        <div class="meta">
          <strong>Periode:</strong> ${periodLabel} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Tanggal Ekspor:</strong> ${dateStr}
        </div>
        <table>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Metrik / Indikator</th>
              <th style="text-align: right;">Nilai</th>
              <th style="text-align: center;">Perubahan Tren</th>
            </tr>
          </thead>
          <tbody>
            <!-- FINANSIAL -->
            <tr>
              <td class="category" colspan="4">1. KINERJA FINANSIAL & KOMISI PLATFORM</td>
            </tr>
            <tr>
              <td>Finansial</td>
              <td>Total Komisi Platform (Pendapatan Bersih Platform)</td>
              <td class="currency">${formatRupiah(data.commission.total)}</td>
              <td style="text-align: center;">${data.trends.revenue !== undefined ? (data.trends.revenue >= 0 ? '+' + data.trends.revenue + '%' : data.trends.revenue + '%') : '-'}</td>
            </tr>
            <tr>
              <td>Finansial</td>
              <td>Total Volume Transaksi Kotor Rental</td>
              <td class="currency">${formatRupiah(data.revenue.total)}</td>
              <td style="text-align: center;">${data.trends.revenue !== undefined ? (data.trends.revenue >= 0 ? '+' + data.trends.revenue + '%' : data.trends.revenue + '%') : '-'}</td>
            </tr>
            <tr>
              <td>Finansial</td>
              <td>Pendapatan Transaksi Bulan Berjalan</td>
              <td class="currency">${formatRupiah(data.revenue.thisMonth)}</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Finansial</td>
              <td>Rata-rata Pendapatan Transaksi Harian</td>
              <td class="currency">${formatRupiah(data.revenue.daily)}</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Finansial</td>
              <td>Komisi Belum Dicairkan (Pending)</td>
              <td class="currency">${formatRupiah(data.commission.pending)}</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Finansial</td>
              <td>Efektif Rate Komisi Platform</td>
              <td class="number">${data.commission.rate}%</td>
              <td style="text-align: center;">-</td>
            </tr>

            <!-- PEMESANAN -->
            <tr>
              <td class="category" colspan="4">2. OPERASIONAL & PEMESANAN</td>
            </tr>
            <tr>
              <td>Pemesanan</td>
              <td>Total Pemesanan (Volume Booking)</td>
              <td class="number">${data.booking.total} transaksi</td>
              <td style="text-align: center;">${data.trends.booking !== undefined ? (data.trends.booking >= 0 ? '+' + data.trends.booking + '%' : data.trends.booking + '%') : '-'}</td>
            </tr>
            <tr>
              <td>Pemesanan</td>
              <td>Pemesanan Selesai</td>
              <td class="number">${data.booking.completed} transaksi</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pemesanan</td>
              <td>Pemesanan Sedang Aktif</td>
              <td class="number">${data.booking.active} transaksi</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pemesanan</td>
              <td>Tingkat Penyelesaian (Completion Rate)</td>
              <td class="number">${data.booking.completionRate}%</td>
              <td style="text-align: center;">-</td>
            </tr>

            <!-- PENGGUNA & MITRA -->
            <tr>
              <td class="category" colspan="4">3. MITRA & PELANGGAN</td>
            </tr>
            <tr>
              <td>Pengguna & Mitra</td>
              <td>Total Pelanggan Terdaftar</td>
              <td class="number">${data.customer.total} pengguna</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pengguna & Mitra</td>
              <td>Pelanggan Baru Periode Ini</td>
              <td class="number">+${data.customer.newThisPeriod} pengguna</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pengguna & Mitra</td>
              <td>Tingkat Retensi Pelanggan (Retention Rate)</td>
              <td class="number">${data.customer.retentionRate}%</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pengguna & Mitra</td>
              <td>Total Instansi Rental Terdaftar</td>
              <td class="number">${data.rental.total} instansi</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pengguna & Mitra</td>
              <td>Instansi Rental Aktif</td>
              <td class="number">${data.rental.active} instansi</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Pengguna & Mitra</td>
              <td>Rata-rata Nilai per Rental</td>
              <td class="currency">${formatRupiah(data.rental.avgRevenue)}</td>
              <td style="text-align: center;">-</td>
            </tr>

            <!-- ARMADA -->
            <tr>
              <td class="category" colspan="4">4. ARMADA KENDARAAN</td>
            </tr>
            <tr>
              <td>Armada</td>
              <td>Total Armada Kendaraan</td>
              <td class="number">${data.fleet.total} unit</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Armada</td>
              <td>Armada Tersedia Saat Ini</td>
              <td class="number">${data.fleet.available} unit</td>
              <td style="text-align: center;">-</td>
            </tr>
            <tr>
              <td>Armada</td>
              <td>Tingkat Utilisasi Armada</td>
              <td class="number">${data.fleet.utilization}%</td>
              <td style="text-align: center;">-</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laporan_superadmin_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Laporan & Analitik Terpadu
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Rekapitulasi lengkap performa bisnis, transaksi, armada, dan pertumbuhan mitra platform
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector */}
          <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
            {[
              { key: '7d', label: '7 Hari' },
              { key: '30d', label: '30 Hari' },
              { key: '90d', label: '90 Hari' },
              { key: '1y', label: '1 Tahun' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedPeriod(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedPeriod === item.key
                    ? isDark
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDark
                    ? 'text-white/50 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isLoading || !data}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50 ${
              isDark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Download size={15} />
            Export Excel
          </button>
        </div>
      </motion.div>

      {/* Loading Skeleton — susunan menyerupai isi: 4 kartu + 3 kolom ringkasan */}
      {isLoading ? (
        <div className="space-y-6">
          <SkeletonStatsGrid isDark={isDark} count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonPanel isDark={isDark} rows={5} />
            <SkeletonPanel isDark={isDark} rows={5} />
            <SkeletonPanel isDark={isDark} rows={5} />
          </div>
        </div>
      ) : isError || !data ? (
        <div className={`p-12 text-center rounded-2xl border ${getGlassCardClass(isDark)}`}>
          <p className="text-sm font-medium mb-3 text-red-400">Gagal memuat data laporan</p>
          <button
            onClick={() => refetch()}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Komisi Platform (Pendapatan Platform) */}
            <div className={`p-5 rounded-2xl border ${getGlassCardClass(isDark)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Total Komisi Platform</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-400">
                  <CreditCard size={16} />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatRupiah(data.commission.total)}
              </p>
              {data.trends.revenue !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  data.trends.revenue >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {data.trends.revenue >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>{data.trends.revenue > 0 ? `+${data.trends.revenue}%` : `${data.trends.revenue}%`}</span>
                  <span className={`font-normal ml-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>vs periode lalu</span>
                </div>
              )}
            </div>

            {/* Card 2: Total Volume Transaksi Kotor */}
            <div className={`p-5 rounded-2xl border ${getGlassCardClass(isDark)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Total Transaksi Kotor</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-400">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatRupiah(data.revenue.total)}
              </p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                Pending: <span className="font-semibold text-amber-400">{formatRupiah(data.commission.pending)}</span>
              </p>
            </div>

            {/* Card 3: Total Booking */}
            <div className={`p-5 rounded-2xl border ${getGlassCardClass(isDark)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Volume Pemesanan</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/15 text-violet-400">
                  <Calendar size={16} />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {data.booking.total} <span className="text-sm font-normal text-slate-400">booking</span>
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">{data.booking.completed} Selesai</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-400 font-semibold">{data.booking.active} Aktif</span>
              </div>
            </div>

            {/* Card 4: Mitra & Armada */}
            <div className={`p-5 rounded-2xl border ${getGlassCardClass(isDark)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Mitra & Armada</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400">
                  <Building2 size={16} />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {data.rental.active} <span className="text-sm font-normal text-slate-400">Mitra Aktif</span>
              </p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                Utilisasi armada: <span className="font-semibold text-emerald-400">{data.fleet.utilization}%</span>
              </p>
            </div>
          </div>

          {/* Unified Report Overview - Consolidated Table Sections */}
          <div className={`rounded-2xl border overflow-hidden ${getGlassCardClass(isDark)}`}>
            {/* Header of Section */}
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Rincian Data Kinerja Komprehensif
                </h2>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'}`}>
                Siap Produksi
              </span>
            </div>

            {/* Content Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Kolom 1: Finansial & Komisi */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <DollarSign size={14} />
                  </div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Kinerja Finansial
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Pendapatan Kotor:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatRupiah(data.revenue.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Pendapatan Bulan Berjalan:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatRupiah(data.revenue.thisMonth)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Rata-rata Harian:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatRupiah(data.revenue.daily)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Komisi Platform Bersih:</span>
                    <span className="font-bold text-emerald-400">
                      {formatRupiah(data.commission.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Komisi Pending:</span>
                    <span className="font-bold text-amber-400">
                      {formatRupiah(data.commission.pending)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Rata-rata Komisi:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {data.commission.rate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Kolom 2: Operasional & Pemesanan */}
              <div className="space-y-4 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Activity size={14} />
                  </div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Operasional & Armada
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Total Pemesanan:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {data.booking.total} transaksi
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Pemesanan Selesai:</span>
                    <span className="font-semibold text-emerald-400">
                      {data.booking.completed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Pemesanan Berjalan:</span>
                    <span className="font-semibold text-blue-400">
                      {data.booking.active}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Completion Rate:</span>
                    <span className="font-bold text-emerald-400">
                      {data.booking.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Total Armada:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {data.fleet.total} unit
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Armada Tersedia:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {data.fleet.available} unit
                    </span>
                  </div>
                </div>
              </div>

              {/* Kolom 3: Pertumbuhan Mitra & Pengguna */}
              <div className="space-y-4 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Users size={14} />
                  </div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Mitra & Pelanggan
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Total Pelanggan:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {data.customer.total} pengguna
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Pelanggan Baru:</span>
                    <span className="font-semibold text-emerald-400">
                      +{data.customer.newThisPeriod}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Customer Retention Rate:</span>
                    <span className="font-bold text-blue-400">
                      {data.customer.retentionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Total Mitra Instansi:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {data.rental.total} instansi
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Mitra Aktif:</span>
                    <span className="font-semibold text-emerald-400">
                      {data.rental.active} instansi
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className={isDark ? 'text-white/60' : 'text-slate-600'}>Rata-rata Nilai per Mitra:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatRupiah(data.rental.avgRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Summary Note */}
            <div className={`px-6 py-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-white/10 bg-white/[0.01] text-white/40' : 'border-slate-200 bg-slate-50/50 text-slate-500'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Data dihitung secara langsung dari basis data transaksi riil platform KerenTal Kita</span>
              </div>
              <span>Status: Siap Produksi</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}