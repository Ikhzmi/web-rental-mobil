import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { scopeToInstansi } from '../middleware/scopeToInstansi';

// Schema untuk pendaftaran instansi baru (public)
import { z } from 'zod';

export const instansiRouter = Router();

// Public endpoint - pendaftaran instansi baru
export const daftarInstansiSchema = z.object({
  namaInstansi: z.string().trim().min(2),
  alamat: z.string().trim().min(5),
  noHpPic: z.string().trim().min(8),
  emailPic: z.string().email(),
  dokumenLegalitasUrl: z.string().url().optional(),
});

/**
 * POST /api/instansi/daftar
 * Pendaftaran instansi baru - publik, tanpa auth
 * Setelah submit, status = 'menunggu_verifikasi'
 */
instansiRouter.post('/daftar', async (req, res) => {
  const parsed = daftarInstansiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const { namaInstansi, alamat, noHpPic, emailPic, dokumenLegalitasUrl } = parsed.data;

  try {
    // Cek apakah email sudah terdaftar
    const existing = await prisma.instansi.findFirst({
      where: { emailPic },
    });

    if (existing) {
      res.status(409).json({ error: 'Email sudah terdaftar. Gunakan email lain.' });
      return;
    }

    const instansi = await prisma.instansi.create({
      data: {
        namaInstansi,
        alamat,
        noHpPic,
        emailPic,
        dokumenLegalitasUrl,
        status: 'menunggu_verifikasi',
      },
    });

    res.status(201).json({
      data: {
        id: instansi.id,
        namaInstansi: instansi.namaInstansi,
        status: instansi.status,
      },
      message: 'Pendaftaran berhasil. Tim kami akan memverifikasi dalam 1-2 hari kerja.',
    });
  } catch (error) {
    console.error('POST /api/instansi/daftar error:', error);
    res.status(500).json({ error: 'Gagal mendaftarkan instansi' });
  }
});

// ============================================================================
// ADMIN INSTANSI ENDPOINTS (Butuh Auth + Scoping)
// ============================================================================

// Semua endpoint di bawah butuh auth + admin role + instansi scoping
instansiRouter.use(verifySupabaseToken, async (req, res, next) => {
  // Check if user is admin and has instansiId
  if (req.user?.role !== 'admin' || !req.user?.instansiId) {
    res.status(403).json({ error: 'Endpoint ini khusus admin instansi' });
    return;
  }
  // Attach instansiId to request
  req.instansiScope = { instansiId: req.user.instansiId };
  next();
});

/**
 * GET /api/instansi/dashboard
 * Statistik ringkasan milik instansi sendiri
 */
