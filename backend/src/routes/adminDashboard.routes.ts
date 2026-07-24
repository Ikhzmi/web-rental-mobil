import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';

export const adminDashboardRouter = Router();

adminDashboardRouter.use(verifySupabaseToken, requireAdmin);

/**
 * GET /api/admin/dashboard/summary — F9 PRD.
 * Endpoint ini TIDAK ADA di §10 PRD manapun (v1.0/v1.1/v1.2) — F9
 * menyebut "total pendapatan, pesanan aktif, okupansi armada, mobil
 * terlaris" sebagai fitur, tapi spesifikasi API-nya kelewat ditulis.
 * Ditambahkan di sini, PRD perlu di-update menyusul.
 */
adminDashboardRouter.get('/summary', async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const STATUS_DIHITUNG_PENDAPATAN = ['dikonfirmasi', 'berjalan', 'selesai'] as const;
  const STATUS_PESANAN_AKTIF = ['pending', 'dikonfirmasi', 'berjalan'] as const;

  const [pendapatanBulanIni, jumlahPesananAktif, totalMobilTersedia, mobilSedangBerjalan, mobilTerlaris] =
    await Promise.all([
      // Total pendapatan bulan berjalan
      prisma.booking.aggregate({
        where: {
          status: { in: [...STATUS_DIHITUNG_PENDAPATAN] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalHarga: true },
      }),

      // Jumlah pesanan aktif (belum selesai/dibatalkan)
      prisma.booking.count({
        where: { status: { in: [...STATUS_PESANAN_AKTIF] } },
      }),

      // Total mobil berstatus 'tersedia' (basis okupansi)
      prisma.car.count({ where: { status: 'tersedia' } }),

      // Mobil yang SEDANG disewa (status booking 'berjalan') — dipakai
      // sebagai pembilang okupansi. Catatan: ini okupansi "saat ini",
      // bukan rata-rata periode, karena PRD tidak spesifik soal periode.
      prisma.booking.groupBy({
        by: ['carId'],
        where: { status: 'berjalan' },
      }),

      // Mobil terlaris — paling banyak dibooking sepanjang waktu
      // (status apa pun kecuali dibatalkan), top 1.
      prisma.booking.groupBy({
        by: ['carId'],
        where: { status: { not: 'dibatalkan' } },
        _count: { carId: true },
        orderBy: { _count: { carId: 'desc' } },
        take: 1,
      }),
    ]);

  let mobilTerlarisDetail = null;
  if (mobilTerlaris.length > 0) {
    const car = await prisma.car.findUnique({
      where: { id: mobilTerlaris[0].carId },
      select: { id: true, nama: true },
    });
    mobilTerlarisDetail = car ? { ...car, jumlahBooking: mobilTerlaris[0]._count.carId } : null;
  }

  const tingkatOkupansi =
    totalMobilTersedia > 0
      ? Math.round((mobilSedangBerjalan.length / totalMobilTersedia) * 100)
      : 0;

  res.json({
    data: {
      totalPendapatanBulanIni: pendapatanBulanIni._sum.totalHarga ?? 0,
      jumlahPesananAktif,
      tingkatOkupansiArmada: tingkatOkupansi,
      mobilSedangBerjalan: mobilSedangBerjalan.length,
      totalMobilTersedia,
      mobilTerlaris: mobilTerlarisDetail,
    },
  });
});