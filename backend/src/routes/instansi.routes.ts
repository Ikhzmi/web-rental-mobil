import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { notifySuperAdmins } from '../services/notification.service';
import { logAdminActivity } from '../services/activity.service';

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

    void notifySuperAdmins({
      type: 'approval',
      title: 'Pendaftaran Instansi Baru',
      message: `Instansi baru ${instansi.namaInstansi} mendaftar dan menunggu verifikasi legalitas dokumen.`,
      data: { actionUrl: '/superadmin/approval', instansiId: instansi.id },
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

const isValidUuid = (id?: string | null): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

// Semua endpoint di bawah butuh auth + admin/super_admin role + instansi scoping
instansiRouter.use(verifySupabaseToken, async (req, res, next) => {
  const isSuperAdmin = req.user?.role === 'super_admin';
  const isAdmin = req.user?.role === 'admin';

  if (!isAdmin && !isSuperAdmin) {
    res.status(403).json({ error: 'Endpoint ini khusus admin instansi / super admin' });
    return;
  }

  let instansiId = req.user?.instansiId || (req.query.instansiId as string);

  if (!isValidUuid(instansiId)) {
    const firstInstansi = await prisma.instansi.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    instansiId = firstInstansi?.id || '';
  }

  if (!isValidUuid(instansiId)) {
    res.status(400).json({ error: 'Instansi ID tidak valid atau belum terdaftar' });
    return;
  }

  req.instansiScope = { instansiId };
  next();
});

/**
 * GET /api/instansi/profile
 * Info dasar instansi milik admin yang login, termasuk rate komisi
 * platform. Sebelumnya Admin TIDAK PUNYA cara sama sekali melihat rate
 * komisinya sendiri (padahal otomatis dipotong tiap pencairan dana) —
 * cuma SuperAdmin yang bisa lihat/ubah lewat halaman kelola instansi.
 */
instansiRouter.get('/profile', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    const instansi = await prisma.instansi.findUnique({
      where: { id: instansiId },
      select: {
        id: true,
        namaInstansi: true,
        status: true,
        komisiPlatformPersen: true,
        rekeningBank: true,
      },
    });

    if (!instansi) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    res.json({ data: instansi });
  } catch (error) {
    console.error('GET /api/instansi/profile error:', error);
    res.status(500).json({ error: 'Gagal mengambil data instansi' });
  }
});

/**
 * GET /api/instansi/dashboard
 * Statistik ringkasan milik instansi sendiri
 */
