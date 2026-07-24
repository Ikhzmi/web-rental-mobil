import { useState, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { api, ApiError, type StatusBooking } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';

const STATUS_LABEL: Record<StatusBooking, string> = {
  pending: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const NEXT_STATUS: Record<StatusBooking, StatusBooking[]> = {
  pending: ['dikonfirmasi', 'dibatalkan'],
  dikonfirmasi: ['berjalan'],
  berjalan: ['selesai'],
  selesai: [],
  dibatalkan: [],
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DokumenButton({ userId, tipe }: { userId: string; tipe: 'ktp' | 'sim' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const { signedUrl } = await api.getDokumenSignedUrl(userId, tipe);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        Lihat {tipe.toUpperCase()}
        <ExternalLink size={12} className="text-white/40" />
      </button>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

export default function AdminPesananDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: StatusBooking) => api.updateBookingStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Memuat pesanan...
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-sm text-white/60">Pesanan tidak ditemukan.</p>
        <Link to="/admin/pesanan" className="text-[#2563eb] text-sm hover:underline">
          Kembali ke Kelola Pesanan
        </Link>
      </div>
    );
  }

  const nextOptions = NEXT_STATUS[booking.status];

  return (
    <div>
      <button
        onClick={() => navigate('/admin/pesanan')}
        className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Kembali ke Kelola Pesanan
      </button>

      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-3xl italic text-white font-playfair">{booking.car?.nama ?? '-'}</h1>
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70">
          {STATUS_LABEL[booking.status]}
        </span>
      </div>
      <p className="mb-8 text-xs text-white/40">ID Pesanan: {booking.id}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <h2 className="mb-3 text-xs tracking-wider uppercase text-white/50">Ringkasan</h2>
            <div className="grid grid-cols-2 gap-y-2.5 text-sm">
              <span className="text-white/50">Penyewa</span>
              <span className="text-right text-white">{booking.profile?.nama ?? '-'}</span>
              <span className="text-white/50">Email</span>
              <span className="text-right text-white">{booking.profile?.email ?? '-'}</span>
              <span className="text-white/50">No. HP</span>
              <span className="text-right text-white">{booking.profile?.noHp ?? '-'}</span>
              <span className="text-white/50">Tanggal Ambil</span>
              <span className="text-right text-white">{formatTanggal(booking.tanggalMulai)}</span>
              <span className="text-white/50">Tanggal Kembali</span>
              <span className="text-right text-white">{formatTanggal(booking.tanggalSelesai)}</span>
              <span className="text-white/50">Lokasi Ambil</span>
              <span className="text-right text-white">{booking.lokasiAmbil}</span>
              <span className="text-white/50">Lokasi Kembali</span>
              <span className="text-right text-white">{booking.lokasiKembali}</span>
              <span className="text-white/50">Harga Dasar</span>
              <span className="text-right text-white">{formatRupiah(Number(booking.hargaDasar))}</span>
              {booking.addons?.map((addon) => (
                <Fragment key={addon.id}>
                  <span className="text-white/50">Add-on: {addon.jenis}</span>
                  <span className="text-right text-white">{formatRupiah(Number(addon.harga))}</span>
                </Fragment>
              ))}
              <span className="pt-2 font-medium text-white border-t border-white/10">Total</span>
              <span className="text-[#2563eb] font-medium text-right pt-2 border-t border-white/10">
                {formatRupiah(Number(booking.totalHarga))}
              </span>
            </div>
          </section>

          <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <h2 className="mb-3 text-xs tracking-wider uppercase text-white/50">
              Verifikasi Dokumen Penyewa
            </h2>
            <div className="flex flex-wrap gap-3">
              <DokumenButton userId={booking.userId} tipe="ktp" />
              <DokumenButton userId={booking.userId} tipe="sim" />
            </div>
          </section>

          <section className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/15 p-5">
            <div className="flex gap-3">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-amber-400 text-xs uppercase tracking-wider mb-1.5">
                  Bukti Transfer
                </h2>
                <p className="text-sm leading-relaxed text-white/60">
                  v1 belum punya upload bukti transfer di dalam aplikasi (payment gateway
                  eksplisit di luar cakupan v1 — §4.2 PRD). Penyewa mengirim bukti transfer
                  manual lewat WhatsApp/email; verifikasi dilakukan di luar sistem ini sebelum
                  kamu mengubah status ke "Dikonfirmasi" di bawah.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            <h2 className="mb-3 text-xs tracking-wider uppercase text-white/50">
              Riwayat Perubahan Status
            </h2>
            {booking.statusLogs && booking.statusLogs.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {booking.statusLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">
                      {log.statusLama} → <span className="text-white">{log.statusBaru}</span>
                    </span>
                    <span className="text-xs text-white/30">{formatTanggal(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/30">Belum ada perubahan status.</p>
            )}
          </section>
        </div>

        <div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sticky top-24">
            <h2 className="mb-3 text-xs tracking-wider uppercase text-white/50">Ubah Status</h2>

            {nextOptions.length === 0 ? (
              <p className="text-sm text-white/30">
                Status "{STATUS_LABEL[booking.status]}" adalah status akhir, tidak ada transisi
                lanjutan.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {nextOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2"
                  >
                    {statusMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Ubah ke "{STATUS_LABEL[s]}"
                  </button>
                ))}
              </div>
            )}

            {statusMutation.isError && (
              <p className="px-3 py-2 mt-3 text-xs text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
                Gagal mengubah status.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}