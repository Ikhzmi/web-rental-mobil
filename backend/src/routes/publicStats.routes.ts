import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/errorHandler';

export const publicStatsRouter = Router();

/**
 * GET /api/public/stats
 * Statistik publik untuk section "Mengapa KerenTal?" di landing page.
 * Tidak memerlukan autentikasi.
 */
publicStatsRouter.get('/', asyncHandler(async (_req, res) => {
  const [totalArmada, totalLokasi, totalBookingSelesai, totalReview] = await Promise.all([
    // Jumlah armada yang tersedia & sudah disetujui super admin
    prisma.car.count({
      where: {
        status: 'tersedia',
        statusApproval: 'disetujui',
      },
    }),

    // Jumlah instansi (rental) yang aktif = "lokasi" penyedia
    prisma.instansi.count({
      where: { status: 'aktif' },
    }),

    // Jumlah transaksi booking yang sudah selesai
    prisma.booking.count({
      where: { status: 'selesai' },
    }),

    // Jumlah total ulasan yang masuk (untuk estimasi kepuasan)
    prisma.review.count(),
  ]);

  // Hitung rata-rata rating dari semua ulasan
  const avgRatingResult = await prisma.review.aggregate({
    _avg: { rating: true },
  });

  const avgRating = avgRatingResult._avg.rating ?? 5;

  // Kepuasan dalam persen (skala 1-5 → persentase)
  const kepuasanPersen = Math.round((avgRating / 5) * 100);

  res.json({
    data: {
      totalArmada,
      totalLokasi,
      totalBookingSelesai,
      totalReview,
      avgRating: Number(avgRating.toFixed(1)),
      kepuasanPersen: totalReview > 0 ? kepuasanPersen : 100,
    },
  });
}));