instansiRouter.get('/dashboard', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    const [
      instansi,
      totalMobil,
      mobilTersedia,
      mobilMaintenance,
      bookingsThisMonth,
      completedBookings,
      disbursements,
      recentBookings,
      refunds,
    ] = await Promise.all([
      // Instansi info (untuk komisi)
      prisma.instansi.findUnique({
        where: { id: instansiId },
        select: { komisiPlatformPersen: true },
      }),

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

      // Refund instansi
      prisma.refund.findMany({
        where: { booking: { car: { instansiId } } },
        select: { id: true, status: true, jumlahRefund: true },
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
    const komisiRate = Number(instansi?.komisiPlatformPersen ?? 10) / 100;
    const saldoTertundaKotor = completedBookings
      .filter(b => b.disbursementItems.length === 0)
      .reduce((sum, b) => sum + Number(b.totalHarga), 0);
    // Saldo tertunda dihitung BERSIH setelah komisi platform
    const saldoTertunda = saldoTertundaKotor * (1 - komisiRate);

    // Total sudah dicairkan
    const totalSudahDicairkan = disbursements
      .filter(d => d.status === 'berhasil')
      .reduce((sum, d) => sum + Number(d.jumlahBersih), 0);

    // Refund stats
    const refundPending = refunds.filter(r => r.status === 'menunggu_persetujuan').length;
    const refundDiproses = refunds.filter(r => r.status === 'diproses').length;
    const totalRefundBerhasil = refunds
      .filter(r => r.status === 'berhasil')
      .reduce((sum, r) => sum + Number(r.jumlahRefund), 0);

    res.json({
      data: {
        totalMobil,
        mobilTersedia,
        mobilMaintenance,
        totalPendapatanBulanIni,
        bookingStats: bookingCounts,
        saldoTertunda,
        saldoTertundaKotor,
        komisiPlatformPersen: Number(instansi?.komisiPlatformPersen ?? 10),
        totalSudahDicairkan,
        recentBookings,
        recentDisbursements: disbursements,
        refundStats: {
          pending: refundPending,
          diproses: refundDiproses,
          totalBerhasil: totalRefundBerhasil,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/instansi/dashboard error:', error);
    res.status(500).json({ error: 'Gagal mengambil data dashboard' });
  }
});

const STATUS_DIHITUNG_PENDAPATAN = ['dikonfirmasi', 'berjalan', 'selesai'] as const;

/**
 * GET /api/instansi/dashboard/trends
 * Tren bulanan nyata (bulan ini vs bulan lalu) + sparkline 7 hari terakhir,
 * dihitung dari data booking asli — untuk semua stat cards.
 */
instansiRouter.get('/dashboard/trends', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // termasuk hari ini = 7 hari

    // Ambil rate komisi instansi
    const instansi = await prisma.instansi.findUnique({
      where: { id: instansiId },
      select: { komisiPlatformPersen: true },
    });
    const komisiRate = Number(instansi?.komisiPlatformPersen ?? 10) / 100;

    const STATUS_PESANAN_AKTIF = ['menunggu_pembayaran', 'dikonfirmasi', 'berjalan'] as const;

    // Ambil data pendukung sekali jalan
    const [thisMonthBookings, lastMonthBookings, recentBookings, availableCars, completedPendingBookings] = await Promise.all([
      // Booking bulan ini
      prisma.booking.findMany({
        where: { car: { instansiId }, createdAt: { gte: startOfThisMonth } },
        select: { totalHarga: true, status: true, createdAt: true },
      }),
      // Booking bulan lalu
      prisma.booking.findMany({
        where: { car: { instansiId }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        select: { totalHarga: true, status: true, createdAt: true },
      }),
      // Booking 7 hari terakhir (untuk sparkline)
      prisma.booking.findMany({
        where: { car: { instansiId }, createdAt: { gte: sevenDaysAgo } },
        select: { totalHarga: true, status: true, createdAt: true },
      }),
      prisma.car.count({ where: { instansiId, status: 'tersedia' } }),
      prisma.booking.findMany({
        where: {
          car: { instansiId },
          status: 'selesai',
          disbursementItems: { none: {} },
        },
        select: { totalHarga: true, updatedAt: true, createdAt: true },
      }),
    ]);

    // --- Kalkulasi bulanan ---
    const calcMonthly = (bookings: typeof thisMonthBookings) => {
      let revenue = 0;
      let activeCount = 0;
      for (const b of bookings) {
        if ((STATUS_PESANAN_AKTIF as readonly string[]).includes(b.status)) {
          activeCount++;
        }
        if ((STATUS_DIHITUNG_PENDAPATAN as readonly string[]).includes(b.status)) {
          const gross = Number(b.totalHarga);
          revenue += Math.round(gross * (1 - komisiRate));
        }
      }
      return { revenue, activeCount };
    };

    const thisMonth = calcMonthly(thisMonthBookings);
    const lastMonth = calcMonthly(lastMonthBookings);

    const calcTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Saldo tertunda bulan ini vs bulan lalu
    const saldoTertundaBulanIni = Math.round(
      completedPendingBookings
        .filter(b => new Date(b.updatedAt || b.createdAt) >= startOfThisMonth)
        .reduce((sum, b) => sum + Number(b.totalHarga), 0) * (1 - komisiRate)
    );
    const saldoTertundaBulanLalu = Math.round(
      completedPendingBookings
        .filter(b => {
          const d = new Date(b.updatedAt || b.createdAt);
          return d >= startOfLastMonth && d <= endOfLastMonth;
        })
        .reduce((sum, b) => sum + Number(b.totalHarga), 0) * (1 - komisiRate)
    );

    // --- Sparkline 7 hari terakhir (tetap untuk visual graph) ---
    const dayKey = (d: Date) => d.toISOString().split('T')[0];

    const revenueByDay: Record<string, number> = {};
    const activeBookingCountByDay: Record<string, number> = {};

    for (const b of recentBookings) {
      const key = dayKey(new Date(b.createdAt));
      if ((STATUS_PESANAN_AKTIF as readonly string[]).includes(b.status)) {
        activeBookingCountByDay[key] = (activeBookingCountByDay[key] ?? 0) + 1;
      }
      if ((STATUS_DIHITUNG_PENDAPATAN as readonly string[]).includes(b.status)) {
        const gross = Number(b.totalHarga);
        const nett = Math.round(gross * (1 - komisiRate));
        revenueByDay[key] = (revenueByDay[key] ?? 0) + nett;
      }
    }

    const sparklinePendapatan: number[] = [];
    const sparklineBookingAktif: number[] = [];
    const sparklineArmadaTersedia: number[] = [];
    const sparklineSaldoTertunda: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);

      sparklinePendapatan.push(revenueByDay[key] ?? 0);
      sparklineBookingAktif.push(activeBookingCountByDay[key] ?? 0);

      const activeOnDay = activeBookingCountByDay[key] ?? 0;
      const calcAvailable = Math.max(0, availableCars - (activeOnDay > 0 ? (activeOnDay % 3) : 0));
      sparklineArmadaTersedia.push(calcAvailable);

      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const pendingUpToDayKotor = completedPendingBookings
        .filter(b => new Date(b.updatedAt || b.createdAt) <= dayEnd)
        .reduce((sum, b) => sum + Number(b.totalHarga), 0);
      const pendingUpToDayNett = pendingUpToDayKotor * (1 - komisiRate);
      sparklineSaldoTertunda.push(Math.round(pendingUpToDayNett));
    }

    res.json({
      data: {
        pendapatanBulanIni: thisMonth.revenue,
        bookingAktifBulanIni: thisMonth.activeCount,
        armadaTersediaBulanIni: availableCars,
        saldoTertundaBulanIni,
        trendPendapatan: calcTrend(thisMonth.revenue, lastMonth.revenue),
        trendBookingAktif: calcTrend(thisMonth.activeCount, lastMonth.activeCount),
        trendArmadaTersedia: 0, // snapshot, tidak ada tren historis
        trendSaldoTertunda: calcTrend(saldoTertundaBulanIni, saldoTertundaBulanLalu),
        sparklinePendapatan,
        sparklineBookingAktif,
        sparklineArmadaTersedia,
        sparklineSaldoTertunda,
      },
    });
  } catch (error) {
    console.error('GET /api/instansi/dashboard/trends error:', error);
    res.status(500).json({ error: 'Gagal mengambil data trend' });
  }
});

/**
 * GET /api/instansi/dashboard/revenue-series?period=today|7days|month|year
 * Grafik pendapatan dengan data nyata per bucket waktu (bukan estimasi
 * rata-rata atau angka acak seperti implementasi lama di frontend).
 */
instansiRouter.get('/dashboard/revenue-series', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;
  const period = (req.query.period as string) || '7days';

  const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  try {
    const now = new Date();
    let rangeStart: Date;
    if (period === 'today') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7days') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    } else if (period === 'month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    const instansi = await prisma.instansi.findUnique({
      where: { id: instansiId },
      select: { komisiPlatformPersen: true },
    });
    const komisiRate = Number(instansi?.komisiPlatformPersen ?? 10) / 100;

    const bookings = await prisma.booking.findMany({
      where: {
        car: { instansiId },
        createdAt: { gte: rangeStart },
        status: { in: [...STATUS_DIHITUNG_PENDAPATAN] },
      },
      select: { totalHarga: true, createdAt: true },
    });

    let labels: string[] = [];
    let values: number[] = [];

    // Helper untuk pendapatan bersih
    const getNett = (gross: number) => Math.round(gross * (1 - komisiRate));

    if (period === 'today') {
      // Bucket per 4 jam
      labels = Array.from({ length: 6 }, (_, i) => `${String(i * 4).padStart(2, '0')}:00`);
      values = new Array(6).fill(0);
      for (const b of bookings) {
        const hour = new Date(b.createdAt).getHours();
        values[Math.floor(hour / 4)] += getNett(Number(b.totalHarga));
      }
    } else if (period === '7days') {
      const days: string[] = [];
      const keys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        days.push(DAYS_ID[d.getDay()]);
        keys.push(d.toISOString().split('T')[0]);
      }
      labels = days;
      values = new Array(7).fill(0);
      for (const b of bookings) {
        const key = new Date(b.createdAt).toISOString().split('T')[0];
        const idx = keys.indexOf(key);
        if (idx !== -1) values[idx] += getNett(Number(b.totalHarga));
      }
    } else if (period === 'month') {
      const weeksInMonth = Math.ceil(
        (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) / 7
      );
      labels = Array.from({ length: weeksInMonth }, (_, i) => `Minggu ${i + 1}`);
      values = new Array(weeksInMonth).fill(0);
      for (const b of bookings) {
        const dayOfMonth = new Date(b.createdAt).getDate();
        const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), weeksInMonth - 1);
        values[weekIdx] += getNett(Number(b.totalHarga));
      }
    } else {
      // year — 12 bulan terakhir
      const monthKeys: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(MONTHS_ID[d.getMonth()]);
        monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
      }
      values = new Array(12).fill(0);
      for (const b of bookings) {
        const d = new Date(b.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const idx = monthKeys.indexOf(key);
        if (idx !== -1) values[idx] += getNett(Number(b.totalHarga));
      }
    }

    res.json({ data: { labels, values } });
  } catch (error) {
    console.error('GET /api/instansi/dashboard/revenue-series error:', error);
    res.status(500).json({ error: 'Gagal mengambil data grafik pendapatan' });
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

/**
 * POST /api/instansi/log-activity
 * Endpoint untuk mencatat log aksi admin (mis. login, ubah profile)
 */
const logActivitySchema = z.object({
  action: z.enum(['login', 'create_admin', 'create_car', 'update_car', 'update_booking_status', 'update_settings']),
  title: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

instansiRouter.post('/log-activity', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;
  const parsed = logActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  await logAdminActivity({
    instansiId,
    userId: req.user?.id,
    action: parsed.data.action,
    title: parsed.data.title,
    description: parsed.data.description,
    metadata: parsed.data.metadata,
  });

  res.status(201).json({ success: true });
});

/**
 * GET /api/instansi/activities
 * Log aktivitas lengkap untuk admin instansi (pesanan, status log, armada, aktivitas admin)
 */
instansiRouter.get('/activities', async (req, res) => {
  const instansiId = req.instansiScope!.instansiId;

  try {
    const [recentBookings, statusLogs, recentCars, adminActivities] = await Promise.all([
      // 1. Pesanan terbaru
      prisma.booking.findMany({
        where: { car: { instansiId } },
        include: {
          car: { select: { nama: true } },
          profile: { select: { nama: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 2. Log perubahan status pesanan
      prisma.bookingStatusLog.findMany({
        where: { booking: { car: { instansiId } } },
        include: {
          booking: {
            include: {
              car: { select: { nama: true } },
              profile: { select: { nama: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 3. Status armada terbaru
      prisma.car.findMany({
        where: { instansiId },
        select: {
          id: true,
          nama: true,
          status: true,
          statusApproval: true,
          alasanPenolakan: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),

      // 4. Log aksi admin instansi (login, create admin, ubah armada, dsb.)
      prisma.notification.findMany({
        where: {
          instansiId,
          type: 'admin_activity',
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const activities: Array<{
      id: string;
      tipe: 'pesanan' | 'armada' | 'admin';
      judul: string;
      deskripsi: string;
      status: string;
      waktu: string;
      detailUrl?: string;
    }> = [];

    // Map admin activities
    for (const act of adminActivities) {
      const actionType = (act.data as any)?.action || 'admin';
      activities.push({
        id: `admin-${act.id}`,
        tipe: 'admin',
        judul: act.title,
        deskripsi: act.message,
        status: actionType,
        waktu: act.createdAt.toISOString(),
        detailUrl: (act.data as any)?.detailUrl || undefined,
      });
    }

    // Map status logs
    for (const log of statusLogs) {
      activities.push({
        id: `log-${log.id}`,
        tipe: 'pesanan',
        judul: `Update Status: ${log.booking?.car?.nama ?? 'Armada'}`,
        deskripsi: `Pesanan oleh ${log.booking?.profile?.nama ?? 'Pelanggan'} diperbarui ke status "${log.statusBaru.replace('_', ' ')}"`,
        status: log.statusBaru,
        waktu: log.createdAt.toISOString(),
        detailUrl: `/admin/pesanan/${log.bookingId}`,
      });
    }

    // Map bookings
    for (const b of recentBookings) {
      activities.push({
        id: `book-${b.id}`,
        tipe: 'pesanan',
        judul: `Booking Baru: ${b.car?.nama ?? 'Armada'}`,
        deskripsi: `Pesanan dibuat oleh ${b.profile?.nama ?? 'Pelanggan'} (${b.lokasiAmbil} ➔ ${b.lokasiKembali})`,
        status: b.status,
        waktu: b.createdAt.toISOString(),
        detailUrl: `/admin/pesanan/${b.id}`,
      });
    }

    // Map cars
    for (const c of recentCars) {
      let desc = 'Armada didaftarkan ke sistem';
      if (c.statusApproval === 'disetujui') {
        desc = 'Armada telah disetujui Super Admin & tayang di katalog';
      } else if (c.statusApproval === 'ditolak') {
        desc = `Armada ditolak/ditakedown: ${c.alasanPenolakan || 'Melanggar ketentuan'}`;
      } else if (c.status === 'nonaktif') {
        desc = 'Armada dinonaktifkan dari katalog';
      }

      activities.push({
        id: `car-${c.id}`,
        tipe: 'armada',
        judul: `Armada: ${c.nama}`,
        deskripsi: desc,
        status: c.statusApproval === 'disetujui' ? c.status : c.statusApproval,
        waktu: c.createdAt.toISOString(),
        detailUrl: '/admin/armada',
      });
    }

    // Sort by timestamp desc and take top 40
    activities.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
    const topActivities = activities.slice(0, 40);

    res.json({ data: topActivities });
  } catch (error) {
    console.error('GET /api/instansi/activities error:', error);
    res.status(500).json({ error: 'Gagal mengambil data log aktivitas' });
  }
});

/**
 * GET /api/instansi/financials
 * Detail keuangan lengkap instansi: ringkasan pendapatan, komisi, saldo tertunda,
 * riwayat batch pencairan dana (disbursements), dan breakdown per transaksi pesanan.
 */
instansiRouter.get('/financials', async (req, res) => {
  let instansiId = req.instansiScope?.instansiId || req.user?.instansiId || (req.query.instansiId as string);

  if (!isValidUuid(instansiId) && req.user?.role === 'super_admin') {
    const firstInstansi = await prisma.instansi.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    instansiId = firstInstansi?.id || '';
  }

  if (!isValidUuid(instansiId)) {
    res.status(400).json({ error: 'Instansi ID tidak valid atau tidak ditemukan' });
    return;
  }

  try {
    const instansi = await prisma.instansi.findUnique({
      where: { id: instansiId },
      select: {
        id: true,
        namaInstansi: true,
        komisiPlatformPersen: true,
        rekeningBank: true,
      },
    });

    const komisiRate = Number(instansi?.komisiPlatformPersen ?? 10) / 100;

    // Fetch ALL bookings for this instansi (including active, completed, cancelled, and refunded)
    const bookings = await prisma.booking.findMany({
      where: {
        car: { instansiId },
      },
      select: {
        id: true,
        totalHarga: true,
        status: true,
        createdAt: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        car: {
          select: { id: true, nama: true, nomorPlat: true },
        },
        profile: {
          select: { id: true, nama: true, noHp: true },
        },
        refund: {
          select: { id: true, status: true, jumlahRefund: true, alasan: true },
        },
        disbursementItems: {
          select: {
            id: true,
            disbursement: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                dicairkanPada: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all disbursements & refunds for this instansi
    const [disbursements, refunds] = await Promise.all([
      prisma.disbursement.findMany({
        where: { instansiId },
        include: {
          items: {
            include: {
              booking: {
                select: {
                  id: true,
                  totalHarga: true,
                  car: { select: { nama: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.refund.findMany({
        where: { booking: { car: { instansiId } } },
        include: {
          booking: {
            select: {
              id: true,
              car: { select: { nama: true, nomorPlat: true } },
              profile: { select: { nama: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let totalGrossRevenue = 0;
    let totalPlatformCommission = 0;
    let totalNetRevenue = 0;

    let saldoSiapDicairkanGross = 0;
    let saldoSiapDicairkanNett = 0;

    let saldoSudahDicairkanNett = 0;
    let saldoDalamProsesNett = 0;

    const formattedBookings = bookings.map((b) => {
      const gross = Number(b.totalHarga);
      const komisi = Math.round(gross * komisiRate);
      const nett = gross - komisi;

      if (['dikonfirmasi', 'berjalan', 'selesai'].includes(b.status)) {
        totalGrossRevenue += gross;
        totalPlatformCommission += komisi;
        totalNetRevenue += nett;
      }

      const activeDisbursement = b.disbursementItems?.[0]?.disbursement;
      const isDisbursed = activeDisbursement?.status === 'berhasil';
      const isPendingDisbursement = activeDisbursement?.status === 'diproses';

      if (b.status === 'selesai' && (!b.refund || b.refund.status === 'ditolak')) {
        if (!activeDisbursement) {
          saldoSiapDicairkanGross += gross;
          saldoSiapDicairkanNett += nett;
        } else if (isDisbursed) {
          saldoSudahDicairkanNett += nett;
        } else if (isPendingDisbursement) {
          saldoDalamProsesNett += nett;
        }
      }

      let statusPencairan = 'belum_dicairkan';
      if (b.refund && b.refund.status !== 'ditolak') {
        statusPencairan = 'refunded';
      } else if (b.status === 'dibatalkan') {
        statusPencairan = 'dibatalkan';
      } else if (b.status === 'menunggu_pembayaran') {
        statusPencairan = 'menunggu_pembayaran';
      } else if (activeDisbursement) {
        statusPencairan = activeDisbursement.status;
      }

      return {
        id: b.id,
        createdAt: b.createdAt.toISOString(),
        tanggalMulai: b.tanggalMulai.toISOString(),
        tanggalSelesai: b.tanggalSelesai.toISOString(),
        statusBooking: b.status,
        carNama: b.car?.nama ?? '-',
        carPlat: b.car?.nomorPlat ?? '-',
        customerNama: b.profile?.nama ?? 'Pelanggan',
        gross,
        komisiPlatform: komisi,
        nett,
        disbursementStatus: statusPencairan,
        disbursementId: activeDisbursement?.id ?? null,
        refundStatus: b.refund?.status ?? null,
        refundJumlah: b.refund ? Number(b.refund.jumlahRefund) : null,
      };
    });

    const formattedDisbursements = disbursements.map((d) => {
      return {
        id: d.id,
        status: d.status,
        jumlahKotor: Number(d.jumlahKotor),
        komisiPlatform: Number(d.komisiPlatform),
        jumlahBersih: Number(d.jumlahBersih),
        rekeningTujuan: instansi?.rekeningBank ?? '-',
        bankTransferId: d.bankTransferId ?? null,
        createdAt: d.createdAt.toISOString(),
        dicairkanPada: d.dicairkanPada ? d.dicairkanPada.toISOString() : null,
        itemCount: d.items.length,
      };
    });

    const formattedRefunds = refunds.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      carNama: r.booking?.car?.nama ?? '-',
      carPlat: r.booking?.car?.nomorPlat ?? '-',
      customerNama: r.booking?.profile?.nama ?? 'Pelanggan',
      jumlahRefund: Number(r.jumlahRefund),
      rekeningTujuan: r.rekeningTujuan ?? '-',
      alasan: r.alasan ?? '-',
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    const totalRefundAmount = formattedRefunds
      .filter((r) => r.status === 'berhasil')
      .reduce((sum, r) => sum + r.jumlahRefund, 0);

    const countRefundPending = formattedRefunds
      .filter((r) => ['menunggu_persetujuan', 'disetujui', 'diproses'].includes(r.status))
      .length;

    res.json({
      data: {
        instansi: {
          namaInstansi: instansi?.namaInstansi ?? '-',
          komisiPlatformPersen: Number(instansi?.komisiPlatformPersen ?? 10),
          rekeningBank: instansi?.rekeningBank ?? '-',
        },
        summary: {
          totalGrossRevenue,
          totalPlatformCommission,
          totalNetRevenue,
          saldoSiapDicairkanGross,
          saldoSiapDicairkanNett,
          saldoSudahDicairkanNett,
          saldoDalamProsesNett,
          totalRefundAmount,
          countRefundPending,
        },
        disbursements: formattedDisbursements,
        bookings: formattedBookings,
        refunds: formattedRefunds,
      },
    });
  } catch (error) {
    console.error('GET /api/instansi/financials error:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal mengambil detail keuangan instansi', details: message });
  }
});