import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getBookedDateRanges } from '../services/availability.service';

export const carsRouter = Router();

const listCarsQuerySchema = z.object({
  kategori: z.enum(['city_car', 'suv', 'mpv', 'mewah']).optional(),
  transmisi: z.enum(['manual', 'matic']).optional(),
  tipeSewa: z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']).optional(),
  hargaMin: z.coerce.number().nonnegative().optional(),
  hargaMax: z.coerce.number().nonnegative().optional(),
  kapasitasMin: z.coerce.number().int().positive().optional(),
  cari: z.string().trim().min(1).optional(),
  sort: z.enum(['harga_asc', 'harga_desc']).optional(),
});

/** GET /api/cars — F2 Katalog Armada: filter + sort, hanya mobil `tersedia`. */
carsRouter.get('/', async (req, res) => {
  const parsed = listCarsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
    return;
  }
  const { kategori, transmisi, tipeSewa, hargaMin, hargaMax, kapasitasMin, cari, sort } =
    parsed.data;

  const cars = await prisma.car.findMany({
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
carsRouter.get('/:id', async (req, res) => {
  const car = await prisma.car.findUnique({
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
carsRouter.get('/:id/availability', async (req, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!car) {
    res.status(404).json({ error: 'Mobil tidak ditemukan' });
    return;
  }

  const bookedRanges = await getBookedDateRanges(req.params.id);
  res.json({ data: bookedRanges });
});
