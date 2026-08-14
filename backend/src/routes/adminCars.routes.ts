import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';
import { asyncHandler, AppError } from '../lib/errorHandler';

export const adminCarsRouter = Router();

adminCarsRouter.use(verifySupabaseToken, requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cari: z.string().trim().optional(),
});

/** GET /api/admin/cars — termasuk mobil nonaktif/maintenance (F10) dengan pagination. */
adminCarsRouter.get('/', asyncHandler(async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Query tidak valid', 400);
  }

  const { page, limit, cari } = parsed.data;
  const skip = (page - 1) * limit;

  const where = cari
    ? { nama: { contains: cari, mode: 'insensitive' as const } }
    : {};

  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where,
      include: { images: { orderBy: { urutan: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.car.count({ where }),
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
adminCarsRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.findUnique({
    where: { id, instansiId },
    include: { images: { orderBy: { urutan: 'asc' } } },
  });

  if (!car) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  res.json({ data: car });
}));

const carBaseSchema = z.object({
  nama: z.string().trim().min(1),
  kategori: z.enum(['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric']),
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
adminCarsRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = carBaseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  const bisnisError = validateTipeSewaHargaSopir(parsed.data);
  if (bisnisError) {
    throw new AppError(bisnisError, 400);
  }

  // Admin scoping: assign car to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.create({
    data: { ...parsed.data, instansiId },
    include: { images: true },
  });
  res.status(201).json({ data: car });
}));

/** PATCH /api/admin/cars/:id */
adminCarsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const parsed = carBaseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.car.findUnique({ where: { id, instansiId } });
  if (!existing) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const merged = { ...existing, ...parsed.data };
  const bisnisError = validateTipeSewaHargaSopir(merged as z.infer<typeof carBaseSchema>);
  if (bisnisError) {
    throw new AppError(bisnisError, 400);
  }

  const car = await prisma.car.update({ where: { id }, data: parsed.data });
  res.json({ data: car });
}));

/** DELETE /api/admin/cars/:id — nonaktifkan (soft-delete), bukan hapus baris. */
adminCarsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.car.findUnique({ where: { id, instansiId } });
  if (!existing) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const car = await prisma.car.update({
    where: { id },
    data: { status: 'nonaktif' },
  });
  res.json({ data: car });
}));

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
adminCarsRouter.post('/:id/images', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.findUnique({ where: { id, instansiId } });
  if (!car) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const image = await prisma.carImage.create({
    data: { carId: id, url: parsed.data.url, urutan: parsed.data.urutan },
  });
  res.status(201).json({ data: image });
}));

/** DELETE /api/admin/cars/:id/images/:imageId — ditambahkan v1.1. */
adminCarsRouter.delete('/:id/images/:imageId', asyncHandler(async (req, res) => {
  const imageId = req.params.imageId as string;

  // Admin scoping: verify image belongs to admin's car's
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.carImage.findFirst({
    where: {
      id: imageId,
      car: { instansiId },
    },
  });
  if (!existing) {
    throw new AppError('Foto tidak ditemukan', 404);
  }

  const image = await prisma.carImage.delete({ where: { id: imageId } });
  res.json({ data: image });
}));
