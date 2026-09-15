import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin, requireSuperAdmin } from '../middleware/verifySupabaseToken';
import { notifyUser, notifyInstansi } from '../services/notification.service';

export const refundRouter = Router();

const uuidSchema = z.string().uuid();

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOMER ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/refunds/booking/:bookingId
 * Melihat status refund dari suatu pesanan (Customer pemilik, Admin instansi terkait, atau SuperAdmin)
 */
refundRouter.get('/booking/:bookingId', verifySupabaseToken, async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const idParse = uuidSchema.safeParse(bookingId);
  if (!idParse.success) {
    res.status(400).json({ error: 'Format ID booking tidak valid' });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      car: { select: { id: true, nama: true, nomorPlat: true, instansiId: true } },
      payment: true,
      refund: true,
    },
  });

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }

  const user = req.user!;
  const isOwner = booking.userId === user.id;
  const isAdminOfCar = user.role === 'admin' && user.instansiId === booking.car.instansiId;
  const isSuperAdmin = user.role === 'super_admin';

  if (!isOwner && !isAdminOfCar && !isSuperAdmin) {
    res.status(403).json({ error: 'Tidak memiliki hak akses melihat refund pesanan ini' });
    return;
  }

  res.json({
    data: {
      refund: booking.refund,
      booking: {
        id: booking.id,
        status: booking.status,
        totalHarga: booking.totalHarga,
        rekeningRefund: booking.rekeningRefund,
        alasanPembatalan: booking.alasanPembatalan,
        car: booking.car,
        payment: booking.payment,
      },
    },
  });
});

/**
 * POST /api/refunds
 * Mengajukan refund untuk booking yang dibatalkan jika belum terbuat otomatis
 */
refundRouter.post('/', verifySupabaseToken, async (req: Request, res: Response) => {
  const bodySchema = z.object({
    bookingId: z.string().uuid(),
    rekeningTujuan: z.string().min(5, 'Format rekening tidak valid (e.g. BCA-1234567890 a.n. John)'),
    alasan: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const { bookingId, rekeningTujuan, alasan } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, refund: true, car: true },
  });

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }

  if (booking.userId !== req.user!.id) {
    res.status(403).json({ error: 'Anda bukan pemilik booking ini' });
    return;
  }

  if (booking.refund) {
    res.status(409).json({ error: 'Refund sudah pernah diajukan untuk pesanan ini', data: booking.refund });
    return;
  }

  if (booking.status !== 'dibatalkan' && booking.status !== 'dikonfirmasi') {
    res.status(400).json({ error: 'Refund hanya dapat diajukan untuk pesanan yang dibatalkan atau dikonfirmasi' });
    return;
  }

  const refund = await prisma.$transaction(async (tx) => {
    // Update booking jika belum dibatalkan
    if (booking.status !== 'dibatalkan') {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'dibatalkan',
          rekeningRefund: rekeningTujuan,
          alasanPembatalan: alasan,
        },
      });
      await tx.bookingStatusLog.create({
        data: {
          bookingId: booking.id,
          statusLama: booking.status,
          statusBaru: 'dibatalkan',
          diubahOleh: req.user!.id,
          catatan: 'Dibatalkan oleh pelanggan dengan pengajuan refund',
        },
      });
    }

    // 100% full refund tanpa potongan admin sesuai kebijakan
    return await tx.refund.create({
      data: {
        bookingId: booking.id,
        paymentId: booking.payment?.id,
        jumlahAsli: booking.totalHarga,
        potonganAdmin: 0,
        jumlahRefund: booking.totalHarga,
        rekeningTujuan,
        alasan: alasan || booking.alasanPembatalan,
        status: 'menunggu_persetujuan',
      },
      include: {
        booking: {
          include: { car: true },
        },
      },
    });
  });

  // Notifikasi instansi
  void notifyInstansi(booking.car.instansiId, {
    type: 'booking',
    title: 'Pengajuan Refund Baru',
    message: `Permintaan refund untuk pesanan #${booking.id.slice(0, 8)} (${booking.car.nama}) menunggu persetujuan.`,
    data: { actionUrl: `/admin/refunds`, bookingId: booking.id },
  });

  res.status(201).json({ data: refund });
});

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN INSTANSI ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

const listRefundQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['menunggu_persetujuan', 'disetujui', 'diproses', 'berhasil', 'ditolak']).optional(),
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
  cari: z.string().trim().optional(),
});

/**
 * GET /api/refunds/admin
 * Daftar refund untuk admin instansi dengan filter, summary, dan pagination
 */
refundRouter.get('/admin', verifySupabaseToken, requireAdmin, async (req: Request, res: Response) => {
  const parsed = listRefundQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  const { page, limit, status, dari, sampai, cari } = parsed.data;
  const skip = (page - 1) * limit;

  const where: any = {
    booking: {
      car: { instansiId },
      ...(cari && {
        OR: [
          { id: { contains: cari, mode: 'insensitive' } },
          { profile: { nama: { contains: cari, mode: 'insensitive' } } },
          { profile: { email: { contains: cari, mode: 'insensitive' } } },
          { car: { nama: { contains: cari, mode: 'insensitive' } } },
          { car: { nomorPlat: { contains: cari, mode: 'insensitive' } } },
        ],
      }),
    },
    ...(status && { status }),
    ...((dari || sampai) && {
      createdAt: {
        ...(dari && { gte: dari }),
        ...(sampai && { lte: sampai }),
      },
    }),
  };

  const [refunds, total, statusCounts, sumBerhasil] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        booking: {
          include: {
            profile: { select: { id: true, nama: true, email: true, noHp: true } },
            car: { select: { id: true, nama: true, nomorPlat: true } },
            payment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.refund.count({ where }),
    prisma.refund.groupBy({
      by: ['status'],
      where: { booking: { car: { instansiId } } },
      _count: { id: true },
    }),
    prisma.refund.aggregate({
      where: { booking: { car: { instansiId } }, status: 'berhasil' },
      _sum: { jumlahRefund: true },
    }),
  ]);

  const stats = {
    menunggu_persetujuan: 0,
    disetujui: 0,
    diproses: 0,
    berhasil: 0,
    ditolak: 0,
    totalNilaiRefund: Number(sumBerhasil._sum.jumlahRefund ?? 0),
  };

  statusCounts.forEach((sc) => {
    if (sc.status in stats) {
      stats[sc.status as keyof typeof stats] = sc._count.id;
    }
  });

  res.json({
    data: refunds,
    stats,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * PATCH /api/refunds/admin/:id/approve — DISABLED
 * Refund diproses oleh SuperAdmin, bukan Admin Instansi.
 * Payment pelanggan masuk ke rekening SuperAdmin.
 */
refundRouter.patch('/admin/:id/approve', verifySupabaseToken, requireAdmin, async (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Tidak dapat memproses refund dari akun Admin Rental.',
    message: 'Pembayaran pelanggan masuk ke rekening SuperAdmin. Proses approve/transfer/selesai refund hanya dapat dilakukan oleh SuperAdmin.',
  });
  return;
});

/**
 * PATCH /api/refunds/admin/:id/process — DISABLED
 * Hanya SuperAdmin yang memproses transfer refund.
 */
refundRouter.patch('/admin/:id/process', verifySupabaseToken, requireAdmin, async (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Tidak dapat memproses refund dari akun Admin Rental.',
    message: 'Proses transfer refund hanya dapat dilakukan oleh SuperAdmin.',
  });
  return;
});

/**
 * PATCH /api/refunds/admin/:id/complete — DISABLED
 * Hanya SuperAdmin yang mengkonfirmasi refund berhasil.
 */
refundRouter.patch('/admin/:id/complete', verifySupabaseToken, requireAdmin, async (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Tidak dapat mengkonfirmasi refund dari akun Admin Rental.',
    message: 'Konfirmasi refund berhasil hanya dapat dilakukan oleh SuperAdmin.',
  });
  return;
});

/**
 * PATCH /api/refunds/admin/:id/reject — DISABLED
 * Hanya SuperAdmin yang dapat menolak refund.
 * Keputusan refund ada di SuperAdmin karena dana ada di rekening SuperAdmin.
 */
refundRouter.patch('/admin/:id/reject', verifySupabaseToken, requireAdmin, async (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Tidak dapat menolak refund dari akun Admin Rental.',
    message: 'Keputusan penolakan refund hanya dapat dilakukan oleh SuperAdmin karena dana pembayaran berada di rekening SuperAdmin.',
  });
  return;
});

