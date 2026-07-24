import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronRight } from 'lucide-react';
import { api, type StatusBooking } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useScrollReveal } from '../hooks/useScrollReveal';

const STATUS_LABEL: Record<StatusBooking, string> = {
  pending: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const STATUS_BADGE: Record<StatusBooking, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  dikonfirmasi: 'bg-[#2563eb]/15 text-[#2563eb]',
  berjalan: 'bg-purple-500/15 text-purple-400',
  selesai: 'bg-emerald-500/15 text-emerald-400',
  dibatalkan: 'bg-white/10 text-white/40',
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AkunPesananPage() {
  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: api.listMyBookings,
  });

  const listRef = useScrollReveal<HTMLDivElement>({ stagger: 0.07, dependencies: [bookings] });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-3xl mx-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Akun Saya</p>
        <h1 className="font-playfair italic text-white text-4xl sm:text-5xl mb-8">
          Riwayat Pesanan
        </h1>

        {isLoading && (
          <div className="flex items-center gap-2 text-white/50 py-16 justify-center">
            <Loader2 size={18} className="animate-spin" />
            Memuat riwayat pesanan...
          </div>
        )}

        {isError && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            Gagal memuat riwayat pesanan.
          </p>
        )}

        {bookings && bookings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/40 text-sm mb-4">Kamu belum pernah memesan mobil.</p>
            <Link to="/armada" className="text-[#2563eb] text-sm hover:underline">
              Lihat Armada
            </Link>
          </div>
        )}

        {bookings && bookings.length > 0 && (
          <div ref={listRef} className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                to={`/akun/pesanan/${booking.id}`}
                className="flex items-center gap-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 p-4 sm:p-5 transition-colors"
              >
                <div className="w-14 h-14 shrink-0 rounded-xl bg-white/5 overflow-hidden">
                  {booking.car?.images?.[0] && (
                    <div
                      className="w-full h-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${booking.car.images[0].url})` }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-medium truncate">{booking.car?.nama ?? '-'}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[booking.status]}`}
                    >
                      {STATUS_LABEL[booking.status]}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">
                    {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
                  </p>
                </div>

                <p className="text-white font-medium text-sm shrink-0 hidden sm:block">
                  {formatRupiah(Number(booking.totalHarga))}
                </p>

                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}