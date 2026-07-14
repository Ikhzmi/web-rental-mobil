import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { isCarAvailable } from '../services/availability.service';
import { hitungRincianHarga } from '../services/pricing.service';

export const bookingsRouter = Router();

bookingsRouter.use(verifySupabaseToken);

const createBookingSchema = z.object({
  carId: z.string().uuid(),
  tanggalMulai: z.coerce.date(),
  tanggalSelesai: z.coerce.date(),
  lokasiAmbil: z.string().trim().min(1),
  lokasiKembali: z.string().trim().min(1),
  addons: z
    .array(
      z.object({
        jenis: z.enum(['sopir', 'asuransi', 'antar_jemput']),
        harga: z.number().nonnegative().optional(),
      })
    )
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
bookingsRouter.post('/', async (req, res) => {
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
    const booking = await prisma.$transaction(async (tx) => {
      const car = await tx.car.findUnique({ where: { id: carId } });
      if (!car || car.status !== 'tersedia') {
        throw new Error('MOBIL_TIDAK_TERSEDIA');
      }

      const available = await isCarAvailable(tx, { carId, tanggalMulai, tanggalSelesai });
      if (!available) {
        throw new Error('TANGGAL_BENTROK');
      }

      const rincian = hitungRincianHarga(car, tanggalMulai, tanggalSelesai, addons);

      return tx.booking.create({
        data: {
          userId: req.user!.id,
          carId,
          tanggalMulai,
          tanggalSelesai,
          lokasiAmbil,
          lokasiKembali,
          hargaDasar: rincian.hargaDasar,
          totalAddon: rincian.totalAddon,
          totalHarga: rincian.totalHarga,
          status: 'pending',
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
  } catch (err) {
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
bookingsRouter.get('/mine', async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: { car: { include: { images: { orderBy: { urutan: 'asc' }, take: 1 } } }, addons: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: bookings });
});

/** GET /api/bookings/:id — pemilik booking ATAU admin boleh lihat. */
bookingsRouter.get('/:id', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { car: true, addons: true, statusLogs: { orderBy: { createdAt: 'asc' } } },
  });

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }
  if (booking.userId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Tidak berhak melihat booking ini' });
    return;
  }

  res.json({ data: booking });
});

/** PATCH /api/bookings/:id/cancel — hanya pemilik booking, hanya jika masih `pending`. */
bookingsRouter.patch('/:id/cancel', async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }
  if (booking.userId !== req.user!.id) {
    res.status(403).json({ error: 'Tidak berhak membatalkan booking ini' });
    return;
  }
  if (booking.status !== 'pending') {
    res.status(409).json({ error: 'Booking hanya bisa dibatalkan selagi berstatus pending' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'dibatalkan' },
    });
    await tx.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        statusLama: 'pending',
        statusBaru: 'dibatalkan',
        diubahOleh: req.user!.id,
      },
    });
    return b;
  });

  res.json({ data: updated });
});
