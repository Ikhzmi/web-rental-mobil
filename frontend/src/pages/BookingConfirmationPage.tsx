import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Copy } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { useScrollReveal } from '../hooks/useScrollReveal';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Sedang Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const NOMOR_REKENING = '1234567890 a.n. KerenTal Kita (Bank Contoh)';

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function BookingConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(NOMOR_REKENING);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dipanggil sebelum early return di bawah (Rules of Hooks). y lebih
  // besar dari default — cocok untuk momen "sukses" yang terasa lebih
  // sedikit dramatis dibanding reveal biasa.
  const revealRef = useScrollReveal<HTMLDivElement>({
    y: 28,
    stagger: 0.14,
    dependencies: [bookingQuery.data?.id],
  });

  if (bookingQuery.isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center gap-2 text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Memuat pesanan...
      </main>
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex flex-col items-center justify-center gap-3 text-white/60 text-sm px-5 text-center">
        <p>Pesanan tidak ditemukan.</p>
        <Link to="/armada" className="text-[#2563eb] hover:underline">
          Kembali ke Katalog Armada
        </Link>
      </main>
    );
  }

  const booking = bookingQuery.data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-24 pb-20 px-5 sm:px-10 md:px-14">
      <div ref={revealRef} className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={26} className="text-emerald-400" />
          </div>
          <h1 className="font-playfair italic text-white text-3xl mb-1">Pesanan Diterima</h1>
          <p className="text-white/50 text-sm">
            Status: <span className="text-white">{STATUS_LABEL[booking.status]}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5 mb-5">
          <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3">
            Ringkasan Pesanan
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Mobil</span>
              <span className="text-white">{booking.car?.nama ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Tanggal Ambil</span>
              <span className="text-white">{formatTanggal(booking.tanggalMulai)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Tanggal Kembali</span>
              <span className="text-white">{formatTanggal(booking.tanggalSelesai)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Lokasi Ambil</span>
              <span className="text-white text-right">{booking.lokasiAmbil}</span>
            </div>
            {booking.addons && booking.addons.length > 0 && (
              <div className="flex justify-between">
                <span className="text-white/50">Add-on</span>
                <span className="text-white text-right">
                  {booking.addons.map((a) => a.jenis).join(', ')}
                </span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 mt-1 flex justify-between font-medium">
              <span className="text-white">Total</span>
              <span className="text-[#2563eb]">{formatRupiah(Number(booking.totalHarga))}</span>
            </div>
          </div>
        </div>

        {booking.status === 'pending' && (
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5 mb-5">
            <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3">
              Instruksi Pembayaran
            </h2>
            <p className="text-white/60 text-sm mb-3">
              Transfer sejumlah <strong className="text-white">
                {formatRupiah(Number(booking.totalHarga))}
              </strong>{' '}
              ke rekening berikut, lalu kirim bukti transfer ke admin lewat WhatsApp/email.
              Pesanan akan dikonfirmasi setelah pembayaran diverifikasi.
            </p>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <span>{NOMOR_REKENING}</span>
              <Copy size={14} className="text-white/40 shrink-0" />
            </button>
            {copied && <p className="text-emerald-400 text-xs mt-1.5">Tersalin ke clipboard</p>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/akun/pesanan"
            className="flex-1 text-center bg-white/10 hover:bg-white/15 text-white text-sm font-medium py-3 rounded-full transition-colors"
          >
            Lihat Riwayat Pesanan
          </Link>
          <Link
            to="/armada"
            className="flex-1 text-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium py-3 rounded-full transition-colors"
          >
            Sewa Mobil Lain
          </Link>
        </div>
      </div>
    </main>
  );
}
