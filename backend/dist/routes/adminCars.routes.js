"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCarsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
const errorHandler_1 = require("../lib/errorHandler");
exports.adminCarsRouter = (0, express_1.Router)();
exports.adminCarsRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireAdmin);
const paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    cari: zod_1.z.string().trim().optional(),
});
/** GET /api/admin/cars — termasuk mobil nonaktif/maintenance (F10) dengan pagination. */
exports.adminCarsRouter.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Query tidak valid', 400);
    }
    // KRITIS: sebelumnya endpoint ini TIDAK memfilter instansiId sama sekali
    // — Admin dari instansi manapun akan melihat SELURUH mobil dari SELURUH
    // instansi di platform di halaman "Armada Saya" mereka, bukan cuma
    // miliknya sendiri. Kebocoran data lintas-tenant yang serius (Admin bisa
    // melihat inventaris kompetitor/instansi lain).
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Akun admin tidak terikat ke instansi manapun', 403);
    }
    const { page, limit, cari } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
        instansiId,
        ...(cari && { nama: { contains: cari, mode: 'insensitive' } }),
    };
    const [cars, total] = await Promise.all([
        prisma_1.prisma.car.findMany({
            where,
            include: { images: { orderBy: { urutan: 'asc' } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.car.count({ where }),
    ]);
    res.json({
        data: cars,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}));
/**
 * GET /api/admin/cars/:id — ditambahkan v1.1, sebelumnya form edit admin
 * harus memfilter dari response list yang tidak efisien untuk armada besar.
 */
exports.adminCarsRouter.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    // Admin scoping: verify car belongs to admin's instansi
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const car = await prisma_1.prisma.car.findUnique({
        where: { id, instansiId },
        include: { images: { orderBy: { urutan: 'asc' } } },
    });
    if (!car) {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    res.json({ data: car });
}));
const carBaseSchema = zod_1.z.object({
    nama: zod_1.z.string().trim().min(1),
    nomorPlat: zod_1.z.string().trim().min(1).transform((v) => v.toUpperCase()).optional(),
    kategori: zod_1.z.enum(['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric']),
    transmisi: zod_1.z.enum(['manual', 'matic']),
    tipeSewa: zod_1.z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']),
    hargaSopirPerHari: zod_1.z.number().nonnegative().nullable().optional(),
    hargaAntarJemput: zod_1.z.number().nonnegative().nullable().optional(),
    kapasitasKursi: zod_1.z.number().int().positive(),
    hargaPerHari: zod_1.z.number().positive(),
    status: zod_1.z.enum(['tersedia', 'maintenance', 'nonaktif']).default('tersedia'),
    deskripsi: zod_1.z.string().optional(),
});
/** Validasi bisnis: tipeSewa yang butuh harga sopir wajib mengisinya (§9 PRD). */
function validateTipeSewaHargaSopir(data) {
    const butuhHargaSopir = data.tipeSewa === 'dengan_sopir' || data.tipeSewa === 'keduanya';
    if (butuhHargaSopir && (data.hargaSopirPerHari === null || data.hargaSopirPerHari === undefined)) {
        return 'harga_sopir_per_hari wajib diisi untuk tipe_sewa dengan_sopir/keduanya';
    }
    return null;
}
/** POST /api/admin/cars */
exports.adminCarsRouter.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const parsed = carBaseSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Data tidak valid', 400);
    }
    const bisnisError = validateTipeSewaHargaSopir(parsed.data);
    if (bisnisError) {
        throw new errorHandler_1.AppError(bisnisError, 400);
    }
    // Admin scoping: assign car to admin's instansi
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const car = await prisma_1.prisma.car.create({
        // statusApproval sengaja TIDAK diset di sini — biar schema default
        // 'menunggu_persetujuan' yang berlaku. Mobil baru harus melewati
        // antrian approval Super Admin sebelum bisa tayang di katalog publik.
        data: { ...parsed.data, instansiId },
        include: { images: true },
    });
    res.status(201).json({ data: car });
}));
/** PATCH /api/admin/cars/:id */
exports.adminCarsRouter.patch('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const parsed = carBaseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Data tidak valid', 400);
    }
    // Admin scoping: verify car belongs to admin's instansi
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const existing = await prisma_1.prisma.car.findUnique({ where: { id, instansiId } });
    if (!existing) {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    const merged = { ...existing, ...parsed.data };
    const bisnisError = validateTipeSewaHargaSopir(merged);
    if (bisnisError) {
        throw new errorHandler_1.AppError(bisnisError, 400);
    }
    const car = await prisma_1.prisma.car.update({
        where: { id },
        data: {
            ...parsed.data,
            // Jika mobil sudah disetujui sebelumnya, perubahan data wajib
            // di-review ulang oleh Super Admin — reset ke menunggu_persetujuan.
            // Jika masih dalam status lain (ditolak / menunggu), biarkan tetap.
            ...(existing.statusApproval === 'disetujui' && {
                statusApproval: 'menunggu_persetujuan',
                alasanPenolakan: null,
            }),
        },
    });
    res.json({ data: car });
}));
/** DELETE /api/admin/cars/:id — hapus armada (hard-delete jika belum ada booking, soft-delete jika ada histori selesai/batal, tolak jika ada booking aktif) */
exports.adminCarsRouter.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    // Admin scoping: verify car belongs to admin's instansi
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const existing = await prisma_1.prisma.car.findUnique({
        where: { id, instansiId },
        include: {
            bookings: { select: { id: true, status: true } },
        },
    });
    if (!existing) {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    // Cek apakah ada booking aktif yang belum selesai/batal
    const activeBookings = existing.bookings.filter((b) => ['menunggu_pembayaran', 'dikonfirmasi', 'berjalan'].includes(b.status));
    if (activeBookings.length > 0) {
        throw new errorHandler_1.AppError(`Armada "${existing.nama}" tidak dapat dihapus karena sedang memiliki ${activeBookings.length} pesanan aktif`, 400);
    }
    // Jika tidak pernah memiliki riwayat booking sama sekali -> Hapus permanen
    if (existing.bookings.length === 0) {
        await prisma_1.prisma.car.delete({ where: { id } });
        res.json({
            message: `Armada "${existing.nama}" berhasil dihapus permanen`,
            deletedPermanently: true,
        });
    }
    else {
        // Jika ada riwayat booking lampau -> soft-delete (nonaktifkan & tolak approval)
        const car = await prisma_1.prisma.car.update({
            where: { id },
            data: {
                status: 'nonaktif',
                statusApproval: 'ditolak',
                alasanPenolakan: 'Dihapus oleh admin instansi',
            },
        });
        res.json({
            data: car,
            message: `Armada "${existing.nama}" berhasil dinonaktifkan dan ditarik dari katalog`,
            deletedPermanently: false,
        });
    }
}));
const imageSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    urutan: zod_1.z.number().int().nonnegative().default(0),
});
/**
 * POST /api/admin/cars/:id/images — ditambahkan v1.1.
 * Dipanggil SETELAH file foto sudah diunggah ke bucket publik Supabase
 * Storage `car-photos` dari sisi admin dashboard; endpoint ini menyimpan
 * referensi URL publiknya ke tabel car_images (pola yang sama seperti
 * POST /api/profiles/me/dokumen untuk dokumen KTP/SIM).
 */
