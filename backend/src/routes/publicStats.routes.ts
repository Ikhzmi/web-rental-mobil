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

  // Hitung rata-rata rating dari semua ulasan.
  // Jujur saat kosong: null (frontend menampilkan "-"), BUKAN 100%/5.0
  // palsu — persentase harus sesuai rating nyata.
  const avgRatingResult = await prisma.review.aggregate({
    _avg: { rating: true },
  });

  const hasReview = totalReview > 0 && avgRatingResult._avg.rating !== null;
  const avgRating = hasReview ? Number((avgRatingResult._avg.rating as number).toFixed(1)) : null;

  // Kepuasan dalam persen (skala 1-5 → persentase)
  const kepuasanPersen = hasReview ? Math.round(((avgRatingResult._avg.rating as number) / 5) * 100) : null;

  res.json({
    data: {
      totalArmada,
      totalLokasi,
      totalBookingSelesai,
      totalReview,
      avgRating,
      kepuasanPersen,
    },
  });
}));
