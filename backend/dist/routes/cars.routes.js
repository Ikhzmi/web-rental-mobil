"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const availability_service_1 = require("../services/availability.service");
exports.carsRouter = (0, express_1.Router)();
const listCarsQuerySchema = zod_1.z.object({
    kategori: zod_1.z.enum(['city_car', 'suv', 'mpv', 'mewah']).optional(),
    transmisi: zod_1.z.enum(['manual', 'matic']).optional(),
    tipeSewa: zod_1.z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']).optional(),
    hargaMin: zod_1.z.coerce.number().nonnegative().optional(),
    hargaMax: zod_1.z.coerce.number().nonnegative().optional(),
    kapasitasMin: zod_1.z.coerce.number().int().positive().optional(),
    cari: zod_1.z.string().trim().min(1).optional(),
    sort: zod_1.z.enum(['harga_asc', 'harga_desc']).optional(),
});
/** GET /api/cars — F2 Katalog Armada: filter + sort, hanya mobil `tersedia`. */
exports.carsRouter.get('/', async (req, res) => {
    const parsed = listCarsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { kategori, transmisi, tipeSewa, hargaMin, hargaMax, kapasitasMin, cari, sort } = parsed.data;
    const cars = await prisma_1.prisma.car.findMany({
        where: {
            status: 'tersedia',
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
});
/** GET /api/cars/:id — F3 Detail Mobil: spesifikasi + galeri penuh. */
exports.carsRouter.get('/:id', async (req, res) => {
    const car = await prisma_1.prisma.car.findUnique({
        where: { id: req.params.id },
        include: { images: { orderBy: { urutan: 'asc' } } },
    });
    if (!car || car.status === 'nonaktif') {
        res.status(404).json({ error: 'Mobil tidak ditemukan' });
        return;
    }
    res.json({ data: car });
});
/**
 * GET /api/cars/:id/availability — dipakai kalender di F3 untuk menandai
 * tanggal yang sudah terbooking sebagai tidak bisa dipilih.
 */
exports.carsRouter.get('/:id/availability', async (req, res) => {
    const car = await prisma_1.prisma.car.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!car) {
        res.status(404).json({ error: 'Mobil tidak ditemukan' });
        return;
    }
    const bookedRanges = await (0, availability_service_1.getBookedDateRanges)(req.params.id);
    res.json({ data: bookedRanges });
});
//# sourceMappingURL=cars.routes.js.map