instansiRouter.get('/dashboard', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    const [
      totalMobil,
      mobilTersedia,
      mobilMaintenance,
      bookingsThisMonth,
      completedBookings,
      disbursements,
      recentBookings,
    ] = await Promise.all([
      // Total mobil
      prisma.car.count({ where: { instansiId } }),

      // Mobil tersedia
      prisma.car.count({ where: { instansiId, status: 'tersedia' } }),

      // Mobil maintenance
      prisma.car.count({ where: { instansiId, status: 'maintenance' } }),

      // Booking bulan ini
      prisma.booking.findMany({
        where: {
          car: { instansiId },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: {
          id: true,
          totalHarga: true,
          status: true,
          createdAt: true,
        },
      }),

      // Booking selesai (untuk hitung saldo tertunda)
      prisma.booking.findMany({
        where: {
          car: { instansiId },
          status: 'selesai',
        },
        select: {
          id: true,
          totalHarga: true,
          disbursementItems: { select: { id: true } },
        },
      }),

      // Recent disbursements
      prisma.disbursement.findMany({
        where: { instansiId },
        select: {
          id: true,
          jumlahBersih: true,
          status: true,
          dicairkanPada: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent bookings
      prisma.booking.findMany({
        where: { car: { instansiId } },
        include: {
          car: { select: { nama: true } },
          profile: { select: { nama: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Hitung statistik
    const totalPendapatanBulanIni = bookingsThisMonth
      .filter(b => ['dikonfirmasi', 'berjalan', 'selesai'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.totalHarga), 0);

    const bookingCounts = bookingsThisMonth.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hitung saldo tertunda (booking selesai tapi belum dicairkan)
    const saldoTertunda = completedBookings
      .filter(b => b.disbursementItems.length === 0)
      .reduce((sum, b) => sum + Number(b.totalHarga), 0);

    // Total sudah dicairkan
    const totalSudahDicairkan = disbursements
      .filter(d => d.status === 'berhasil')
      .reduce((sum, d) => sum + Number(d.jumlahBersih), 0);

    res.json({
      data: {
        totalMobil,
        mobilTersedia,
        mobilMaintenance,
        totalPendapatanBulanIni,
        bookingStats: bookingCounts,
        saldoTertunda,
        totalSudahDicairkan,
        recentBookings,
        recentDisbursements: disbursements,
      },
    });
  } catch (error) {
    console.error('GET /api/instansi/dashboard error:', error);
    res.status(500).json({ error: 'Gagal mengambil data dashboard' });
  }
});

/**
 * GET /api/instansi/saldo
 * Saldo tertunda & ringkasan keuangan instansi
 */
instansiRouter.get('/saldo', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    // Ambil informasi instansi untuk komisi
    const instansi = await prisma.instansi.findUnique({
      where: { id: instansiId },
      select: {
        komisiPlatformPersen: true,
        rekeningBank: true,
      },
    });

    if (!instansi) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    // Booking yang sudah selesai tapi belum dicairkan
    const pendingBookings = await prisma.booking.findMany({
      where: {
        car: { instansiId },
        status: 'selesai',
      },
      include: {
        disbursementItems: { select: { id: true } },
      },
    });

    const eligibleBookings = pendingBookings.filter(b => b.disbursementItems.length === 0);

    const jumlahKotor = eligibleBookings.reduce(
      (sum, b) => sum + Number(b.totalHarga),
      0
    );
    const komisi = jumlahKotor * (Number(instansi.komisiPlatformPersen) / 100);
    const jumlahBersih = jumlahKotor - komisi;

    // Estimasi disbursement berikutnya
    const lastDisbursement = await prisma.disbursement.findFirst({
      where: { instansiId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    res.json({
      data: {
        saldoTertunda: {
          jumlahKotor,
          komisi,
          jumlahBersih,
          jumlahBooking: eligibleBookings.length,
        },
        infoRekening: instansi.rekeningBank ? 'tersedia' : 'belum_dibuat',
        komisiPlatformPersen: Number(instansi.komisiPlatformPersen),
        estimasiPencairanBerikutnya: lastDisbursement?.createdAt ?? null,
      },
    });
  } catch (error) {
    console.error('GET /api/instansi/saldo error:', error);
    res.status(500).json({ error: 'Gagal mengambil data saldo' });
  }
});

/**
 * GET /api/instansi/disbursements
 * Riwayat pencairan dana instansi
 */
instansiRouter.get('/disbursements', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;
  const { dari, sampai, status } = req.query;

  try {
    const disbursements = await prisma.disbursement.findMany({
      where: {
        instansiId,
        ...(status && { status: status as any }),
        ...((dari || sampai) && {
          createdAt: {
            ...(dari && { gte: new Date(String(dari)) }),
            ...(sampai && { lte: new Date(String(sampai)) }),
          },
        }),
      },
      include: {
        items: {
          include: {
            booking: {
              select: {
                id: true,
                tanggalMulai: true,
                tanggalSelesai: true,
                profile: { select: { nama: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const summary = {
      totalDisbursement: disbursements.length,
      totalJumlahKotor: disbursements.reduce((sum, d) => sum + Number(d.jumlahKotor), 0),
      totalKomisi: disbursements.reduce((sum, d) => sum + Number(d.komisiPlatform), 0),
      totalJumlahBersih: disbursements.reduce((sum, d) => sum + Number(d.jumlahBersih), 0),
      berhasil: disbursements.filter(d => d.status === 'berhasil').length,
      diproses: disbursements.filter(d => d.status === 'diproses').length,
      gagal: disbursements.filter(d => d.status === 'gagal').length,
    };

    res.json({ data: disbursements, summary });
  } catch (error) {
    console.error('GET /api/instansi/disbursements error:', error);
    res.status(500).json({ error: 'Gagal mengambil riwayat pencairan' });
  }
});

/**
 * GET /api/instansi/disbursements/:id
 * Detail satu pencairan + booking terkait
 */
instansiRouter.get('/disbursements/:id', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    const disbursement = await prisma.disbursement.findFirst({
      where: {
        id: req.params.id,
        instansiId, // Ensure scoped to this instansi
      },
      include: {
        items: {
          include: {
            booking: {
              include: {
                car: { select: { nama: true, kategori: true } },
                profile: { select: { nama: true, noHp: true } },
              },
            },
          },
        },
        instansi: {
          select: {
            namaInstansi: true,
            rekeningBank: true,
            komisiPlatformPersen: true,
          },
        },
      },
    });

    if (!disbursement) {
      res.status(404).json({ error: 'Pencairan tidak ditemukan' });
      return;
    }

    res.json({ data: disbursement });
  } catch (error) {
    console.error('GET /api/instansi/disbursements/:id error:', error);
    res.status(500).json({ error: 'Gagal mengambil detail pencairan' });
  }
});
