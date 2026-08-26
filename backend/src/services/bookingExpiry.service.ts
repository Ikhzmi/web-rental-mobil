import { prisma } from '../lib/prisma';
import { getSystemActorId } from '../lib/systemActor';
import { sendBookingCancelledEmail } from './email.service';

/**
 * Auto-expire booking yang "mengendap" di status menunggu_pembayaran.
 *
 * MASALAH YANG DIPERBAIKI:
 * Booking dibuat (POST /api/bookings) SEBELUM proses checkout/pembayaran
 * dimulai (POST /api/bookings/:id/checkout membuat invoice + record
 * Payment secara terpisah). Selama status masih 'menunggu_pembayaran',
 * tanggal itu dianggap terpakai oleh availability.service.ts (mencegah
 * booking lain bentrok) — ini benar SELAMA pembayaran masih mungkin
 * terjadi. Tapi sebelumnya TIDAK ADA mekanisme apa pun yang membatalkan
 * booking kalau user:
 *   a) membuat booking lalu tidak pernah lanjut ke checkout sama sekali
 *      (tidak ada invoice yang dibuat, sehingga webhook 'expired' dari
 *      bayar.gg TIDAK PERNAH terpicu untuk booking ini — invoice-nya
 *      memang tidak pernah ada), ATAU
 *   b) sudah checkout dan dapat invoice, tapi webhook 'expired' dari
 *      bayar.gg gagal sampai (isu jaringan/gateway).
 * Akibatnya booking bisa mengendap di menunggu_pembayaran SELAMANYA dan
 * memblokir tanggal itu untuk penyewa lain tanpa batas waktu.
 *
 * SOLUSI: job berkala (lihat pemanggilannya di index.ts) yang membatalkan
 * otomatis dua kategori booking basi ini, dengan jangka waktu berbeda:
 *   - Belum pernah checkout (tidak ada record Payment) → batalkan setelah
 *     BOOKING_NO_PAYMENT_TIMEOUT_MINUTES sejak dibuat. Tidak ada alasan
 *     sah booking tanpa invoice mengendap lama.
 *   - Sudah checkout, invoice masih 'pending' di sisi kita → batalkan
 *     setelah BOOKING_PENDING_PAYMENT_TIMEOUT_HOURS, sedikit lebih lama
 *     dari masa berlaku invoice bayar.gg (24 jam) sebagai jaring pengaman
 *     kalau webhook gagal sampai — bukan pengganti webhook, cuma cadangan.
 *
 * PERBAIKAN (revisi ini): versi sebelumnya menulis `diubahOleh: 'system'`
 * ke BookingStatusLog — tapi kolom itu WAJIB UUID valid yang mereferensikan
 * Profile (foreign key), jadi tiap kali job ini jalan akan gagal karena
 * constraint violation dan seluruh transaksi (termasuk pembatalan booking
 * yang sebenarnya) ikut rollback — auto-expire jadi tidak pernah benar-benar
 * bekerja. Juga field `keterangan` yang dipakai di versi sebelumnya TIDAK
 * ADA di model BookingStatusLog sama sekali (kebetulan lolos karena Prisma
 * Client belum sempat di-generate saat itu, jadi tsc tidak sempat menangkap
 * field yang tidak valid). Sekarang: log status HANYA ditulis kalau ada
 * akun super_admin yang bisa dipakai sebagai "pelaku" sistem (dicari sekali
 * lalu di-cache); kalau tidak ada, pembatalan booking tetap jalan (bagian
 * yang benar-benar penting), cuma tanpa entri riwayat.
 */

const NO_PAYMENT_TIMEOUT_MS = (Number(process.env.BOOKING_NO_PAYMENT_TIMEOUT_MINUTES) || 60) * 60 * 1000;
const PENDING_PAYMENT_TIMEOUT_MS = (Number(process.env.BOOKING_PENDING_PAYMENT_TIMEOUT_HOURS) || 25) * 60 * 60 * 1000;

