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
async function getBookedDateRanges(carId) {
    const bookings = await prisma_1.prisma.booking.findMany({
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
//# sourceMappingURL=availability.service.js.map