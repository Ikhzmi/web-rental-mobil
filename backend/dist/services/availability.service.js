"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCarAvailable = isCarAvailable;
exports.getBookedDateRanges = getBookedDateRanges;
const prisma_1 = require("../lib/prisma");
/** Status booking yang dihitung sebagai penghalang slot (§11.2 PRD). */
const BLOCKING_STATUSES = ['menunggu_pembayaran', 'dikonfirmasi', 'berjalan'];
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
async function isCarAvailable(tx, { carId, tanggalMulai, tanggalSelesai, excludeBookingId }) {
    const conflictingBooking = await tx.booking.findFirst({
        where: {
            carId,
            status: { in: [...BLOCKING_STATUSES] },
            tanggalMulai: { lte: tanggalSelesai },
            tanggalSelesai: { gte: tanggalMulai },
            ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
        select: { id: true },
    });
    if (conflictingBooking !== null) {
        return false;
    }
    const conflictingBlocked = await tx.carBlockedDate.findFirst({
        where: {
            carId,
            tanggalMulai: { lt: tanggalSelesai },
            tanggalSelesai: { gte: tanggalMulai },
        },
        select: { id: true },
    });
    return conflictingBlocked === null;
}
/**
 * Mengembalikan seluruh rentang tanggal yang tidak tersedia (booking & blokir manual)
 * untuk satu mobil — dipakai endpoint publik GET /api/cars/:id/availability.
 */
async function getBookedDateRanges(carId) {
    const [bookings, blockedDates] = await Promise.all([
        prisma_1.prisma.booking.findMany({
            where: {
                carId,
                status: { in: [...BLOCKING_STATUSES] },
            },
            select: { tanggalMulai: true, tanggalSelesai: true },
            orderBy: { tanggalMulai: 'asc' },
        }),
        prisma_1.prisma.carBlockedDate.findMany({
            where: { carId },
            select: { tanggalMulai: true, tanggalSelesai: true, alasan: true },
            orderBy: { tanggalMulai: 'asc' },
        }),
    ]);
    const ranges = [
        ...bookings.map((b) => ({
            tanggalMulai: b.tanggalMulai,
            tanggalSelesai: b.tanggalSelesai,
            alasan: 'Pemesanan',
        })),
        ...blockedDates.map((bd) => ({
            tanggalMulai: bd.tanggalMulai,
            tanggalSelesai: bd.tanggalSelesai,
            alasan: bd.alasan || 'Manual Blokir',
        })),
    ];
    return ranges;
}
//# sourceMappingURL=availability.service.js.map