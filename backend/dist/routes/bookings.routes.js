"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
const availability_service_1 = require("../services/availability.service");
const pricing_service_1 = require("../services/pricing.service");
const xendit_service_1 = require("../services/xendit.service");
exports.bookingsRouter = (0, express_1.Router)();
exports.bookingsRouter.use(verifySupabaseToken_1.verifySupabaseToken);
const createBookingSchema = zod_1.z.object({
    carId: zod_1.z.string().uuid(),
    tanggalMulai: zod_1.z.coerce.date(),
    tanggalSelesai: zod_1.z.coerce.date(),
    lokasiAmbil: zod_1.z.string().trim().min(1),
    lokasiKembali: zod_1.z.string().trim().min(1),
    addons: zod_1.z
        .array(zod_1.z.object({
        jenis: zod_1.z.enum(['sopir', 'asuransi', 'antar_jemput']),
        harga: zod_1.z.number().nonnegative().optional(),
    }))
        .default([]),
});
/**
 * POST /api/bookings — F6 Alur Booking, §11.1/§11.2/§11.3 PRD.
 *
 * Overlap-check + insert dibungkus satu transaksi database supaya atomik
 * (§11.2: "wajib dilakukan di dalam transaksi... untuk mencegah dua
 * pelanggan mendapat slot yang sama secara bersamaan"). Harga SELALU
 * dihitung ulang di sini lewat hitungRincianHarga() — angka apa pun yang
 * (mungkin) dikirim klien untuk harga_dasar/total_harga diabaikan total.
 */
exports.bookingsRouter.post('/', async (req, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data booking tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { carId, tanggalMulai, tanggalSelesai, lokasiAmbil, lokasiKembali, addons } = parsed.data;
    if (tanggalSelesai <= tanggalMulai) {
        res.status(400).json({ error: 'tanggal_selesai harus setelah tanggal_mulai' });
        return;
    }
    try {
        const booking = await prisma_1.prisma.$transaction(async (tx) => {
            const car = await tx.car.findUnique({ where: { id: carId } });
            if (!car || car.status !== 'tersedia') {
                throw new Error('MOBIL_TIDAK_TERSEDIA');
            }
            const available = await (0, availability_service_1.isCarAvailable)(tx, { carId, tanggalMulai, tanggalSelesai });
            if (!available) {
                throw new Error('TANGGAL_BENTROK');
            }
            const rincian = (0, pricing_service_1.hitungRincianHarga)(car, tanggalMulai, tanggalSelesai, addons);
            return tx.booking.create({
                data: {
                    userId: req.user.id,
                    carId,
                    tanggalMulai,
                    tanggalSelesai,
                    lokasiAmbil,
                    lokasiKembali,
                    hargaDasar: rincian.hargaDasar,
                    totalAddon: rincian.totalAddon,
                    totalHarga: rincian.totalHarga,
                    // v1.3: Status changed from 'pending' to 'menunggu_pembayaran'
                    // because now waiting for Xendit confirmation, not manual admin verification
                    status: 'menunggu_pembayaran',
                    addons: {
                        createMany: {
                            data: rincian.addons.map((a) => ({ jenis: a.jenis, harga: a.harga })),
                        },
                    },
                },
                include: { addons: true, car: true },
            });
        });
        res.status(201).json({ data: booking });
    }
    catch (err) {
        if (err instanceof Error && err.message === 'TANGGAL_BENTROK') {
            res.status(409).json({ error: 'Tanggal yang dipilih sudah terbooking untuk mobil ini' });
            return;
        }
        if (err instanceof Error && err.message === 'MOBIL_TIDAK_TERSEDIA') {
            res.status(409).json({ error: 'Mobil ini sedang tidak tersedia untuk disewa' });
            return;
        }
        console.error('POST /api/bookings error:', err);
        res.status(500).json({ error: 'Gagal membuat booking, coba lagi' });
    }
});
/** GET /api/bookings/mine — F7 Riwayat Pesanan. */
exports.bookingsRouter.get('/mine', async (req, res) => {
    const bookings = await prisma_1.prisma.booking.findMany({
        where: { userId: req.user.id },
        include: { car: { include: { images: { orderBy: { urutan: 'asc' }, take: 1 } } }, addons: true },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ data: bookings });
});
/** GET /api/bookings/:id — pemilik booking ATAU admin boleh lihat. */
exports.bookingsRouter.get('/:id', async (req, res) => {
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: req.params.id },
        include: {
            car: true,
            addons: true,
            statusLogs: { orderBy: { createdAt: 'asc' } },
            profile: { select: { nama: true, email: true, noHp: true } },
        },
    });
    if (!booking) {
        res.status(404).json({ error: 'Booking tidak ditemukan' });
        return;
    }
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Tidak berhak melihat booking ini' });
        return;
    }
    res.json({ data: booking });
});
/** PATCH /api/bookings/:id/cancel — hanya pemilik booking, hanya jika masih `pending`. */
exports.bookingsRouter.patch('/:id/cancel', async (req, res) => {
    const booking = await prisma_1.prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
        res.status(404).json({ error: 'Booking tidak ditemukan' });
        return;
    }
    if (booking.userId !== req.user.id) {
        res.status(403).json({ error: 'Tidak berhak membatalkan booking ini' });
        return;
    }
    if (booking.status !== 'pending') {
        res.status(409).json({ error: 'Booking hanya bisa dibatalkan selagi berstatus pending' });
        return;
    }
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'dibatalkan' },
        });
        await tx.bookingStatusLog.create({
            data: {
                bookingId: booking.id,
                statusLama: 'pending',
                statusBaru: 'dibatalkan',
                diubahOleh: req.user.id,
            },
        });
        return b;
    });
    res.json({ data: updated });
});
/**
 * POST /api/bookings/:id/checkout
 * Membuat invoice Xendit untuk booking ini
 * Customer akan diarahkan ke halaman pembayaran Xendit
 */
