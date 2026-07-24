import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api, type StatusBooking } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';

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

// Sesuai §11.4 PRD — cuma transisi ini yang valid, sama persis dengan
// VALID_TRANSITIONS di backend (adminBookings.routes.ts). Kalau backend
// menolak transisi lain, dropdown di sini memang sengaja tidak
// menawarkannya sama sekali.
const NEXT_STATUS: Record<StatusBooking, StatusBooking[]> = {
  pending: ['dikonfirmasi', 'dibatalkan'],
  dikonfirmasi: ['berjalan'],
  berjalan: ['selesai'],
  selesai: [],
  dibatalkan: [],
};

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminPesananPage() {
  const [filterStatus, setFilterStatus] = useState<StatusBooking | ''>('');
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['admin-bookings', filterStatus],
    queryFn: () => api.listAdminBookings(filterStatus ? { status: filterStatus } : {}),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusBooking }) =>
      api.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });

  const selectClass =
    'bg-white/5 border border-white/15 text-white text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-white/40 [&>option]:bg-[#0a0f1a]';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Admin</p>
          <h1 className="text-3xl italic text-white font-playfair sm:text-4xl">Kelola Pesanan</h1>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusBooking | '')}
          className={selectClass}
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-white/50">
          <Loader2 size={18} className="animate-spin" />
          Memuat pesanan...
        </div>
      )}

      {isError && (
        <p className="px-4 py-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
          Gagal memuat daftar pesanan.
        </p>
      )}

      {bookings && (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => {
            const nextOptions = NEXT_STATUS[booking.status];
            return (
              <div
                key={booking.id}
                className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white truncate">{booking.car?.nama ?? '-'}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[booking.status]}`}>
                      {STATUS_LABEL[booking.status]}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">
                    {booking.profile?.nama} &middot; {formatTanggal(booking.tanggalMulai)} —{' '}
                    {formatTanggal(booking.tanggalSelesai)}
                  </p>
                </div>

                <p className="text-sm font-medium text-white shrink-0">
                  {formatRupiah(Number(booking.totalHarga))}
                </p>

                <Link
                  to={`/admin/pesanan/${booking.id}`}
                  className="text-xs underline text-white/50 hover:text-white shrink-0 underline-offset-2"
                >
                  Detail
                </Link>

                {nextOptions.length > 0 && (
                  <select
                    defaultValue=""
                    disabled={statusMutation.isPending}
                    onChange={(e) => {
                      const value = e.target.value as StatusBooking;
                      if (value) statusMutation.mutate({ id: booking.id, status: value });
                    }}
                    className={selectClass + ' shrink-0'}
                  >
                    <option value="" disabled>
                      Ubah status...
                    </option>
                    {nextOptions.map((s) => (
                      <option key={s} value={s}>
                        → {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          {bookings.length === 0 && (
            <p className="py-12 text-sm text-center text-white/30">Belum ada pesanan.</p>
          )}
        </div>
      )}
    </div>
  );
}