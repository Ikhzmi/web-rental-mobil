import { useState, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';
import { api, ApiError, type StatusBooking } from '../lib/api';
import { formatRupiah } from '../lib/pricing';

const STATUS_LABEL: Record<StatusBooking, string> = {
  pending: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function AkunPesananDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['my-booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelBooking(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setConfirmingCancel(false);
    },
    onError: (err) => {
      setCancelError(err instanceof ApiError ? err.message : 'Gagal membatalkan pesanan');
    },
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 flex items-center justify-center gap-2 text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Memuat pesanan...
      </main>
    );
  }

  if (isError || !booking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 flex flex-col items-center justify-center gap-3 text-center px-5">
        <p className="text-white/60 text-sm">Pesanan tidak ditemukan.</p>
        <Link to="/akun/pesanan" className="text-[#2563eb] text-sm hover:underline">
          Kembali ke Riwayat Pesanan
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-24 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate('/akun/pesanan')}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Kembali ke Riwayat Pesanan
        </button>

        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-playfair italic text-white text-3xl">{booking.car?.nama ?? '-'}</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70">
            {STATUS_LABEL[booking.status]}
          </span>
        </div>
        <p className="text-white/40 text-xs mb-6">ID Pesanan: {booking.id}</p>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 mb-5">
          <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3">Ringkasan</h2>
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            <span className="text-white/50">Tanggal Ambil</span>
            <span className="text-white text-right">{formatTanggal(booking.tanggalMulai)}</span>
            <span className="text-white/50">Tanggal Kembali</span>
            <span className="text-white text-right">{formatTanggal(booking.tanggalSelesai)}</span>
            <span className="text-white/50">Lokasi Ambil</span>
            <span className="text-white text-right">{booking.lokasiAmbil}</span>
            <span className="text-white/50">Lokasi Kembali</span>
            <span className="text-white text-right">{booking.lokasiKembali}</span>
            <span className="text-white/50">Harga Dasar</span>
            <span className="text-white text-right">{formatRupiah(Number(booking.hargaDasar))}</span>
            {booking.addons?.map((addon) => (
              <Fragment key={addon.id}>
                <span className="text-white/50">Add-on: {addon.jenis}</span>
                <span className="text-white text-right">{formatRupiah(Number(addon.harga))}</span>
              </Fragment>
            ))}
            <span className="text-white font-medium pt-2 border-t border-white/10">Total</span>
            <span className="text-[#2563eb] font-medium text-right pt-2 border-t border-white/10">
              {formatRupiah(Number(booking.totalHarga))}
            </span>
          </div>
        </div>

        {booking.status === 'pending' && (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
            {!confirmingCancel ? (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Batalkan Pesanan
              </button>
            ) : (
              <div>
                <p className="text-white/70 text-sm mb-3">Yakin batalkan pesanan ini?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-60"
                  >
                    {cancelMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Ya, Batalkan
                  </button>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    className="text-white/50 hover:text-white text-sm px-4 py-2"
                  >
                    Tidak
                  </button>
                </div>
                {cancelError && <p className="text-red-400 text-xs mt-2">{cancelError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}