// ──────────────────────────────────────────────────────────────────────────────
// SUPERADMIN ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

const superadminRefundQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  instansiId: z.string().uuid().optional(),
  status: z.enum(['menunggu_persetujuan', 'disetujui', 'diproses', 'berhasil', 'ditolak']).optional(),
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
  cari: z.string().trim().optional(),
});

/**
 * GET /api/refunds/superadmin
 * Monitoring seluruh refund lintas platform
 */
refundRouter.get('/superadmin', verifySupabaseToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const parsed = superadminRefundQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const { page, limit, instansiId, status, dari, sampai, cari } = parsed.data;
  const skip = (page - 1) * limit;

  const where: any = {
    ...(instansiId && { booking: { car: { instansiId } } }),
    ...(status && { status }),
    ...((dari || sampai) && {
      createdAt: {
        ...(dari && { gte: dari }),
        ...(sampai && { lte: sampai }),
      },
    }),
    ...(cari && {
      OR: [
        { id: { contains: cari, mode: 'insensitive' } },
        { bookingId: { contains: cari, mode: 'insensitive' } },
        { rekeningTujuan: { contains: cari, mode: 'insensitive' } },
        { booking: { profile: { nama: { contains: cari, mode: 'insensitive' } } } },
        { booking: { profile: { email: { contains: cari, mode: 'insensitive' } } } },
        { booking: { car: { nama: { contains: cari, mode: 'insensitive' } } } },
      ],
    }),
  };

  const [refunds, total, statusCounts, sumBerhasil, sumPending] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        booking: {
          include: {
            profile: { select: { id: true, nama: true, email: true, noHp: true } },
            car: {
              select: {
                id: true,
                nama: true,
                nomorPlat: true,
                instansi: { select: { id: true, namaInstansi: true } },
              },
            },
            payment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.refund.count({ where }),
    prisma.refund.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.refund.aggregate({
      where: { status: 'berhasil' },
      _sum: { jumlahRefund: true },
    }),
    prisma.refund.aggregate({
      where: { status: { in: ['menunggu_persetujuan', 'disetujui', 'diproses'] } },
      _sum: { jumlahRefund: true },
    }),
  ]);

  const stats = {
    menunggu_persetujuan: 0,
    disetujui: 0,
    diproses: 0,
    berhasil: 0,
    ditolak: 0,
    totalNilaiRefundBerhasil: Number(sumBerhasil._sum.jumlahRefund ?? 0),
    totalNilaiRefundPending: Number(sumPending._sum.jumlahRefund ?? 0),
  };

  statusCounts.forEach((sc) => {
    if (sc.status in stats) {
      stats[sc.status as keyof typeof stats] = sc._count.id;
    }
  });

  res.json({
    data: refunds,
    stats,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * PATCH /api/refunds/superadmin/:id/action
 * SuperAdmin dapat melakukan intervensi / override status refund
 */
refundRouter.patch('/superadmin/:id/action', verifySupabaseToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    res.status(400).json({ error: 'Format ID refund tidak valid' });
    return;
  }

  const actionSchema = z.object({
    status: z.enum(['disetujui', 'diproses', 'berhasil', 'ditolak']),
    catatan: z.string().optional(),
  });

  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const refund = await prisma.refund.findUnique({
    where: { id },
    include: { booking: true },
  });

  if (!refund) {
    res.status(404).json({ error: 'Refund tidak ditemukan' });
    return;
  }

  const { status, catatan } = parsed.data;

  const updated = await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status,
      catatan: catatan || refund.catatan,
      ...(status === 'disetujui' && { disetujuiOleh: req.user!.id, disetujuiPada: new Date() }),
      ...(status === 'diproses' && { diprosesOleh: req.user!.id }),
      ...(status === 'berhasil' && { selesaiPada: new Date() }),
    },
  });

  void notifyUser(refund.booking.userId, {
    type: 'booking',
    title: `Update Status Refund (${status.replace('_', ' ')})`,
    message: `Status refund pesanan #${refund.bookingId.slice(0, 8)} diubah menjadi ${status.replace('_', ' ')} oleh Super Admin.`,
    data: { actionUrl: `/akun/pesanan/${refund.bookingId}`, bookingId: refund.bookingId },
  });

  res.json({ data: updated });
});
