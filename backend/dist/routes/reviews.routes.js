"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
exports.reviewsRouter = (0, express_1.Router)();
/**
 * GET /api/reviews?carId=... — publik, tidak perlu login. Dipakai di
 * halaman detail armada untuk menampilkan ulasan mobil tertentu.
 */
exports.reviewsRouter.get('/', async (req, res) => {
    const carId = req.query.carId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const reviews = await prisma_1.prisma.review.findMany({
        where: carId ? { carId } : undefined,
        include: {
            profile: { select: { nama: true } },
            car: { select: { nama: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    res.json({ data: reviews });
});
/**
 * GET /api/reviews/featured — publik, dipakai homepage (menggantikan
 * testimoni statis). Ambil rating tertinggi dulu, lalu terbaru, supaya
 * ulasan yang tampil di landing page representatif.
 */
exports.reviewsRouter.get('/featured', async (_req, res) => {
    const reviews = await prisma_1.prisma.review.findMany({
        where: { komentar: { not: null } }, // cuma yang ada komentarnya, rating-only kurang menarik ditampilkan sebagai testimoni
        include: {
            profile: { select: { nama: true } },
            car: { select: { nama: true } },
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        take: 6,
    });
    res.json({ data: reviews });
});
exports.reviewsRouter.use(verifySupabaseToken_1.verifySupabaseToken);
/**
 * GET /api/reviews/booking/:bookingId — cek apakah booking ini sudah
 * direview, dan kalau sudah booking-nya eligible untuk direview (status
 * 'selesai'). Dipakai AkunPesananDetailPage untuk menentukan tampilkan
 * form review atau tidak.
 */
exports.reviewsRouter.get('/booking/:bookingId', async (req, res) => {
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: req.params.bookingId },
        select: { userId: true, status: true },
    });
    if (!booking || booking.userId !== req.user.id) {
        res.status(404).json({ error: 'Booking tidak ditemukan' });
        return;
    }
    const existing = await prisma_1.prisma.review.findUnique({
        where: { bookingId: req.params.bookingId },
    });
    res.json({
        data: {
            canReview: booking.status === 'selesai' && !existing,
            alreadyReviewed: !!existing,
            review: existing,
        },
    });
});
const createReviewSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid(),
    rating: zod_1.z.number().int().min(1).max(5),
    komentar: zod_1.z.string().trim().max(1000).optional(),
});
/**
 * POST /api/reviews — customer membuat ulasan. HANYA bisa untuk booking
 * milik sendiri yang berstatus 'selesai', dan cuma sekali per booking
 * (bookingId unique di database, jadi percobaan kedua akan gagal di
 * constraint level juga sebagai jaring pengaman kalau ada race condition).
 *
 * Sengaja TIDAK ADA endpoint PATCH/DELETE untuk review — begitu dibuat,
 * permanen. Ini keputusan produk, bukan keterbatasan teknis.
 */
exports.reviewsRouter.post('/', async (req, res) => {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        select: { id: true, userId: true, carId: true, status: true },
    });
    if (!booking || booking.userId !== req.user.id) {
        res.status(404).json({ error: 'Booking tidak ditemukan' });
        return;
    }
    if (booking.status !== 'selesai') {
        res.status(409).json({ error: 'Ulasan hanya bisa dibuat setelah masa sewa selesai' });
        return;
    }
    try {
        const review = await prisma_1.prisma.review.create({
            data: {
                bookingId: booking.id,
                userId: req.user.id,
                carId: booking.carId,
                rating: parsed.data.rating,
                komentar: parsed.data.komentar,
            },
        });
        res.status(201).json({ data: review });
    }
    catch (err) {
        // Unique constraint pada bookingId -> sudah pernah direview
        res.status(409).json({ error: 'Booking ini sudah pernah diulas' });
    }
});
//# sourceMappingURL=reviews.routes.js.map