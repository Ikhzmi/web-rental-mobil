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
adminDashboardRouter.get('/summary', async (req, res) => {
  // Admin scoping
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const STATUS_DIHITUNG_PENDAPATAN = ['dikonfirmasi', 'berjalan', 'selesai'] as const;
  const STATUS_PESANAN_AKTIF = ['menunggu_pembayaran', 'dikonfirmasi', 'berjalan'] as const;

  const [pendapatanBulanIni, jumlahPesananAktif, totalMobilTersedia, mobilSedangBerjalan, mobilTerlaris] =
    await Promise.all([
      // Total pendapatan bulan berjalan
      prisma.booking.aggregate({
        where: {
          car: { instansiId }, // Admin scoping
          status: { in: [...STATUS_DIHITUNG_PENDAPATAN] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalHarga: true },
      }),

      // Jumlah pesanan aktif (belum selesai/dibatalkan)
      prisma.booking.count({
        where: { car: { instansiId }, status: { in: [...STATUS_PESANAN_AKTIF] } },
      }),

      // Total mobil berstatus 'tersedia' (basis okupansi)
      prisma.car.count({ where: { instansiId, status: 'tersedia' } }),

      // Mobil yang SEDANG disewa (status booking 'berjalan')
      prisma.booking.groupBy({
        by: ['carId'],
        where: { car: { instansiId }, status: 'berjalan' },
      }),

      // Mobil terlaris (hanya booking yang sudah dibayar)
      prisma.booking.groupBy({
        by: ['carId'],
        where: { car: { instansiId }, status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] } },
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