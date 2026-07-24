import { useQuery } from '@tanstack/react-query';
import { Loader2, Wallet, ClipboardList, Gauge, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: api.getDashboardSummary,
  });

  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.08, dependencies: [data] });

  return (
    <div>
      <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Admin</p>
      <h1 className="mb-8 text-3xl italic text-white font-playfair sm:text-4xl">Dashboard</h1>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-white/50">
          <Loader2 size={18} className="animate-spin" />
          Memuat ringkasan...
        </div>
      )}

      {isError && (
        <p className="px-4 py-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
          Gagal memuat ringkasan dashboard.
        </p>
      )}

      {data && (
        <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <div className="flex items-center justify-center mb-3 rounded-full w-9 h-9 bg-emerald-500/15">
              <Wallet size={16} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-medium text-white">
              {formatRupiah(data.totalPendapatanBulanIni)}
            </p>
            <p className="mt-1 text-xs text-white/40">Pendapatan bulan ini</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <div className="w-9 h-9 rounded-full bg-[#2563eb]/15 flex items-center justify-center mb-3">
              <ClipboardList size={16} className="text-[#2563eb]" />
            </div>
            <p className="text-2xl font-medium text-white">{data.jumlahPesananAktif}</p>
            <p className="mt-1 text-xs text-white/40">Pesanan aktif</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <div className="flex items-center justify-center mb-3 rounded-full w-9 h-9 bg-amber-500/15">
              <Gauge size={16} className="text-amber-400" />
            </div>
            <p className="text-2xl font-medium text-white">{data.tingkatOkupansiArmada}%</p>
            <p className="mt-1 text-xs text-white/40">
              Okupansi armada ({data.mobilSedangBerjalan}/{data.totalMobilTersedia} mobil)
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <div className="flex items-center justify-center mb-3 rounded-full w-9 h-9 bg-purple-500/15">
              <Trophy size={16} className="text-purple-400" />
            </div>
            <p className="text-lg font-medium text-white truncate">
              {data.mobilTerlaris?.nama ?? '—'}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Mobil terlaris
              {data.mobilTerlaris ? ` (${data.mobilTerlaris.jumlahBooking}x disewa)` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}