import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';
import { sendBookingConfirmedEmail, sendBookingCancelledEmail } from '../services/email.service';
import { notifyUser, notifyInstansi } from '../services/notification.service';
import { logAdminActivity } from '../services/activity.service';

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
        { car: { nomorPlat: { contains: cari, mode: 'insensitive' } } },
        { profile: { nama: { contains: cari, mode: 'insensitive' } } },
      ],
    }),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        car: {
          include: {
            images: { orderBy: { urutan: 'asc' } },
          },
        },
        profile: { select: { nama: true, email: true, noHp: true } },
        payment: true,
        refund: true,
      },
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
  dikonfirmasi: ['berjalan', 'dibatalkan'],
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
    include: {
      car: { select: { nama: true, instansiId: true } },
      profile: { select: { nama: true, email: true } },
      payment: true,
      refund: true,
    },
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
        catatan: `Status diubah oleh admin rental menjadi ${parsed.data.status}`,
      },
    });

    // Jika dibatalkan dan pesanan sudah dibayar, otomatis buat refund dengan status disetujui
    if (
      parsed.data.status === 'dibatalkan' &&
      !booking.refund &&
      (booking.status === 'dikonfirmasi' || booking.payment?.status === 'paid')
    ) {
      await tx.refund.create({
        data: {
          bookingId: booking.id,
          paymentId: booking.payment?.id,
          jumlahAsli: booking.totalHarga,
          potonganAdmin: 0,
          jumlahRefund: booking.totalHarga,
          rekeningTujuan: booking.rekeningRefund,
          alasan: 'Dibatalkan oleh pihak rental',
          status: 'disetujui',
          disetujuiOleh: req.user!.id,
          disetujuiPada: new Date(),
        },
      });
    }

    return b;
  });

  // Kirim email notifikasi ke customer (fire-and-forget)
  const emailPayload = {
    to: booking.profile.email,
    namaPenyewa: booking.profile.nama,
    namaMobil: booking.car.nama,
    bookingId: booking.id,
    tanggalMulai: booking.tanggalMulai.toISOString(),
    tanggalSelesai: booking.tanggalSelesai.toISOString(),
  };
  if (parsed.data.status === 'dikonfirmasi') {
    void sendBookingConfirmedEmail(emailPayload);
    void notifyUser(booking.userId, {
      type: 'booking',
      title: 'Pesanan Dikonfirmasi Admin',
      message: `Pesanan #${booking.id.slice(0, 8)} untuk ${booking.car.nama} telah dikonfirmasi oleh rental.`,
      data: { actionUrl: `/akun/pesanan/${booking.id}`, bookingId: booking.id },
    });
  } else if (parsed.data.status === 'berjalan') {
    void notifyUser(booking.userId, {
      type: 'booking',
      title: 'Masa Sewa Dimulai',
      message: `Unit ${booking.car.nama} telah diserahkan. Selamat menikmati perjalanan Anda!`,
      data: { actionUrl: `/akun/pesanan/${booking.id}`, bookingId: booking.id },
    });
  } else if (parsed.data.status === 'selesai') {
    void notifyUser(booking.userId, {
      type: 'review',
      title: 'Sewa Selesai - Beri Ulasan',
      message: `Terima kasih telah menyewa ${booking.car.nama}. Bagikan ulasan pengalaman rental Anda!`,
      data: { actionUrl: `/akun/pesanan/${booking.id}#ulasan`, bookingId: booking.id },
    });
    void notifyInstansi(instansiId, {
      type: 'booking',
      title: 'Sewa Selesai',
      message: `Pesanan #${booking.id.slice(0, 8)} untuk ${booking.car.nama} telah selesai dan unit dikembalikan.`,
      data: { actionUrl: `/admin/pesanan/${booking.id}`, bookingId: booking.id },
    });
  } else if (parsed.data.status === 'dibatalkan') {
    void sendBookingCancelledEmail(emailPayload, 'ditolak_admin');
    void notifyUser(booking.userId, {
      type: 'booking',
      title: 'Pesanan Dibatalkan Rental',
      message: `Pesanan #${booking.id.slice(0, 8)} untuk ${booking.car.nama} telah dibatalkan oleh pihak rental.`,
      data: { actionUrl: `/akun/pesanan/${booking.id}`, bookingId: booking.id },
    });
  }

  void logAdminActivity({
    instansiId,
    userId: req.user!.id,
    action: 'update_booking_status',
    title: `Status Pesanan Diubah: ${parsed.data.status.toUpperCase()}`,
    description: `${(req.user as any)?.nama || req.user?.email || 'Admin'} mengubah status pesanan #${booking.id.slice(0, 8)} (${booking.car?.nama ?? 'Armada'}) menjadi ${parsed.data.status}`,
    metadata: { bookingId: booking.id, carNama: booking.car?.nama, newStatus: parsed.data.status, detailUrl: `/admin/pesanan/${booking.id}` },
  });

  res.json({ data: updated });
});