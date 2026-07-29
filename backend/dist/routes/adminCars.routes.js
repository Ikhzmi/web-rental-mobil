"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCarsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
exports.adminCarsRouter = (0, express_1.Router)();
exports.adminCarsRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireAdmin);
/** GET /api/admin/cars — termasuk mobil nonaktif/maintenance (F10). */
exports.adminCarsRouter.get('/', async (_req, res) => {
    const cars = await prisma_1.prisma.car.findMany({
        include: { images: { orderBy: { urutan: 'asc' } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ data: cars });
});
/**
 * GET /api/admin/cars/:id — ditambahkan v1.1, sebelumnya form edit admin
 * harus memfilter dari response list yang tidak efisien untuk armada besar.
 */
exports.adminCarsRouter.get('/:id', async (req, res) => {
    const car = await prisma_1.prisma.car.findUnique({
        where: { id: req.params.id },
        include: { images: { orderBy: { urutan: 'asc' } } },
    });
    if (!car) {
        res.status(404).json({ error: 'Mobil tidak ditemukan' });
        return;
    }
    res.json({ data: car });
});
const carBaseSchema = zod_1.z.object({
    nama: zod_1.z.string().trim().min(1),
    kategori: zod_1.z.enum(['city_car', 'suv', 'mpv', 'mewah']),
    transmisi: zod_1.z.enum(['manual', 'matic']),
    tipeSewa: zod_1.z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']),
    hargaSopirPerHari: zod_1.z.number().nonnegative().nullable().optional(),
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
exports.adminCarsRouter.post('/', async (req, res) => {
    const parsed = carBaseSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const bisnisError = validateTipeSewaHargaSopir(parsed.data);
    if (bisnisError) {
        res.status(400).json({ error: bisnisError });
        return;
    }
    const car = await prisma_1.prisma.car.create({ data: parsed.data, include: { images: true } });
    res.status(201).json({ data: car });
});
/** PATCH /api/admin/cars/:id */
exports.adminCarsRouter.patch('/:id', async (req, res) => {
    const parsed = carBaseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const existing = await prisma_1.prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: 'Mobil tidak ditemukan' });
        return;
    }
    const merged = { ...existing, ...parsed.data };
    const bisnisError = validateTipeSewaHargaSopir(merged);
    if (bisnisError) {
        res.status(400).json({ error: bisnisError });
        return;
    }
    const car = await prisma_1.prisma.car.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: car });
});
/** DELETE /api/admin/cars/:id — nonaktifkan (soft-delete), bukan hapus baris. */
exports.adminCarsRouter.delete('/:id', async (req, res) => {
    const car = await prisma_1.prisma.car
        .update({ where: { id: req.params.id }, data: { status: 'nonaktif' } })
        .catch(() => null);
    if (!car) {
        res.status(404).json({ error: 'Mobil tidak ditemukan' });
        return;
    }
    res.json({ data: car });
});
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
exports.adminCarsRouter.post('/:id/images', async (req, res) => {
    const parsed = imageSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const car = await prisma_1.prisma.car.findUnique({ where: { id: req.params.id } });
    if (!car) {
        res.status(404).json({ error: 'Mobil tidak ditemukan' });
        return;
    }
    const image = await prisma_1.prisma.carImage.create({
        data: { carId: req.params.id, url: parsed.data.url, urutan: parsed.data.urutan },
    });
    res.status(201).json({ data: image });
});
/** DELETE /api/admin/cars/:id/images/:imageId — ditambahkan v1.1. */
exports.adminCarsRouter.delete('/:id/images/:imageId', async (req, res) => {
    const image = await prisma_1.prisma.carImage
        .delete({ where: { id: req.params.imageId } })
        .catch(() => null);
    if (!image) {
        res.status(404).json({ error: 'Foto tidak ditemukan' });
        return;
    }
    res.json({ data: image });
});
//# sourceMappingURL=adminCars.routes.js.map