exports.bookingsRouter.post('/:id/checkout', async (req, res) => {
    const bookingId = req.params.id;
    try {
        // Ambil booking dengan relasi
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                car: {
                    include: { instansi: { select: { namaInstansi: true } } },
                },
                profile: { select: { nama: true, email: true, noHp: true } },
                payment: true,
            },
        });
        if (!booking) {
            res.status(404).json({ error: 'Booking tidak ditemukan' });
            return;
        }
        // Verify ownership
        if (booking.userId !== req.user.id) {
            res.status(403).json({ error: 'Tidak berhak mengakses booking ini' });
            return;
        }
        // Check if booking is still awaiting payment
        if (booking.status !== 'menunggu_pembayaran') {
            res.status(400).json({
                error: 'Booking ini tidak bisa dibayar',
                currentStatus: booking.status,
            });
            return;
        }
        // Check if payment already exists
        if (booking.payment?.xenditInvoiceId) {
            // Jika invoice sudah ada, return URL yang sudah ada
            res.json({
                data: {
                    bookingId: booking.id,
                    status: booking.payment.status,
                    invoiceUrl: `https://dashboard.xendit.co/invoices/${booking.payment.xenditInvoiceId}`,
                    message: 'Invoice sudah dibuat sebelumnya',
                },
            });
            return;
        }
        // Check if Xendit is configured
        if (!(0, xendit_service_1.isXenditConfigured)()) {
            res.status(503).json({
                error: 'Payment gateway belum dikonfigurasi',
                hint: 'Hubungi admin untuk setup Xendit',
            });
            return;
        }
        // Create Xendit invoice
        const result = await (0, xendit_service_1.createXenditInvoice)(booking.id, Number(booking.totalHarga), booking.profile.email, booking.profile.nama, `Sewa Mobil ${booking.car.nama} - ${booking.car.instansi.namaInstansi}`);
        if (!result.success) {
            res.status(500).json({ error: result.error || 'Gagal membuat invoice' });
            return;
        }
        res.json({
            data: {
                bookingId: booking.id,
                invoiceUrl: result.invoiceUrl,
                invoiceId: result.invoiceId,
                amount: Number(booking.totalHarga),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            },
        });
    }
    catch (error) {
        console.error('POST /api/bookings/:id/checkout error:', error);
        res.status(500).json({ error: 'Gagal memproses checkout' });
    }
});
/**
 * GET /api/bookings/:id/payment-status
 * Cek status pembayaran booking (untuk polling)
 */
exports.bookingsRouter.get('/:id/payment-status', async (req, res) => {
    const bookingId = req.params.id;
    try {
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                payment: true,
            },
        });
        if (!booking) {
            res.status(404).json({ error: 'Booking tidak ditemukan' });
            return;
        }
        // Verify ownership
        if (booking.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            res.status(403).json({ error: 'Tidak berhak mengakses booking ini' });
            return;
        }
        res.json({
            data: {
                bookingId: booking.id,
                bookingStatus: booking.status,
                paymentStatus: booking.payment?.status ?? null,
                paymentId: booking.payment?.id ?? null,
                xenditInvoiceId: booking.payment?.xenditInvoiceId ?? null,
            },
        });
    }
    catch (error) {
        console.error('GET /api/bookings/:id/payment-status error:', error);
        res.status(500).json({ error: 'Gagal mengambil status pembayaran' });
    }
});
//# sourceMappingURL=bookings.routes.js.map