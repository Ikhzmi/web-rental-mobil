import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';

export const adminCarsRouter = Router();

adminCarsRouter.use(verifySupabaseToken, requireAdmin);

/** GET /api/admin/cars — termasuk mobil nonaktif/maintenance (F10). */
adminCarsRouter.get('/', async (_req, res) => {
  const cars = await prisma.car.findMany({
    include: { images: { orderBy: { urutan: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: cars });
});

/**
 * GET /api/admin/cars/:id — ditambahkan v1.1, sebelumnya form edit admin
 * harus memfilter dari response list yang tidak efisien untuk armada besar.
 */
adminCarsRouter.get('/:id', async (req, res) => {
  const car = await prisma.car.findUnique({
    where: { id: req.params.id },
    include: { images: { orderBy: { urutan: 'asc' } } },
  });
  if (!car) {
    res.status(404).json({ error: 'Mobil tidak ditemukan' });
    return;
  }
  res.json({ data: car });
});

const carBaseSchema = z.object({
  nama: z.string().trim().min(1),
  kategori: z.enum(['city_car', 'suv', 'mpv', 'mewah']),
  transmisi: z.enum(['manual', 'matic']),
  tipeSewa: z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']),
  hargaSopirPerHari: z.number().nonnegative().nullable().optional(),
  kapasitasKursi: z.number().int().positive(),
  hargaPerHari: z.number().positive(),
  status: z.enum(['tersedia', 'maintenance', 'nonaktif']).default('tersedia'),
  deskripsi: z.string().optional(),
});

/** Validasi bisnis: tipeSewa yang butuh harga sopir wajib mengisinya (§9 PRD). */
function validateTipeSewaHargaSopir(data: z.infer<typeof carBaseSchema>) {
  const butuhHargaSopir = data.tipeSewa === 'dengan_sopir' || data.tipeSewa === 'keduanya';
  if (butuhHargaSopir && (data.hargaSopirPerHari === null || data.hargaSopirPerHari === undefined)) {
    return 'harga_sopir_per_hari wajib diisi untuk tipe_sewa dengan_sopir/keduanya';
  }
  return null;
}

/** POST /api/admin/cars */
adminCarsRouter.post('/', async (req, res) => {
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

  const car = await prisma.car.create({ data: parsed.data });
  res.status(201).json({ data: car });
});

/** PATCH /api/admin/cars/:id */
adminCarsRouter.patch('/:id', async (req, res) => {
  const parsed = carBaseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Mobil tidak ditemukan' });
    return;
  }

  const merged = { ...existing, ...parsed.data };
  const bisnisError = validateTipeSewaHargaSopir(merged as z.infer<typeof carBaseSchema>);
  if (bisnisError) {
    res.status(400).json({ error: bisnisError });
    return;
  }

  const car = await prisma.car.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ data: car });
});

/** DELETE /api/admin/cars/:id — nonaktifkan (soft-delete), bukan hapus baris. */
adminCarsRouter.delete('/:id', async (req, res) => {
  const car = await prisma.car
    .update({ where: { id: req.params.id }, data: { status: 'nonaktif' } })
    .catch(() => null);

  if (!car) {
    res.status(404).json({ error: 'Mobil tidak ditemukan' });
    return;
  }
  res.json({ data: car });
});

const imageSchema = z.object({
  url: z.string().url(),
  urutan: z.number().int().nonnegative().default(0),
});

/**
 * POST /api/admin/cars/:id/images — ditambahkan v1.1.
 * Dipanggil SETELAH file foto sudah diunggah ke bucket publik Supabase
 * Storage `car-photos` dari sisi admin dashboard; endpoint ini menyimpan
 * referensi URL publiknya ke tabel car_images (pola yang sama seperti
 * POST /api/profiles/me/dokumen untuk dokumen KTP/SIM).
 */
adminCarsRouter.post('/:id/images', async (req, res) => {
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const car = await prisma.car.findUnique({ where: { id: req.params.id } });
  if (!car) {
    res.status(404).json({ error: 'Mobil tidak ditemukan' });
    return;
  }

  const image = await prisma.carImage.create({
    data: { carId: req.params.id, url: parsed.data.url, urutan: parsed.data.urutan },
  });
  res.status(201).json({ data: image });
});

/** DELETE /api/admin/cars/:id/images/:imageId — ditambahkan v1.1. */
adminCarsRouter.delete('/:id/images/:imageId', async (req, res) => {
  const image = await prisma.carImage
    .delete({ where: { id: req.params.imageId } })
    .catch(() => null);

  if (!image) {
    res.status(404).json({ error: 'Foto tidak ditemukan' });
    return;
  }
  res.json({ data: image });
});
