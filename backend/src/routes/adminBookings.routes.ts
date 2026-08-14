import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';

export const adminBookingsRouter = Router();

adminBookingsRouter.use(verifySupabaseToken, requireAdmin);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['menunggu_pembayaran', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan']).optional(),
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
  cari: z.string().trim().optional(),
});

/** GET /api/admin/bookings — list + filter status & tanggal (F11) dengan pagination. */
adminBookingsRouter.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
    return;
  }
  const { page, limit, status, dari, sampai, cari } = parsed.data;
  const skip = (page - 1) * limit;

  // Admin scoping: filter by admin's instansiId
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  const where: any = {
    car: { instansiId }, // Admin scoping
    ...(status && { status }),
    ...((dari || sampai) && {
      tanggalMulai: {
        ...(dari && { gte: dari }),
        ...(sampai && { lte: sampai }),
      },
    }),
    ...(cari && {
      OR: [
        { car: { nama: { contains: cari, mode: 'insensitive' } } },
        { profile: { nama: { contains: cari, mode: 'insensitive' } } },
      ],
    }),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { car: true, profile: { select: { nama: true, email: true, noHp: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    data: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * Alur status yang valid — mencegah lompat status sembarangan (§11.4).
 * Sesuai teks PRD: "dibatalkan: dapat terjadi dari status pending" —
 * jadi HANYA pending yang boleh dibatalkan, bukan juga dikonfirmasi.
 * Kalau bisnisnya ternyata butuh cancel dari dikonfirmasi juga (mis.
 * pembayaran gagal setelah diverifikasi), ini perlu diputuskan eksplisit
 * dan §11.4 PRD diupdate dulu, bukan diam-diam dilonggarkan di kode.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  menunggu_pembayaran: ['dikonfirmasi', 'dibatalkan'],
  dikonfirmasi: ['berjalan'],
  berjalan: ['selesai'],
  selesai: [],
  dibatalkan: [],
};

const updateStatusSchema = z.object({
  status: z.enum(['menunggu_pembayaran', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan']),
});

/**
 * PATCH /api/admin/bookings/:id/status — F11. Setiap perubahan status
 * WAJIB juga menulis baris baru ke booking_status_log (audit trail,
 * §9/§11.4 PRD) — dilakukan dalam satu transaksi.
 */
adminBookingsRouter.patch('/:id/status', async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  // Admin scoping: verify booking belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, car: { instansiId } },
  });
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }

  const allowedNext = VALID_TRANSITIONS[booking.status] ?? [];
  if (!allowedNext.includes(parsed.data.status)) {
    res.status(409).json({
      error: `Tidak bisa mengubah status dari '${booking.status}' ke '${parsed.data.status}'`,
    });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: { status: parsed.data.status },
    });
    await tx.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        statusLama: booking.status,
        statusBaru: parsed.data.status,
        diubahOleh: req.user!.id,
      },
    });
    return b;
  });

  res.json({ data: updated });
});
