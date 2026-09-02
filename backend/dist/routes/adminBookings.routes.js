"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBookingsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
const email_service_1 = require("../services/email.service");
exports.adminBookingsRouter = (0, express_1.Router)();
exports.adminBookingsRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireAdmin);
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    status: zod_1.z.enum(['menunggu_pembayaran', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan']).optional(),
    dari: zod_1.z.coerce.date().optional(),
    sampai: zod_1.z.coerce.date().optional(),
    cari: zod_1.z.string().trim().optional(),
});
/** GET /api/admin/bookings — list + filter status & tanggal (F11) dengan pagination. */
exports.adminBookingsRouter.get('/', async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { page, limit, status, dari, sampai, cari } = parsed.data;
    const skip = (page - 1) * limit;
    // Admin scoping: filter by admin's instansiId
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
        return;
    }
    const where = {
        car: { instansiId }, // Admin scoping
        ...(status && { status }),
        ...((dari || sampai) && {
            tanggalMulai: {
                ...(dari && { gte: dari }),
                ...(sampai && { lte: sampai }),
            },
        }),
        ...(cari && {
            OR: [
                { car: { nama: { contains: cari, mode: 'insensitive' } } },
                { profile: { nama: { contains: cari, mode: 'insensitive' } } },
            ],
        }),
    };
    const [bookings, total] = await Promise.all([
        prisma_1.prisma.booking.findMany({
            where,
            include: { car: true, profile: { select: { nama: true, email: true, noHp: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.booking.count({ where }),
    ]);
    res.json({
        data: bookings,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
});
/**
 * Alur status yang valid — mencegah lompat status sembarangan (§11.4).
 * Sesuai teks PRD: "dibatalkan: dapat terjadi dari status pending" —
 * jadi HANYA pending yang boleh dibatalkan, bukan juga dikonfirmasi.
 * Kalau bisnisnya ternyata butuh cancel dari dikonfirmasi juga (mis.
 * pembayaran gagal setelah diverifikasi), ini perlu diputuskan eksplisit
 * dan §11.4 PRD diupdate dulu, bukan diam-diam dilonggarkan di kode.
 */
const VALID_TRANSITIONS = {
    menunggu_pembayaran: ['dikonfirmasi', 'dibatalkan'],
    dikonfirmasi: ['berjalan'],
    berjalan: ['selesai'],
    selesai: [],
    dibatalkan: [],
};
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['menunggu_pembayaran', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan']),
});
/**
 * PATCH /api/admin/bookings/:id/status — F11. Setiap perubahan status
 * WAJIB juga menulis baris baru ke booking_status_log (audit trail,
 * §9/§11.4 PRD) — dilakukan dalam satu transaksi.
 */
exports.adminBookingsRouter.patch('/:id/status', async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    // Admin scoping: verify booking belongs to admin's instansi
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
        return;
    }
    const booking = await prisma_1.prisma.booking.findFirst({
        where: { id: req.params.id, car: { instansiId } },
        include: {
            car: { select: { nama: true } },
            profile: { select: { nama: true, email: true } },
        },
    });
    if (!booking) {
        res.status(404).json({ error: 'Booking tidak ditemukan' });
        return;
    }
    const allowedNext = VALID_TRANSITIONS[booking.status] ?? [];
    if (!allowedNext.includes(parsed.data.status)) {
        res.status(409).json({
            error: `Tidak bisa mengubah status dari '${booking.status}' ke '${parsed.data.status}'`,
        });
        return;
    }
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
            where: { id: booking.id },
            data: { status: parsed.data.status },
        });
        await tx.bookingStatusLog.create({
            data: {
                bookingId: booking.id,
                statusLama: booking.status,
                statusBaru: parsed.data.status,
                diubahOleh: req.user.id,
            },
        });
        return b;
    });
    // Kirim email notifikasi ke customer — sengaja TIDAK di-await sebelum
    // respons dikirim (fire-and-forget) supaya request admin tidak ikut
    // lambat/gagal kalau pengiriman email lambat/error. Kalau belum
    // dikonfigurasi (RESEND_API_KEY kosong), fungsi ini no-op.
    const emailPayload = {
        to: booking.profile.email,
        namaPenyewa: booking.profile.nama,
        namaMobil: booking.car.nama,
        bookingId: booking.id,
        tanggalMulai: booking.tanggalMulai.toISOString(),
        tanggalSelesai: booking.tanggalSelesai.toISOString(),
    };
    if (parsed.data.status === 'dikonfirmasi') {
        void (0, email_service_1.sendBookingConfirmedEmail)(emailPayload);
    }
    else if (parsed.data.status === 'dibatalkan') {
        void (0, email_service_1.sendBookingCancelledEmail)(emailPayload, 'ditolak_admin');
    }
    res.json({ data: updated });
});
//# sourceMappingURL=adminBookings.routes.js.map