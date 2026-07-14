import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** Status booking yang dihitung sebagai penghalang slot (§11.2 PRD). */
const BLOCKING_STATUSES = ['pending', 'dikonfirmasi', 'berjalan'] as const;

interface OverlapCheckParams {
  carId: string;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  /** Saat mengecek ulang booking yang sedang diedit, kecualikan dirinya sendiri. */
  excludeBookingId?: string;
}

/**
 * Mengecek apakah rentang tanggal yang diminta bentrok dengan booking lain
 * pada mobil yang sama. Formula overlap sesuai §11.2 PRD:
 *
 *   booking_baru.tanggal_mulai   < booking_lain.tanggal_selesai
 *   DAN
 *   booking_baru.tanggal_selesai > booking_lain.tanggal_mulai
 *
 * Dipanggil di dalam transaksi (lihat pricing.service.ts /
 * bookings.routes.ts) supaya pengecekan + insert booking baru atomik —
 * mencegah race condition dua booking dapat slot yang sama.
 */
export async function isCarAvailable(
  tx: Prisma.TransactionClient | typeof prisma,
  { carId, tanggalMulai, tanggalSelesai, excludeBookingId }: OverlapCheckParams
): Promise<boolean> {
  const conflicting = await tx.booking.findFirst({
    where: {
      carId,
      status: { in: [...BLOCKING_STATUSES] },
      tanggalMulai: { lt: tanggalSelesai },
      tanggalSelesai: { gt: tanggalMulai },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true },
  });

  return conflicting === null;
}

/**
 * Mengembalikan seluruh rentang tanggal yang sudah terbooking untuk satu
 * mobil — dipakai endpoint publik `GET /api/cars/:id/availability` untuk
 * menandai tanggal yang tidak bisa dipilih di kalender (F3 PRD).
 */
export async function getBookedDateRanges(carId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      carId,
      status: { in: [...BLOCKING_STATUSES] },
    },
    select: { tanggalMulai: true, tanggalSelesai: true },
    orderBy: { tanggalMulai: 'asc' },
  });

  return bookings.map((b) => ({
    tanggalMulai: b.tanggalMulai,
    tanggalSelesai: b.tanggalSelesai,
  }));
}