exports.adminCarsRouter.post('/:id/images', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const parsed = imageSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Data tidak valid', 400);
    }
    // Admin scoping: verify car belongs to admin's instansi
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const car = await prisma_1.prisma.car.findUnique({ where: { id, instansiId } });
    if (!car) {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    const image = await prisma_1.prisma.carImage.create({
        data: { carId: id, url: parsed.data.url, urutan: parsed.data.urutan },
    });
    res.status(201).json({ data: image });
}));
/** DELETE /api/admin/cars/:id/images/:imageId — ditambahkan v1.1. */
exports.adminCarsRouter.delete('/:id/images/:imageId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const imageId = req.params.imageId;
    // Admin scoping: verify image belongs to admin's car's
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const existing = await prisma_1.prisma.carImage.findFirst({
        where: {
            id: imageId,
            car: { instansiId },
        },
    });
    if (!existing) {
        throw new errorHandler_1.AppError('Foto tidak ditemukan', 404);
    }
    const image = await prisma_1.prisma.carImage.delete({ where: { id: imageId } });
    res.json({ data: image });
}));
const createBlockedDateSchema = zod_1.z.object({
    tanggalMulai: zod_1.z.string(),
    tanggalSelesai: zod_1.z.string(),
    alasan: zod_1.z.string().optional(),
});
/** GET /api/admin/cars/:id/blocked-dates — list blocked dates for car */
exports.adminCarsRouter.get('/:id/blocked-dates', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const car = await prisma_1.prisma.car.findFirst({ where: { id, instansiId } });
    if (!car) {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    const blockedDates = await prisma_1.prisma.carBlockedDate.findMany({
        where: { carId: id },
        orderBy: { tanggalMulai: 'asc' },
    });
    res.json({ data: blockedDates });
}));
/** POST /api/admin/cars/:id/blocked-dates — add blocked date for car */
exports.adminCarsRouter.post('/:id/blocked-dates', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const parsed = createBlockedDateSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Data tanggal tidak valid', 400);
    }
    const car = await prisma_1.prisma.car.findFirst({ where: { id, instansiId } });
    if (!car) {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    // Parse tanggal sebagai UTC noon (T12:00:00Z) bukan midnight (T00:00:00Z)
    // agar tanggal tidak bergeser 1 hari di timezone manapun (termasuk WIB UTC+7).
    // Frontend mengirim "YYYY-MM-DD" → kita normalkan ke noon UTC.
    const parseUTCDate = (dateStr) => {
        const datePart = dateStr.split('T')[0]; // ambil "YYYY-MM-DD" saja
        return new Date(`${datePart}T12:00:00Z`); // simpan sebagai noon UTC
    };
    const tanggalMulai = parseUTCDate(parsed.data.tanggalMulai);
    const tanggalSelesai = parseUTCDate(parsed.data.tanggalSelesai);
    if (isNaN(tanggalMulai.getTime()) || isNaN(tanggalSelesai.getTime())) {
        throw new errorHandler_1.AppError('Format tanggal tidak valid', 400);
    }
    if (tanggalSelesai < tanggalMulai) {
        throw new errorHandler_1.AppError('Tanggal selesai tidak boleh sebelum tanggal mulai', 400);
    }
    const created = await prisma_1.prisma.carBlockedDate.create({
        data: {
            carId: id,
            tanggalMulai,
            tanggalSelesai,
            alasan: parsed.data.alasan || 'Manual Blokir Admin',
        },
    });
    res.status(201).json({ data: created });
}));
/** DELETE /api/admin/cars/:id/blocked-dates/:blockedId — delete blocked date */
exports.adminCarsRouter.delete('/:id/blocked-dates/:blockedId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, blockedId } = req.params;
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        throw new errorHandler_1.AppError('Instansi tidak ditemukan untuk admin ini', 403);
    }
    const existing = await prisma_1.prisma.carBlockedDate.findFirst({
        where: {
            id: blockedId,
            carId: id,
            car: { instansiId },
        },
    });
    if (!existing) {
        throw new errorHandler_1.AppError('Data blokir tanggal tidak ditemukan', 404);
    }
    await prisma_1.prisma.carBlockedDate.delete({ where: { id: blockedId } });
    res.json({ success: true });
}));
//# sourceMappingURL=adminCars.routes.js.map