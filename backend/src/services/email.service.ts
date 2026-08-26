import { Resend } from 'resend';

// ============================================================================
// EMAIL SERVICE (notifikasi transaksional booking)
// ============================================================================
// Mengisi celah yang ditemukan di audit: customer sebelumnya TIDAK PERNAH
// diberi tahu kalau booking-nya dikonfirmasi/ditolak/dibatalkan — satu-
// satunya cara tahu adalah buka manual halaman Akun > Pesanan. Model
// Notification di database juga tidak punya kolom userId (bukan didesain
// untuk notifikasi per-customer), jadi email adalah jalan paling cepat
// untuk menutup celah ini tanpa perlu migrasi skema besar.
//
// KONFIGURASI: isi RESEND_API_KEY di .env untuk mengaktifkan pengiriman
// sungguhan. Selama belum diisi, semua fungsi di sini SENGAJA no-op (cuma
// log ke console) — mengikuti pola yang sama dengan isBayarGGConfigured()
// di bayargg.service.ts, supaya server tetap jalan normal di development
// tanpa kredensial email asli.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'KerenTal Kita <noreply@kerentalkita.id>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export function isEmailConfigured(): boolean {
  return !!resend;
}

interface BookingEmailData {
  to: string;
  namaPenyewa: string;
  namaMobil: string;
  bookingId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
}

function formatTanggalEmail(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function wrapEmailLayout(title: string, bodyHtml: string): string {
  // HTML sederhana, inline-style (supaya kompatibel di kebanyakan email
  // client — banyak yang strip <style> tag), sengaja tidak pakai
  // framework email builder supaya tidak nambah dependency lagi.
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
    <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #8b7355; margin: 0 0 8px;">KerenTal Kita</p>
    <h1 style="font-size: 22px; margin: 0 0 20px; font-weight: 600;">${title}</h1>
    ${bodyHtml}
    <p style="font-size: 12px; color: #999; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
      Email ini dikirim otomatis, tidak perlu dibalas. Ada pertanyaan? Hubungi kami lewat halaman Kontak di aplikasi.
    </p>
  </div>`;
}

async function sendBookingEmail(subject: string, html: string, to: string): Promise<void> {
  if (!resend) {
    console.log(`[email] (belum dikonfigurasi, dilewati) Ke: ${to} | Subjek: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
  } catch (error) {
    // Sengaja tidak throw — kegagalan kirim email TIDAK BOLEH menggagalkan
    // alur utama (update status booking tetap harus sukses walau emailnya
    // gagal terkirim, mis. domain belum terverifikasi di Resend).
    console.error(`[email] Gagal mengirim ke ${to}:`, error);
  }
}

export async function sendBookingConfirmedEmail(data: BookingEmailData): Promise<void> {
  const html = wrapEmailLayout(
    'Pesanan Kamu Dikonfirmasi ✓',
    `
    <p style="font-size: 14px; line-height: 1.6;">Halo ${data.namaPenyewa},</p>
    <p style="font-size: 14px; line-height: 1.6;">
      Pesanan <strong>${data.namaMobil}</strong> kamu sudah dikonfirmasi. Berikut detailnya:
    </p>
    <table style="width: 100%; font-size: 14px; margin: 16px 0; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #666;">Tanggal Ambil</td><td style="text-align: right;">${formatTanggalEmail(data.tanggalMulai)}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Tanggal Kembali</td><td style="text-align: right;">${formatTanggalEmail(data.tanggalSelesai)}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">ID Pesanan</td><td style="text-align: right; font-family: monospace;">${data.bookingId.slice(0, 8)}</td></tr>
    </table>
    <a href="${APP_URL}/akun/pesanan/${data.bookingId}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; margin-top: 8px;">
      Lihat Detail Pesanan
    </a>`
  );
  await sendBookingEmail('Pesanan Dikonfirmasi — KerenTal Kita', html, data.to);
}

export async function sendBookingCancelledEmail(
  data: BookingEmailData,
  reason: 'ditolak_admin' | 'dibatalkan_otomatis' | 'dibatalkan_user'
): Promise<void> {
  const reasonText: Record<typeof reason, string> = {
    ditolak_admin: 'Mohon maaf, pesanan kamu tidak dapat kami proses lebih lanjut.',
    dibatalkan_otomatis: 'Pesanan ini dibatalkan otomatis karena pembayaran tidak diselesaikan dalam batas waktu yang ditentukan.',
    dibatalkan_user: 'Pesanan ini telah dibatalkan sesuai permintaanmu.',
  };

  const html = wrapEmailLayout(
    'Pesanan Dibatalkan',
    `
    <p style="font-size: 14px; line-height: 1.6;">Halo ${data.namaPenyewa},</p>
    <p style="font-size: 14px; line-height: 1.6;">
      Pesanan <strong>${data.namaMobil}</strong> (ID: ${data.bookingId.slice(0, 8)}) telah dibatalkan.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #666;">${reasonText[reason]}</p>
    <a href="${APP_URL}/armada" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; margin-top: 8px;">
      Cari Mobil Lain
    </a>`
  );
  await sendBookingEmail('Pesanan Dibatalkan — KerenTal Kita', html, data.to);
}