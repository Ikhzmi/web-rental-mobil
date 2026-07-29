"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBookingsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
exports.adminBookingsRouter = (0, express_1.Router)();
exports.adminBookingsRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireAdmin);
const listQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan']).optional(),
    dari: zod_1.z.coerce.date().optional(),
    sampai: zod_1.z.coerce.date().optional(),
});
/** GET /api/admin/bookings — list + filter status & tanggal (F11). */
exports.adminBookingsRouter.get('/', async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { status, dari, sampai } = parsed.data;
    const bookings = await prisma_1.prisma.booking.findMany({
        where: {
            ...(status && { status }),
            ...((dari || sampai) && {
                tanggalMulai: {
                    ...(dari && { gte: dari }),
                    ...(sampai && { lte: sampai }),
                },
            }),
        },
        include: { car: true, profile: { select: { nama: true, email: true, noHp: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ data: bookings });
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
    pending: ['dikonfirmasi', 'dibatalkan'],
    dikonfirmasi: ['berjalan'],
    berjalan: ['selesai'],
    selesai: [],
    dibatalkan: [],
};
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan']),
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
    const booking = await prisma_1.prisma.booking.findUnique({ where: { id: req.params.id } });
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
    res.json({ data: updated });
});
//# sourceMappingURL=adminBookings.routes.js.map