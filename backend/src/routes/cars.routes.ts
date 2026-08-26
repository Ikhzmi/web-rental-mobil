import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getBookedDateRanges } from '../services/availability.service';
import { asyncHandler, AppError } from '../lib/errorHandler';

export const carsRouter = Router();

const listCarsQuerySchema = z.object({
  kategori: z.enum(['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric']).optional(),
  transmisi: z.enum(['manual', 'matic']).optional(),
  tipeSewa: z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']).optional(),
  hargaMin: z.coerce.number().nonnegative().optional(),
  hargaMax: z.coerce.number().nonnegative().optional(),
  kapasitasMin: z.coerce.number().int().positive().optional(),
  cari: z.string().trim().min(1).optional(),
  sort: z.enum(['harga_asc', 'harga_desc']).optional(),
});

// SECURITY: UUID validation schema
const uuidSchema = z.string().uuid();

/** GET /api/cars — F2 Katalog Armada: filter + sort, hanya mobil `tersedia`. */
carsRouter.get('/', asyncHandler(async (req, res) => {
  const parsed = listCarsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Query tidak valid', 400);
  }

  const { kategori, transmisi, tipeSewa, hargaMin, hargaMax, kapasitasMin, cari, sort } =
    parsed.data;

  const cars = await prisma.car.findMany({
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
carsRouter.get('/:id', asyncHandler(async (req, res) => {
  // SECURITY: Validate UUID format
  const idParse = uuidSchema.safeParse(req.params.id);
  if (!idParse.success) {
    throw new AppError('Format ID mobil tidak valid', 400);
  }

  const id = idParse.data;
  const car = await prisma.car.findUnique({
    where: { id },
    include: { images: { orderBy: { urutan: 'asc' } } },
  });

  if (!car || car.status === 'nonaktif' || car.statusApproval !== 'disetujui') {
    // Perlakukan mobil yang belum/tidak disetujui sama seperti "tidak
    // ditemukan" untuk publik — konsisten dengan cara mobil nonaktif
    // disembunyikan, dan tidak membocorkan info kalau mobil ini "ada tapi
    // sedang direview".
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  res.json({ data: car });
}));

/**
 * GET /api/cars/:id/availability — dipakai kalender di F3 untuk menandai
 * tanggal yang sudah terbooking sebagai tidak bisa dipilih.
 */
carsRouter.get('/:id/availability', asyncHandler(async (req, res) => {
  // SECURITY: Validate UUID format
  const idParse = uuidSchema.safeParse(req.params.id);
  if (!idParse.success) {
    throw new AppError('Format ID mobil tidak valid', 400);
  }

  const id = idParse.data;
  const car = await prisma.car.findUnique({
    where: { id },
    select: { id: true, status: true, statusApproval: true }
  });

  if (!car || car.status === 'nonaktif' || car.statusApproval !== 'disetujui') {
    throw new AppError('Mobil tidak ditemukan', 404);
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const bookedRanges = await getBookedDateRanges(id);
  res.json({ data: bookedRanges });
}));