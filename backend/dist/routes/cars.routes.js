"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const availability_service_1 = require("../services/availability.service");
const errorHandler_1 = require("../lib/errorHandler");
exports.carsRouter = (0, express_1.Router)();
const listCarsQuerySchema = zod_1.z.object({
    kategori: zod_1.z.enum(['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric']).optional(),
    transmisi: zod_1.z.enum(['manual', 'matic']).optional(),
    tipeSewa: zod_1.z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']).optional(),
    hargaMin: zod_1.z.coerce.number().nonnegative().optional(),
    hargaMax: zod_1.z.coerce.number().nonnegative().optional(),
    kapasitasMin: zod_1.z.coerce.number().int().positive().optional(),
    cari: zod_1.z.string().trim().min(1).optional(),
    sort: zod_1.z.enum(['harga_asc', 'harga_desc']).optional(),
});
// SECURITY: UUID validation schema
const uuidSchema = zod_1.z.string().uuid();
/** GET /api/cars — F2 Katalog Armada: filter + sort, hanya mobil `tersedia`. */
exports.carsRouter.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const parsed = listCarsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Query tidak valid', 400);
    }
    const { kategori, transmisi, tipeSewa, hargaMin, hargaMax, kapasitasMin, cari, sort } = parsed.data;
    const cars = await prisma_1.prisma.car.findMany({
        where: {
            status: 'tersedia',
            // PENTING: sebelumnya endpoint ini TIDAK mengecek statusApproval sama
            // sekali — artinya mobil yang baru dibuat Admin (default statusApproval
            // = 'menunggu_persetujuan') langsung tampil & bisa dibooking publik,
            // sepenuhnya melewati alur approval SuperAdmin. Baru mobil yang sudah
            // disetujui yang boleh tampil di katalog publik.
            statusApproval: 'disetujui',
            ...(kategori && { kategori }),
            ...(transmisi && { transmisi }),
            ...(tipeSewa && { tipeSewa }),
            ...(kapasitasMin && { kapasitasKursi: { gte: kapasitasMin } }),
            ...(cari && { nama: { contains: cari, mode: 'insensitive' } }),
            ...((hargaMin !== undefined || hargaMax !== undefined) && {
                hargaPerHari: {
                    ...(hargaMin !== undefined && { gte: hargaMin }),
                    ...(hargaMax !== undefined && { lte: hargaMax }),
                },
            }),
        },
        include: {
            images: { orderBy: { urutan: 'asc' }, take: 1 },
        },
        orderBy: sort === 'harga_desc' ? { hargaPerHari: 'desc' } : sort === 'harga_asc' ? { hargaPerHari: 'asc' } : { createdAt: 'desc' },
    });
    res.json({ data: cars });
}));
/** GET /api/cars/:id — F3 Detail Mobil: spesifikasi + galeri penuh. */
exports.carsRouter.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // SECURITY: Validate UUID format
    const idParse = uuidSchema.safeParse(req.params.id);
    if (!idParse.success) {
        throw new errorHandler_1.AppError('Format ID mobil tidak valid', 400);
    }
    const id = idParse.data;
    const car = await prisma_1.prisma.car.findUnique({
        where: { id },
        include: { images: { orderBy: { urutan: 'asc' } } },
    });
    if (!car || car.status === 'nonaktif' || car.statusApproval !== 'disetujui') {
        // Perlakukan mobil yang belum/tidak disetujui sama seperti "tidak
        // ditemukan" untuk publik — konsisten dengan cara mobil nonaktif
        // disembunyikan, dan tidak membocorkan info kalau mobil ini "ada tapi
        // sedang direview".
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    res.json({ data: car });
}));
/**
 * GET /api/cars/:id/availability — dipakai kalender di F3 untuk menandai
 * tanggal yang sudah terbooking sebagai tidak bisa dipilih.
 */
exports.carsRouter.get('/:id/availability', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // SECURITY: Validate UUID format
    const idParse = uuidSchema.safeParse(req.params.id);
    if (!idParse.success) {
        throw new errorHandler_1.AppError('Format ID mobil tidak valid', 400);
    }
    const id = idParse.data;
    const car = await prisma_1.prisma.car.findUnique({
        where: { id },
        select: { id: true, status: true, statusApproval: true }
    });
    if (!car || car.status === 'nonaktif' || car.statusApproval !== 'disetujui') {
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
        throw new errorHandler_1.AppError('Mobil tidak ditemukan', 404);
    }
    const bookedRanges = await (0, availability_service_1.getBookedDateRanges)(id);
    res.json({ data: bookedRanges });
}));
//# sourceMappingURL=cars.routes.js.map