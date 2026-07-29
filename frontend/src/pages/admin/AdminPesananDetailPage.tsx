import { useState, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, ApiError, type StatusBooking } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { useTheme } from '../../hooks/useTheme';

const STATUS_LABEL: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const NEXT_STATUS: Record<StatusBooking, StatusBooking[]> = {
  menunggu_pembayaran: ['dikonfirmasi', 'dibatalkan'],
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

function DokumenButton({ userId, tipe, isDark }: { userId: string; tipe: 'ktp' | 'sim'; isDark: boolean }) {
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
        className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60 ${
          isDark
            ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
            : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700'
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        Lihat {tipe.toUpperCase()}
        <ExternalLink size={12} className={isDark ? 'text-white/40' : 'text-slate-400'} />
      </button>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

export default function AdminPesananDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] border border-white/10 p-5'
    : 'rounded-2xl bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-5';

  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-slate-500';
  const borderClass = isDark ? 'border-white/10' : 'border-slate-200';

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 py-16 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
        <Loader2 size={18} className="animate-spin" />
        Memuat pesanan...
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="py-16 text-center">
        <p className={`mb-3 text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Pesanan tidak ditemukan.</p>
        <Link to="/admin/pesanan" className={isDark ? 'text-blue-400 text-sm hover:underline' : 'text-blue-600 text-sm hover:underline'}>
          Kembali ke Kelola Pesanan
        </Link>
      </div>
    );
  }

  const nextOptions = NEXT_STATUS[booking.status];

  return (
    <div>
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/pesanan')}
        className={`flex items-center gap-1.5 text-sm mb-6 transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <ArrowLeft size={16} />
        Kembali ke Kelola Pesanan
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 mb-1"
      >
        <h1 className={`font-playfair italic text-3xl ${textClass}`}>{booking.car?.nama ?? '-'}</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={`mb-8 text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}
      >
        ID Pesanan: {booking.id}
      </motion.p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cardClass}
          >
            <h2 className={`mb-3 text-xs tracking-wider uppercase ${textMutedClass}`}>Ringkasan</h2>
            <div className="grid grid-cols-2 gap-y-2.5 text-sm">
              <span className={textMutedClass}>Penyewa</span>
              <span className={`text-right ${textClass}`}>{booking.profile?.nama ?? '-'}</span>
              <span className={textMutedClass}>Email</span>
              <span className={`text-right ${textClass}`}>{booking.profile?.email ?? '-'}</span>
              <span className={textMutedClass}>No. HP</span>
              <span className={`text-right ${textClass}`}>{booking.profile?.noHp ?? '-'}</span>
              <span className={textMutedClass}>Tanggal Ambil</span>
              <span className={`text-right ${textClass}`}>{formatTanggal(booking.tanggalMulai)}</span>
              <span className={textMutedClass}>Tanggal Kembali</span>
              <span className={`text-right ${textClass}`}>{formatTanggal(booking.tanggalSelesai)}</span>
              <span className={textMutedClass}>Lokasi Ambil</span>
              <span className={`text-right ${textClass}`}>{booking.lokasiAmbil}</span>
              <span className={textMutedClass}>Lokasi Kembali</span>
              <span className={`text-right ${textClass}`}>{booking.lokasiKembali}</span>
              <span className={textMutedClass}>Harga Dasar</span>
              <span className={`text-right ${textClass}`}>{formatRupiah(Number(booking.hargaDasar))}</span>
              {booking.addons?.map((addon) => (
                <Fragment key={addon.id}>
                  <span className={textMutedClass}>Add-on: {addon.jenis}</span>
                  <span className={`text-right ${textClass}`}>{formatRupiah(Number(addon.harga))}</span>
                </Fragment>
              ))}
              <span className={`pt-2 font-medium ${textClass} border-t ${borderClass}`}>Total</span>
              <span className={`font-medium text-right pt-2 border-t ${isDark ? 'text-blue-400 border-white/10' : 'text-blue-600 border-slate-200'}`}>
                {formatRupiah(Number(booking.totalHarga))}
              </span>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={cardClass}
          >
            <h2 className={`mb-3 text-xs tracking-wider uppercase ${textMutedClass}`}>
              Verifikasi Dokumen Penyewa
            </h2>
            <div className="flex flex-wrap gap-3">
              <DokumenButton userId={booking.userId} tipe="ktp" isDark={isDark} />
              <DokumenButton userId={booking.userId} tipe="sim" isDark={isDark} />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-5 ${
              isDark ? 'bg-amber-500/[0.04] border border-amber-500/15' : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <div className="flex gap-3">
              <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              <div>
                <h2 className={`text-xs uppercase tracking-wider mb-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  Bukti Transfer
                </h2>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  v1 belum punya upload bukti transfer di dalam aplikasi (payment gateway
                  eksplisit di luar cakupan v1 — §4.2 PRD). Penyewa mengirim bukti transfer
                  manual lewat WhatsApp/email; verifikasi dilakukan di luar sistem ini sebelum
                  kamu mengubah status ke "Dikonfirmasi" di bawah.
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={cardClass}
          >
            <h2 className={`mb-3 text-xs tracking-wider uppercase ${textMutedClass}`}>
              Riwayat Perubahan Status
            </h2>
            {booking.statusLogs && booking.statusLogs.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {booking.statusLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-white/70' : 'text-slate-700'}>
                      {log.statusLama} → <span className={textClass}>{log.statusBaru}</span>
                    </span>
                    <span className={`text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{formatTanggal(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Belum ada perubahan status.</p>
            )}
          </motion.section>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-5 sticky top-24 ${cardClass}`}
          >
            <h2 className={`mb-3 text-xs tracking-wider uppercase ${textMutedClass}`}>Ubah Status</h2>

            {nextOptions.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                Status "{STATUS_LABEL[booking.status]}" adalah status akhir, tidak ada transisi lanjutan.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {nextOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                    className={`text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2 disabled:opacity-60 ${
                      isDark
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {statusMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Ubah ke "{STATUS_LABEL[s]}"
                  </button>
                ))}
              </div>
            )}

            {statusMutation.isError && (
              <p className={`px-3 py-2 mt-3 text-xs rounded-lg ${
                isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                Gagal mengubah status.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