export async function expireStaleBookings(): Promise<{ cancelled: number }> {
  const now = Date.now();
  let cancelledCount = 0;

  try {
    const systemActorId = await getSystemActorId();

    // Kategori A: belum pernah checkout sama sekali (tidak ada Payment).
    const noPaymentCutoff = new Date(now - NO_PAYMENT_TIMEOUT_MS);
    const abandonedBookings = await prisma.booking.findMany({
      where: {
        status: 'menunggu_pembayaran',
        createdAt: { lt: noPaymentCutoff },
        payment: null,
      },
      select: {
        id: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        car: { select: { nama: true } },
        profile: { select: { nama: true, email: true } },
      },
    });

    // Kategori B: sudah checkout, invoice masih pending di kita, tapi
    // sudah lewat jauh dari masa berlaku invoice — webhook kemungkinan
    // gagal sampai.
    const pendingPaymentCutoff = new Date(now - PENDING_PAYMENT_TIMEOUT_MS);
    const stalePendingBookings = await prisma.booking.findMany({
      where: {
        status: 'menunggu_pembayaran',
        createdAt: { lt: pendingPaymentCutoff },
        payment: { status: 'pending' },
      },
      select: {
        id: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        payment: { select: { id: true } },
        car: { select: { nama: true } },
        profile: { select: { nama: true, email: true } },
      },
    });

    for (const b of abandonedBookings) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id: b.id }, select: { status: true } });
        if (current?.status !== 'menunggu_pembayaran') return; // sudah berubah status, lewati
        await tx.booking.update({ where: { id: b.id }, data: { status: 'dibatalkan' } });
        if (systemActorId) {
          await tx.bookingStatusLog.create({
            data: {
              bookingId: b.id,
              statusLama: 'menunggu_pembayaran',
              statusBaru: 'dibatalkan',
              diubahOleh: systemActorId,
            },
          });
        }
      });
      void sendBookingCancelledEmail(
        {
          to: b.profile.email,
          namaPenyewa: b.profile.nama,
          namaMobil: b.car.nama,
          bookingId: b.id,
          tanggalMulai: b.tanggalMulai.toISOString(),
          tanggalSelesai: b.tanggalSelesai.toISOString(),
        },
        'dibatalkan_otomatis'
      );
      cancelledCount++;
    }

    for (const b of stalePendingBookings) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id: b.id }, select: { status: true } });
        if (current?.status !== 'menunggu_pembayaran') return;
        await tx.booking.update({ where: { id: b.id }, data: { status: 'dibatalkan' } });
        if (b.payment) {
          await tx.payment.update({ where: { id: b.payment.id }, data: { status: 'expired' } });
        }
        if (systemActorId) {
          await tx.bookingStatusLog.create({
            data: {
              bookingId: b.id,
              statusLama: 'menunggu_pembayaran',
              statusBaru: 'dibatalkan',
              diubahOleh: systemActorId,
            },
          });
        }
      });
      void sendBookingCancelledEmail(
        {
          to: b.profile.email,
          namaPenyewa: b.profile.nama,
          namaMobil: b.car.nama,
          bookingId: b.id,
          tanggalMulai: b.tanggalMulai.toISOString(),
          tanggalSelesai: b.tanggalSelesai.toISOString(),
        },
        'dibatalkan_otomatis'
      );
      cancelledCount++;
    }

    if (cancelledCount > 0) {
      console.log(`[bookingExpiry] Membatalkan ${cancelledCount} booking basi (${abandonedBookings.length} tanpa checkout, ${stalePendingBookings.length} invoice kedaluwarsa)`);
    }
  } catch (error) {
    console.error('[bookingExpiry] Gagal menjalankan pembersihan booking basi:', error);
  }

  return { cancelled: cancelledCount };
}

/**
 * Jalankan expireStaleBookings() secara berkala. Dipanggil sekali saat
 * server start (lihat index.ts). Interval default 10 menit — cukup
 * responsif untuk melepas slot tanpa membebani database.
 */
export function startBookingExpiryJob(intervalMs = 10 * 60 * 1000): NodeJS.Timeout {
  // Jalankan sekali di awal juga, jangan tunggu interval pertama.
  void expireStaleBookings();
  return setInterval(() => {
    void expireStaleBookings();
  }, intervalMs);
}