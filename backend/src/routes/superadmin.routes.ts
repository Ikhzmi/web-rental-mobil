import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { komisiUntukBooking } from '../services/commission.service';
import { endOfWibMonth, startOfWibDay, startOfWibMonth, wibDayKey } from '../lib/wib';
import { verifySupabaseToken, requireSuperAdmin } from '../middleware/verifySupabaseToken';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { notifyInstansi } from '../services/notification.service';

export const superadminRouter = Router();

// Semua endpoint Super Admin wajib verifikasi token + role super_admin
superadminRouter.use(verifySupabaseToken, requireSuperAdmin);

// ============================================================================
// SCHEMAS
// ============================================================================

const verifyInstansiSchema = z.object({
  action: z.enum(['approve', 'reject']),
  alasan: z.string().optional(),
});

const updateInstansiStatusSchema = z.object({
  aktif: z.boolean(),
});

const toggleUserStatusSchema = z.object({
  aktif: z.boolean(),
});

const approveCarSchema = z.object({
  action: z.enum(['approve', 'reject']),
  alasan: z.string().optional(),
});

const takedownCarSchema = z.object({
  alasan: z.string().min(3, 'Alasan minimal 3 karakter'),
});

const createAdminSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  noHp: z.string().min(10, 'No HP minimal 10 digit'),
  instansiId: z.string().min(1, 'Pilih instansi terlebih dahulu'),
});

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/superadmin/dashboard
 * Statistik lintas-instansi untuk dashboard Super Admin
 */
superadminRouter.get('/dashboard', async (_req, res) => {
  try {
    const [
      totalInstansiAktif,
      totalInstansiMenunggu,
      totalUsers,
      totalMobil,
      mobilMenungguApproval,
      bookings,
      instansiList,
      refundBerhasil,
      refundPending,
    ] = await Promise.all([
      // Jumlah instansi aktif
      prisma.instansi.count({ where: { status: 'aktif' } }),

      // Jumlah instansi menunggu verifikasi
      prisma.instansi.count({ where: { status: 'menunggu_verifikasi' } }),

      // Total users (kecuali super_admin)
      prisma.profile.count({ where: { role: { not: 'super_admin' } } }),

      // Total mobil
      prisma.car.count(),

      // Mobil waiting approval
      prisma.car.count({ where: { statusApproval: 'menunggu_persetujuan' } }),

      // Booking stats - hanya yang sudah dibayar (tidak menunggu_pembayaran)
      prisma.booking.findMany({
        select: {
          status: true,
          totalHarga: true,
          komisiPersenSnapshot: true,
          car: { select: { instansiId: true } },
        },
      }),

      // Instansi rate komisi masing-masing
      prisma.instansi.findMany({
        where: { status: 'aktif' },
        select: { id: true, komisiPlatformPersen: true },
      }),

      // Refund summary
      prisma.refund.aggregate({
        where: { status: 'berhasil' },
        _sum: { jumlahRefund: true },
        _count: { id: true },
      }),
      prisma.refund.aggregate({
        where: { status: { in: ['menunggu_persetujuan', 'disetujui', 'diproses'] } },
        _sum: { jumlahRefund: true },
        _count: { id: true },
      }),
    ]);

    // Map rate komisi per instansi
    const rateMap = new Map(instansiList.map((i) => [i.id, Number(i.komisiPlatformPersen)]));

    // Status yang dihitung sebagai pendapatan (sudah ada pembayaran)
    const STATUS_DIHITUNG_PENDAPATAN = ['dikonfirmasi', 'berjalan', 'selesai'];

    // Hitung total pendapatan dan total komisi dinamis per instansi
    let totalPendapatan = 0;
    let totalKomisi = 0;
    const bookingCounts: Record<string, number> = {};

    for (const booking of bookings) {
      if (!bookingCounts[booking.status]) {
        bookingCounts[booking.status] = 0;
      }
      bookingCounts[booking.status]++;

      // Hanya tambahkan ke pendapatan jika statusnya sudah dikonfirmasi/berjalan/selesai
      if (STATUS_DIHITUNG_PENDAPATAN.includes(booking.status)) {
        const harga = Number(booking.totalHarga);
        totalPendapatan += harga;
        // Pakai snapshot rate saat booking dibuat (fallback rate live)
        totalKomisi += komisiUntukBooking(harga, booking.komisiPersenSnapshot, booking.car.instansiId, rateMap);
      }
    }

    res.json({
      data: {
        totalInstansiAktif,
        totalInstansiMenunggu,
        totalUsers,
        totalMobil,
        mobilMenungguApproval,
        totalPendapatanPlatform: totalPendapatan,
        totalKomisiTerkumpul: Math.round(totalKomisi),
        bookingStats: bookingCounts,
        refundStats: {
          totalBerhasil: Number(refundBerhasil._sum.jumlahRefund ?? 0),
          countBerhasil: refundBerhasil._count.id,
          totalPending: Number(refundPending._sum.jumlahRefund ?? 0),
          countPending: refundPending._count.id,
        },
      },
    });
  } catch (error) {
    console.error('Super Admin Dashboard error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Gagal mengambil data dashboard', details: message });
  }
});

/**
 * GET /api/superadmin/dashboard/trends
 * Trend dan sparkline data untuk statistik dashboard
 */
superadminRouter.get('/dashboard/trends', async (_req, res) => {
  try {
    const now = new Date();
    // Batas bulan memakai WIB (lib/wib.ts), bukan timezone server.
    const startOfThisMonth = startOfWibMonth(now, 0);
    const startOfLastMonth = startOfWibMonth(now, -1);
    const endOfLastMonth = endOfWibMonth(now, -1);
    // Jendela 8 hari terakhir untuk sparkline harian (data nyata)
    const startOfWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);

    // Data bulan ini
    const [
      thisMonthInstansi,
      thisMonthUsers,
      thisMonthArmada,
      thisMonthBookings,
      lastMonthInstansi,
      lastMonthUsers,
      lastMonthArmada,
      lastMonthBookings,
      instansiRates,
      recentInstansi,
      recentUsers,
      recentCars,
      recentBookings,
    ] = await Promise.all([
      // Instansi bulan ini
      prisma.instansi.count({
        where: { status: 'aktif', createdAt: { gte: startOfThisMonth } },
      }),
      // Users bulan ini
      prisma.profile.count({
        where: { role: { not: 'super_admin' }, createdAt: { gte: startOfThisMonth } },
      }),
      // Armada bulan ini
      prisma.car.count({
        where: { statusApproval: 'disetujui', createdAt: { gte: startOfThisMonth } },
      }),
      // Bookings bulan ini (untuk komisi - hanya yang sudah dibayar)
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfThisMonth },
          status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
        },
        select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
      // Instansi bulan lalu
      prisma.instansi.count({
        where: {
          status: 'aktif',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Users bulan lalu
      prisma.profile.count({
        where: {
          role: { not: 'super_admin' },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Armada bulan lalu
      prisma.car.count({
        where: {
          statusApproval: 'disetujui',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Bookings bulan lalu (untuk komisi - hanya yang sudah dibayar)
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
        },
        select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
      // Instansi rates
      prisma.instansi.findMany({
        where: { status: 'aktif' },
        select: { id: true, komisiPlatformPersen: true },
      }),
      // Data mentah 8 hari terakhir untuk sparkline harian (nyata)
      prisma.instansi.findMany({
        where: { createdAt: { gte: startOfWindow } },
        select: { createdAt: true },
      }),
      prisma.profile.findMany({
        where: { role: { not: 'super_admin' }, createdAt: { gte: startOfWindow } },
        select: { createdAt: true },
      }),
      prisma.car.findMany({
        where: { statusApproval: 'disetujui', createdAt: { gte: startOfWindow } },
        select: { createdAt: true },
      }),
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfWindow },
          status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
        },
        select: { createdAt: true, totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
    ]);

    // Hitung total komisi dinamis per-instansi (pakai snapshot booking)
    const rateMap = new Map(instansiRates.map((i) => [i.id, Number(i.komisiPlatformPersen)]));
    const thisMonthCommission = thisMonthBookings.reduce((sum, b) =>
      sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateMap), 0);
    const lastMonthCommission = lastMonthBookings.reduce((sum, b) =>
      sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateMap), 0);

    // Hitung trend percentage
    const calcTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const trendInstansi = calcTrend(thisMonthInstansi, lastMonthInstansi);
    const trendUsers = calcTrend(thisMonthUsers, lastMonthUsers);
    const trendArmada = calcTrend(thisMonthArmada, lastMonthArmada);
    const trendKomisi = calcTrend(Math.round(thisMonthCommission), Math.round(lastMonthCommission));

    // Sparkline harian 8 titik TERAKHIR dari data nyata (bukan acak):
    // jumlah baru per hari untuk instansi/users/armada, dan komisi per hari
    // untuk komisi. Kunci hari memakai WIB. Titik yang sepi memang 0.
    const todayStart = startOfWibDay(now);
    const dayKeys: string[] = [];
    for (let i = 7; i >= 0; i--) {
      dayKeys.push(wibDayKey(new Date(todayStart.getTime() - i * 24 * 3600 * 1000)));
    }
    const dayKeyOf = (d: Date) => wibDayKey(d);
    const bucketCount = (rows: { createdAt: Date }[]): number[] =>
      dayKeys.map((k) => rows.filter((r) => dayKeyOf(new Date(r.createdAt)) === k).length);
    const bucketCommission = (rows: { createdAt: Date; totalHarga: { toString(): string }; komisiPersenSnapshot: { toString(): string } | null; car: { instansiId: string } }[]): number[] =>
      dayKeys.map((k) =>
        Math.round(
          rows
            .filter((r) => dayKeyOf(new Date(r.createdAt)) === k)
            .reduce((sum, b) => sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateMap), 0)
        )
      );

    const sparklineInstansi = bucketCount(recentInstansi);
    const sparklineUsers = bucketCount(recentUsers);
    const sparklineArmada = bucketCount(recentCars);
    const sparklineKomisi = bucketCommission(recentBookings);

    res.json({
      data: {
        trendInstansi,
        trendUsers,
        trendArmada,
        trendKomisi,
        sparklineInstansi,
        sparklineUsers,
        sparklineArmada,
        sparklineKomisi,
      },
    });
  } catch (error) {
    console.error('Dashboard Trends error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Gagal mengambil data trend', details: message });
  }
});

// ============================================================================
// INSTANSI MANAGEMENT
// ============================================================================

/**
 * GET /api/superadmin/instansi
 * List semua instansi dengan filter
 */
superadminRouter.get('/instansi', async (req, res) => {
  const { status, cari } = req.query;

  try {
    // Super Admin adalah role tertinggi — tidak ada instansi berstatus pending/menunggu
    await prisma.instansi.updateMany({
      where: { status: 'menunggu_verifikasi' },
      data: { status: 'aktif' },
    });

    const instansi = await prisma.instansi.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(cari && {
          OR: [
            { namaInstansi: { contains: String(cari), mode: 'insensitive' } },
            { alamat: { contains: String(cari), mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        _count: {
          select: {
            cars: true,
            profiles: { where: { role: 'admin' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: instansi });
  } catch (error) {
    console.error('List Instansi error:', error);
    res.status(500).json({ error: 'Gagal mengambil data instansi' });
  }
});

/**
 * GET /api/superadmin/instansi/:id
 * Detail satu instansi
 */
superadminRouter.get('/instansi/:id', async (req, res) => {
  try {
    const instansi = await prisma.instansi.findUnique({
      where: { id: req.params.id },
      include: {
        cars: {
          include: {
            _count: { select: { bookings: true } },
          },
        },
        profiles: { where: { role: 'admin' } },
        _count: {
          select: {
            cars: true,
            profiles: { where: { role: 'admin' } },
          },
        },
      },
    });

    if (!instansi) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    res.json({ data: instansi });
  } catch (error) {
    console.error('Detail Instansi error:', error);
    res.status(500).json({ error: 'Gagal mengambil detail instansi' });
  }
});

/**
 * PATCH /api/superadmin/instansi/:id/verifikasi
 * Approve atau reject pendaftaran instansi
 */
superadminRouter.patch('/instansi/:id/verifikasi', async (req, res) => {
  const parsed = verifyInstansiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const { action, alasan } = parsed.data;

  try {
    const instansi = await prisma.instansi.findUnique({ where: { id: req.params.id } });
    if (!instansi) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    if (instansi.status !== 'menunggu_verifikasi') {
      res.status(400).json({ error: 'Instansi sudah pernah diproses' });
      return;
    }

    const updated = await prisma.instansi.update({
      where: { id: req.params.id },
      data: {
        status: action === 'approve' ? 'aktif' : 'nonaktif',
      },
    });

    if (action === 'approve') {
      void notifyInstansi(instansi.id, {
        type: 'approval',
        title: 'Akun Instansi Diverifikasi!',
        message: 'Selamat! Instansi Anda telah diverifikasi dan aktif. Anda sekarang dapat mendaftarkan armada mobil.',
        data: { actionUrl: '/admin/armada' },
      });
    } else {
      void notifyInstansi(instansi.id, {
        type: 'approval',
        title: 'Pendaftaran Instansi Ditolak',
        message: `Pendaftaran instansi Anda belum dapat disetujui.${alasan ? ' Alasan: ' + alasan : ''}`,
        data: { actionUrl: '/admin/settings' },
      });
    }

    res.json({
      data: updated,
      message: action === 'approve'
        ? 'Instansi berhasil disetujui'
        : 'Instansi ditolak',
    });
  } catch (error) {
    console.error('Verify Instansi error:', error);
    res.status(500).json({ error: 'Gagal memproses verifikasi instansi' });
  }
});

/**
 * PATCH /api/superadmin/instansi/:id/status
 * Aktifkan atau nonaktifkan instansi
 */
superadminRouter.patch('/instansi/:id/status', async (req, res) => {
  const parsed = updateInstansiStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  try {
    const updated = await prisma.instansi.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.aktif ? 'aktif' : 'nonaktif',
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update Instansi Status error:', error);
    res.status(500).json({ error: 'Gagal mengupdate status instansi' });
  }
});

/**
 * POST /api/superadmin/instansi
 * Buat instansi baru
 */
const createInstansiSchema = z.object({
  namaInstansi: z.string().min(2, 'Nama instansi minimal 2 karakter'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  noHpPic: z.string().min(10, 'No HP minimal 10 digit'),
  emailPic: z.string().email('Email tidak valid'),
  rekeningBank: z.string().optional(),
  npwp: z.string().optional(),
  komisiPlatformPersen: z.number().min(0).max(100).default(10),
});

superadminRouter.post('/instansi', async (req, res) => {
  const parsed = createInstansiSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message ?? 'Data tidak valid';
    res.status(400).json({ error: message });
    return;
  }

  try {
    const instansi = await prisma.instansi.create({
      data: {
        namaInstansi: parsed.data.namaInstansi,
        alamat: parsed.data.alamat,
        noHpPic: parsed.data.noHpPic,
        emailPic: parsed.data.emailPic,
        rekeningBank: parsed.data.rekeningBank,
        npwp: parsed.data.npwp,
        komisiPlatformPersen: parsed.data.komisiPlatformPersen,
        status: 'aktif',
      },
    });

    res.status(201).json({ data: instansi });
  } catch (error) {
    console.error('Create Instansi error:', error);
    res.status(500).json({ error: 'Gagal membuat instansi' });
  }
});

/**
 * PUT /api/superadmin/instansi/:id
 * Update data instansi
 */
const updateInstansiSchema = z.object({
  namaInstansi: z.string().min(2).optional(),
  alamat: z.string().min(5).optional(),
  noHpPic: z.string().min(10).optional(),
  emailPic: z.string().email().optional(),
  rekeningBank: z.string().nullable().optional(),
  npwp: z.string().nullable().optional(),
  komisiPlatformPersen: z.number().min(0).max(100).optional(),
});

superadminRouter.put('/instansi/:id', async (req, res) => {
  const parsed = updateInstansiSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message ?? 'Data tidak valid';
    res.status(400).json({ error: message });
    return;
  }

  try {
    const existing = await prisma.instansi.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    const updated = await prisma.instansi.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.namaInstansi && { namaInstansi: parsed.data.namaInstansi }),
        ...(parsed.data.alamat && { alamat: parsed.data.alamat }),
        ...(parsed.data.noHpPic && { noHpPic: parsed.data.noHpPic }),
        ...(parsed.data.emailPic && { emailPic: parsed.data.emailPic }),
        ...(parsed.data.rekeningBank !== undefined && { rekeningBank: parsed.data.rekeningBank }),
        ...(parsed.data.npwp !== undefined && { npwp: parsed.data.npwp }),
        ...(parsed.data.komisiPlatformPersen && { komisiPlatformPersen: parsed.data.komisiPlatformPersen }),
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update Instansi error:', error);
    res.status(500).json({ error: 'Gagal mengupdate instansi' });
  }
});

/**
 * DELETE /api/superadmin/instansi/:id
 * Hapus instansi
 */
superadminRouter.delete('/instansi/:id', async (req, res) => {
  try {
    const existing = await prisma.instansi.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { cars: true, profiles: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    if (existing._count.cars > 0 || existing._count.profiles > 0) {
      res.status(400).json({
        error: 'Tidak bisa hapus instansi yang masih memiliki data',
        detail: `${existing._count.cars} mobil, ${existing._count.profiles} profile terkait`,
      });
      return;
    }

    await prisma.instansi.delete({ where: { id: req.params.id } });

    res.json({ message: 'Instansi berhasil dihapus' });
  } catch (error) {
    console.error('Delete Instansi error:', error);
    res.status(500).json({ error: 'Gagal menghapus instansi' });
  }
});

// ============================================================================
// ADMIN MANAGEMENT
// ============================================================================

/**
 * POST /api/superadmin/admin
 * Membuat akun admin baru untuk instansi tertentu
 */
superadminRouter.post('/admin', async (req, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message ?? parsed.error.message ?? 'Validation error';
    res.status(400).json({ error: message });
    return;
  }

  const { email, password, nama, noHp, instansiId } = parsed.data;

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Validasi instansi exists
    const instansi = await prisma.instansi.findUnique({ where: { id: instansiId } });
    if (!instansi) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    // Check email belum terdaftar di DB lokal
    const existingProfile = await prisma.profile.findUnique({ where: { email } });
    if (existingProfile) {
      res.status(409).json({ error: 'Email sudah terdaftar' });
      return;
    }

    // Cek apakah email sudah ada di Supabase Auth (dari percobaan sebelumnya yang gagal)
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find((u) => u.email === email);

    let authUserId: string;

    if (existingAuthUser) {
      // User sudah ada di Supabase Auth tapi belum punya profile lokal — gunakan ID yang ada
      authUserId = existingAuthUser.id;
      // Update password jika diminta ulang
      await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
    } else {
      // Buat user baru via Supabase Auth Admin API
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nama, no_hp: noHp },
      });

      if (authError || !authUser.user) {
        console.error('Auth create error:', authError);
        res.status(400).json({ error: authError?.message ?? 'Gagal membuat user auth' });
        return;
      }

      authUserId = authUser.user.id;
    }

    // Buat atau update profile dengan role admin
    // Pakai upsert agar idempotent jika profile sudah pernah dibuat sebelumnya
    let profile;
    try {
      profile = await prisma.profile.upsert({
        where: { id: authUserId },
        create: {
          id: authUserId,
          email,
          nama,
          noHp,
          role: 'admin',
          instansiId,
          aktif: true,
        },
        update: {
          nama,
          noHp,
          role: 'admin',
          instansiId,
          aktif: true,
        },
      });
    } catch (profileError) {
      // Rollback: hapus auth user yang baru saja dibuat agar tidak jadi orphan
      if (!existingAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((e) =>
          console.error('Rollback delete auth user gagal:', e)
        );
      }
      throw profileError;
    }

    res.status(201).json({
      data: {
        id: profile.id,
        email: profile.email,
        nama: profile.nama,
        noHp: profile.noHp,
        role: profile.role,
        instansiId: profile.instansiId,
        aktif: profile.aktif,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Gagal membuat akun admin' });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/superadmin/pengguna
 * List semua user (customer + admin) dengan pagination
 */
superadminRouter.get('/pengguna', async (req, res) => {
  const { role, cari, page = '1', limit = '10' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  try {
    const where = {
      ...(role && role !== 'all' && { role: role as any }),
      ...(cari && {
        OR: [
          { nama: { contains: String(cari), mode: 'insensitive' as const } },
          { email: { contains: String(cari), mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        select: {
          id: true,
          nama: true,
          email: true,
          noHp: true,
          role: true,
          aktif: true,
          dokumenVerified: true,
          createdAt: true,
          instansi: {
            select: {
              id: true,
              namaInstansi: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.profile.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List Pengguna error:', error);
    res.status(500).json({ error: 'Gagal mengambil data pengguna' });
  }
});

/**
 * PATCH /api/superadmin/pengguna/:id/status
 * Toggle aktif/nonaktif user
 */
superadminRouter.patch('/pengguna/:id/status', async (req, res) => {
  const parsed = toggleUserStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  try {
    // Prevent self-deactivation
    if (req.user!.id === req.params.id) {
      res.status(400).json({ error: 'Tidak dapat mengubah status akun sendiri' });
      return;
    }

    const updated = await prisma.profile.update({
      where: { id: req.params.id },
      data: { aktif: parsed.data.aktif },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        aktif: true,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Toggle User Status error:', error);
    res.status(500).json({ error: 'Gagal mengupdate status pengguna' });
  }
});

// ============================================================================
// CAR APPROVAL
// ============================================================================

/**
 * GET /api/superadmin/armada/approval
 * List mobil yang menunggu persetujuan
 */
superadminRouter.get('/armada/approval', async (req, res) => {
  const { instansiId } = req.query;

  try {
    const cars = await prisma.car.findMany({
      where: {
        statusApproval: 'menunggu_persetujuan',
        ...(instansiId && { instansiId: String(instansiId) }),
      },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
          },
        },
        images: { orderBy: { urutan: 'asc' } },
      },
      orderBy: { createdAt: 'asc' }, // oldest first = FIFO
    });

    res.json({ data: cars });
  } catch (error) {
    console.error('List Approval Cars error:', error);
    res.status(500).json({ error: 'Gagal mengambil data antrian approval' });
  }
});

/**
 * PATCH /api/superadmin/armada/:id/approval
 * Approve atau reject mobil
 */
superadminRouter.patch('/armada/:id/approval', async (req, res) => {
  const parsed = approveCarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const { action, alasan } = parsed.data;

  try {
    const car = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!car) {
      res.status(404).json({ error: 'Mobil tidak ditemukan' });
      return;
    }

    if (car.statusApproval !== 'menunggu_persetujuan') {
      res.status(400).json({ error: 'Mobil sudah pernah diproses' });
      return;
    }

    const updated = await prisma.car.update({
      where: { id: req.params.id },
      data: {
        statusApproval: action === 'approve' ? 'disetujui' : 'ditolak',
        alasanPenolakan: action === 'reject' ? (alasan ?? null) : null,
        // Jika disetujui, auto-set status ke tersedia
        ...(action === 'approve' && { status: 'tersedia' }),
      },
    });

    if (action === 'approve') {
      void notifyInstansi(car.instansiId, {
        type: 'approval',
        title: 'Mobil Disetujui Super Admin',
        message: `Unit ${car.nama} (${car.nomorPlat ?? 'Tanpa Plat'}) telah disetujui dan kini tayang di katalog pencarian.`,
        data: { actionUrl: '/admin/armada', carId: car.id },
      });
    } else {
      void notifyInstansi(car.instansiId, {
        type: 'approval',
        title: 'Pengajuan Mobil Ditolak',
        message: `Pengajuan unit ${car.nama} ditolak.${alasan ? ' Alasan: ' + alasan : ''}`,
        data: { actionUrl: '/admin/armada', carId: car.id },
      });
    }

    res.json({
      data: updated,
      message: action === 'approve'
        ? 'Mobil berhasil disetujui dan siap tayang'
        : 'Mobil ditolak',
    });
  } catch (error) {
    console.error('Approve/Reject Car error:', error);
    res.status(500).json({ error: 'Gagal memproses approval mobil' });
  }
});

/**
 * GET /api/superadmin/armada/published
 * List mobil yang berstatus disetujui / aktif tayang
 */
superadminRouter.get('/armada/published', async (req, res) => {
  const { instansiId, search } = req.query;

  try {
    const cars = await prisma.car.findMany({
      where: {
        statusApproval: 'disetujui',
        ...(instansiId && { instansiId: String(instansiId) }),
        ...(search && {
          OR: [
            { nama: { contains: String(search), mode: 'insensitive' } },
            { instansi: { namaInstansi: { contains: String(search), mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
          },
        },
        images: { orderBy: { urutan: 'asc' } },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: cars });
  } catch (error) {
    console.error('List Published Cars error:', error);
    res.status(500).json({ error: 'Gagal mengambil data armada tayang' });
  }
});

/**
 * GET /api/superadmin/armada/takedown
 * List mobil yang berstatus ditolak / ditakedown
 */
superadminRouter.get('/armada/takedown', async (req, res) => {
  const { instansiId, search } = req.query;

  try {
    const cars = await prisma.car.findMany({
      where: {
        statusApproval: 'ditolak',
        ...(instansiId && { instansiId: String(instansiId) }),
        ...(search && {
          OR: [
            { nama: { contains: String(search), mode: 'insensitive' } },
            { instansi: { namaInstansi: { contains: String(search), mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
          },
        },
        images: { orderBy: { urutan: 'asc' } },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: cars });
  } catch (error) {
    console.error('List Takedown Cars error:', error);
    res.status(500).json({ error: 'Gagal mengambil data armada yang ditolak/takedown' });
  }
});

/**
 * PATCH /api/superadmin/armada/:id/takedown
 * Takedown mobil yang sedang tayang (ubah ke ditolak & nonaktif)
 */
superadminRouter.patch('/armada/:id/takedown', async (req, res) => {
  const parsed = takedownCarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const { alasan } = parsed.data;

  try {
    const car = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!car) {
      res.status(404).json({ error: 'Mobil tidak ditemukan' });
      return;
    }

    const updated = await prisma.car.update({
      where: { id: req.params.id },
      data: {
        statusApproval: 'ditolak',
        status: 'nonaktif',
        alasanPenolakan: alasan,
      },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
          },
        },
      },
    });

    res.json({
      data: updated,
      message: `Armada "${updated.nama}" berhasil ditakedown dari katalog`,
    });
  } catch (error) {
    console.error('Takedown Car error:', error);
    res.status(500).json({ error: 'Gagal mentakedown mobil' });
  }
});

/**
 * PATCH /api/superadmin/armada/:id/restore
 * Pulihkan mobil yang sebelumnya ditakedown/ditolak agar kembali tayang
 */
superadminRouter.patch('/armada/:id/restore', async (req, res) => {
  try {
    const car = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!car) {
      res.status(404).json({ error: 'Mobil tidak ditemukan' });
      return;
    }

    const updated = await prisma.car.update({
      where: { id: req.params.id },
      data: {
        statusApproval: 'disetujui',
        status: 'tersedia',
        alasanPenolakan: null,
      },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
          },
        },
      },
    });

    res.json({
      data: updated,
      message: `Armada "${updated.nama}" berhasil dipulihkan ke status aktif`,
    });
  } catch (error) {
    console.error('Restore Car error:', error);
    res.status(500).json({ error: 'Gagal memulihkan mobil' });
  }
});

// ============================================================================
// DISBURSEMENT MANAGEMENT
// ============================================================================

/**
 * GET /api/superadmin/disbursements
 * List semua disbursement lintas platform
 */
superadminRouter.get('/disbursements', async (req, res) => {
  const { instansiId, status, dari, sampai } = req.query;

  try {
    const disbursements = await prisma.disbursement.findMany({
      where: {
        ...(instansiId && { instansiId: String(instansiId) }),
        ...(status && { status: status as any }),
        ...((dari || sampai) && {
          createdAt: {
            ...(dari && { gte: new Date(String(dari)) }),
            ...(sampai && { lte: new Date(String(sampai)) }),
          },
        }),
      },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
          },
        },
        items: {
          select: {
            id: true,
            bookingId: true,
            jumlahKotor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: disbursements });
  } catch (error) {
    console.error('List Disbursements error:', error);
    res.status(500).json({ error: 'Gagal mengambil data pencairan' });
  }
});

/**
 * GET /api/superadmin/instansi-saldo
 * Saldo tertunda per instansi aktif — booking berstatus 'selesai' yang
 * belum masuk batch disbursement manapun. Dipakai untuk memilih instansi
 * saat membuat pencairan dana baru secara manual.
 */
superadminRouter.get('/instansi-saldo', async (_req, res) => {
  try {
    const instansiList = await prisma.instansi.findMany({
      where: { status: 'aktif' },
      select: { id: true, namaInstansi: true, rekeningBank: true, komisiPlatformPersen: true },
      orderBy: { namaInstansi: 'asc' },
    });

    const result = await Promise.all(
      instansiList.map(async (inst) => {
        const bookings = await prisma.booking.findMany({
          where: {
            car: { instansiId: inst.id },
            status: 'selesai',
            disbursementItems: { none: {} },
          },
          select: { id: true, totalHarga: true },
        });
        const saldoTertundaKotor = bookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);
        const komisiRate = Number(inst.komisiPlatformPersen) / 100;
        const saldoTertunda = Math.round(saldoTertundaKotor * (1 - komisiRate));
        return {
          id: inst.id,
          namaInstansi: inst.namaInstansi,
          rekeningBank: inst.rekeningBank,
          komisiPlatformPersen: Number(inst.komisiPlatformPersen),
          saldoTertunda,
          saldoTertundaKotor,
          jumlahBookingTertunda: bookings.length,
        };
      })
    );

    // Instansi dengan saldo tertunda ditampilkan lebih dulu
    result.sort((a, b) => b.saldoTertunda - a.saldoTertunda);

    res.json({ data: result });
  } catch (error) {
    console.error('GET /api/superadmin/instansi-saldo error:', error);
    res.status(500).json({ error: 'Gagal mengambil data saldo instansi' });
  }
});

const createDisbursementSchema = z.object({
  instansiId: z.string().uuid(),
  bankTransferId: z.string().trim().min(1).optional(),
});

/**
 * POST /api/superadmin/disbursements
 * Membuat batch pencairan dana MANUAL untuk satu instansi — mengambil
 * semua booking 'selesai' milik instansi tsb yang belum pernah masuk
 * disbursement lain, lalu membungkusnya jadi satu Disbursement baru
 * berstatus 'diproses'. Transfer bank dilakukan manual di luar sistem;
 * SuperAdmin menandai hasilnya lewat PATCH /disbursements/:id/status.
 */
superadminRouter.post('/disbursements', async (req, res) => {
  const parsed = createDisbursementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }
  const { instansiId, bankTransferId } = parsed.data;

  try {
    const instansi = await prisma.instansi.findUnique({ where: { id: instansiId } });
    if (!instansi) {
      res.status(404).json({ error: 'Instansi tidak ditemukan' });
      return;
    }

    const pendingBookings = await prisma.booking.findMany({
      where: {
        car: { instansiId },
        status: 'selesai',
        disbursementItems: { none: {} },
      },
      select: { id: true, totalHarga: true },
    });

    if (pendingBookings.length === 0) {
      res.status(400).json({ error: 'Tidak ada saldo tertunda untuk instansi ini' });
      return;
    }

    const jumlahKotor = pendingBookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);
    const komisiPersen = Number(instansi.komisiPlatformPersen);
    const komisiPlatform = Math.round(jumlahKotor * (komisiPersen / 100));
    const jumlahBersih = jumlahKotor - komisiPlatform;

    const disbursement = await prisma.$transaction(async (tx) => {
      const created = await tx.disbursement.create({
        data: {
          instansiId,
          jumlahKotor,
          komisiPlatform,
          jumlahBersih,
          status: 'diproses',
          bankTransferId: bankTransferId ?? null,
        },
      });
      await tx.disbursementItem.createMany({
        data: pendingBookings.map((b) => ({
          disbursementId: created.id,
          bookingId: b.id,
          jumlahKotor: b.totalHarga,
          // Snapshot rate yang dipakai batch ini (audit trail)
          komisiPersenSnapshot: komisiPersen,
        })),
      });
      return tx.disbursement.findUnique({
        where: { id: created.id },
        include: {
          instansi: { select: { id: true, namaInstansi: true } },
          items: { select: { id: true, bookingId: true, jumlahKotor: true } },
        },
      });
    });

    if (disbursement?.instansiId) {
      notifyInstansi(disbursement.instansiId, {
        type: 'disbursement',
        title: 'Pencairan Dana Diproses',
        message: `Pencairan dana sebesar Rp ${Number(disbursement.jumlahBersih).toLocaleString('id-ID')} sedang diproses.`,
        data: {
          actionUrl: '/admin/keuangan',
          disbursementId: disbursement.id,
        },
      }).catch(() => {/* fire-and-forget */});
    }

    res.status(201).json({ data: disbursement });
  } catch (error) {
    console.error('POST /api/superadmin/disbursements error:', error);
    res.status(500).json({ error: 'Gagal membuat pencairan dana' });
  }
});

const updateDisbursementStatusSchema = z.object({
  status: z.enum(['berhasil', 'gagal']),
  bankTransferId: z.string().trim().min(1).optional(),
});

/**
 * PATCH /api/superadmin/disbursements/:id/status
 * Menandai hasil transfer manual. Hanya bisa dilakukan dari status
 * 'diproses'. Jika 'gagal', item batch DIHAPUS dalam transaksi yang sama
 * sehingga booking-bookingnya kembali menjadi saldo tertunda dan bisa
 * dipilih pada batch baru — sebelumnya item batch gagal dipertahankan
 * sementara query saldo memfilter `disbursementItems: none`, yang membuat
 * dana booking tersebut hilang dari semua laporan dan tak bisa dicairkan
 * ulang.
 */
superadminRouter.patch('/disbursements/:id/status', async (req, res) => {
  const parsed = updateDisbursementStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  try {
    const existing = await prisma.disbursement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Pencairan tidak ditemukan' });
      return;
    }
    if (existing.status !== 'diproses') {
      res.status(409).json({ error: `Pencairan ini sudah berstatus '${existing.status}', tidak bisa diubah lagi` });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.status === 'gagal') {
        // Lepaskan booking dari batch gagal agar bisa dicairkan ulang
        await tx.disbursementItem.deleteMany({
          where: { disbursementId: req.params.id },
        });
      }
      return tx.disbursement.update({
        where: { id: req.params.id },
        data: {
          status: parsed.data.status,
          ...(parsed.data.bankTransferId && { bankTransferId: parsed.data.bankTransferId }),
          ...(parsed.data.status === 'berhasil' && { dicairkanPada: new Date() }),
        },
        include: {
          instansi: { select: { id: true, namaInstansi: true } },
          items: { select: { id: true, bookingId: true, jumlahKotor: true } },
        },
      });
    });

    if (parsed.data.status === 'berhasil') {
      void notifyInstansi(updated.instansiId, {
        type: 'disbursement',
        title: 'Dana Berhasil Dicairkan!',
        message: `Pencairan dana sebesar Rp ${Number(updated.jumlahBersih).toLocaleString('id-ID')} telah berhasil ditransfer.${updated.bankTransferId ? ' (Ref: ' + updated.bankTransferId + ')' : ''}`,
        data: { actionUrl: '/admin/keuangan', disbursementId: updated.id },
      });
    } else if (parsed.data.status === 'gagal') {
      void notifyInstansi(updated.instansiId, {
        type: 'disbursement',
        title: 'Pencairan Dana Gagal',
        message: `Pencairan dana Rp ${Number(updated.jumlahBersih).toLocaleString('id-ID')} gagal diproses. Booking terkait kembali menjadi saldo tertunda dan bisa dicairkan ulang. Harap periksa nomor rekening instansi Anda.`,
        data: { actionUrl: '/admin/settings', disbursementId: updated.id },
      });
    }

    res.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/superadmin/disbursements/:id/status error:', error);
    res.status(500).json({ error: 'Gagal memperbarui status pencairan' });
  }
});

// ============================================================================
// DASHBOARD ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/superadmin/dashboard/analytics
 * Revenue and booking analytics with time period filter
 */
superadminRouter.get('/dashboard/analytics', async (req, res) => {
  const { period = '7d' } = req.query;

  const now = new Date();
  let startDate: Date;
  const isToday = period === 'today' || period === '1d';
  const isYear = period === 'year' || period === '1y' || period === '365d';

  if (isToday) {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (period === '7d' || period === '7days') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  } else if (period === 'month' || period === '30d') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
  } else if (isYear) {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0); // 1 Jan 00:00:00 tahun ini
  } else {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  }

  try {
    const [bookings, instansiList] = await Promise.all([
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['dikonfirmasi', 'berjalan', 'selesai'] },
        },
        select: {
          id: true,
          totalHarga: true,
          komisiPersenSnapshot: true,
          status: true,
          createdAt: true,
          car: { select: { instansiId: true } },
        },
      }),
      prisma.instansi.findMany({ select: { id: true, komisiPlatformPersen: true } }),
    ]);

    const rateMap = new Map(instansiList.map((i) => [i.id, Number(i.komisiPlatformPersen)]));
    const seriesMap: Record<string, { revenue: number; commission: number }> = {};

    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (isToday) {
      const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      for (const h of hours) {
        seriesMap[h] = { revenue: 0, commission: 0 };
      }

      for (const booking of bookings) {
        const h = booking.createdAt.getHours();
        let bucket = '00:00';
        if (h >= 21) bucket = '21:00';
        else if (h >= 18) bucket = '18:00';
        else if (h >= 15) bucket = '15:00';
        else if (h >= 12) bucket = '12:00';
        else if (h >= 9) bucket = '09:00';
        else if (h >= 6) bucket = '06:00';
        else if (h >= 3) bucket = '03:00';

        const harga = Number(booking.totalHarga);
        const komisi = komisiUntukBooking(harga, booking.komisiPersenSnapshot, booking.car.instansiId, rateMap);

        seriesMap[bucket].revenue += harga;
        seriesMap[bucket].commission += komisi;
      }
    } else if (isYear) {
      // Group by month for current year (Jan..Des)
      const currentYear = now.getFullYear();
      for (let m = 1; m <= 12; m++) {
        const monthStr = String(m).padStart(2, '0');
        seriesMap[`${currentYear}-${monthStr}`] = { revenue: 0, commission: 0 };
      }

      for (const booking of bookings) {
        const y = booking.createdAt.getFullYear();
        const m = String(booking.createdAt.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        if (seriesMap[key]) {
          const harga = Number(booking.totalHarga);
          const komisi = komisiUntukBooking(harga, booking.komisiPersenSnapshot, booking.car.instansiId, rateMap);

          seriesMap[key].revenue += harga;
          seriesMap[key].commission += komisi;
        }
      }
    } else {
      // Group by day for 7d or 30d
      const curr = new Date(startDate);
      curr.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      while (curr <= end) {
        seriesMap[toLocalDateStr(curr)] = { revenue: 0, commission: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      for (const booking of bookings) {
        const dateStr = toLocalDateStr(booking.createdAt);
        if (seriesMap[dateStr]) {
          const harga = Number(booking.totalHarga);
          const komisi = komisiUntukBooking(harga, booking.komisiPersenSnapshot, booking.car.instansiId, rateMap);

          seriesMap[dateStr].revenue += harga;
          seriesMap[dateStr].commission += komisi;
        }
      }
    }

    const revenueData = Object.entries(seriesMap).map(([date, val]) => ({
      date,
      revenue: Math.round(val.revenue),
      commission: Math.round(val.commission),
    }));

    const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const totalCommission = revenueData.reduce((sum, d) => sum + d.commission, 0);

    const bookingStatusCounts = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusLabels: Record<string, string> = {
      'menunggu_pembayaran': 'Menunggu Bayar',
      'dikonfirmasi': 'Dikonfirmasi',
      'berjalan': 'Berjalan',
      'selesai': 'Selesai',
      'dibatalkan': 'Dibatalkan',
    };

    const bookingStatusData = Object.entries(bookingStatusCounts).map(([status, count]) => ({
      status: statusLabels[status] || status,
      statusKey: status,
      count,
    }));

    res.json({
      data: {
        revenueData,
        totalRevenue,
        totalCommission,
        bookingStatusData,
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard Analytics error:', error);
    res.status(500).json({ error: 'Gagal mengambil data analytics' });
  }
});

/**
 * GET /api/superadmin/dashboard/activities
 * Recent activities derived from real platform data
 */
superadminRouter.get('/dashboard/activities', async (_req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch recent data from various sources
    const [
      adminActivitiesLogs,
      recentBookings,
      recentInstansi,
      recentCars,
      recentProfiles,
      recentPayments,
    ] = await Promise.all([
      // Admin activity logs logged across all instansi
      prisma.notification.findMany({
        where: { type: 'admin_activity', createdAt: { gte: thirtyDaysAgo } },
        include: { instansi: { select: { namaInstansi: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),

      // Recent bookings (last 30 days)
      prisma.booking.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: {
          profile: { select: { nama: true } },
          car: { select: { nama: true, instansi: { select: { namaInstansi: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent instansi registrations (last 30 days)
      prisma.instansi.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent car approvals (last 30 days)
      prisma.car.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          statusApproval: 'disetujui',
        },
        include: {
          instansi: { select: { namaInstansi: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent user registrations (last 30 days)
      prisma.profile.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          role: 'customer',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent payments (last 30 days)
      prisma.payment.findMany({
        where: { paidAt: { gte: thirtyDaysAgo } },
        include: {
          booking: {
            include: {
              car: { select: { nama: true, instansi: { select: { namaInstansi: true } } } },
              profile: { select: { nama: true } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: 5,
      }),
    ]);

    // Build activities array from real data
    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      createdAt: Date;
      instansiNama?: string;
    }> = [];

    // Add admin activity logs
    for (const log of adminActivitiesLogs) {
      activities.push({
        id: `admin-log-${log.id}`,
        type: 'admin_activity',
        title: log.title,
        description: log.message,
        createdAt: log.createdAt,
        instansiNama: log.instansi?.namaInstansi,
      });
    }

    // Add booking activities
    for (const booking of recentBookings) {
      const statusLabels: Record<string, string> = {
        menunggu_pembayaran: 'menunggu pembayaran',
        dikonfirmasi: 'dikonfirmasi',
        berjalan: 'sedang berjalan',
        selesai: 'selesai',
        dibatalkan: 'dibatalkan',
      };
      activities.push({
        id: `booking-${booking.id}`,
        type: booking.status === 'selesai' ? 'booking_completed' : 'booking_confirmed',
        title: `Booking ${booking.car.nama}`,
        description: `${booking.profile.nama} - ${statusLabels[booking.status] || booking.status}`,
        createdAt: booking.createdAt,
        instansiNama: booking.car.instansi.namaInstansi,
      });
    }

    // Add payment received activities
    for (const payment of recentPayments) {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment_received',
        title: `Pembayaran diterima`,
        description: `${payment.booking.car.nama} - Rp ${Number(payment.jumlah).toLocaleString('id-ID')}`,
        createdAt: payment.paidAt || payment.booking.createdAt,
        instansiNama: payment.booking.car.instansi.namaInstansi,
      });
    }

    // Add instansi registration activities
    for (const inst of recentInstansi) {
      activities.push({
        id: `instansi-${inst.id}`,
        type: 'instansi_registered',
        title: `Instansi baru terdaftar`,
        description: inst.namaInstansi,
        createdAt: inst.createdAt,
        instansiNama: inst.namaInstansi,
      });
    }

    // Add car approval activities
    for (const car of recentCars) {
      activities.push({
        id: `car-${car.id}`,
        type: 'vehicle_approved',
        title: `Kendaraan disetujui`,
        description: `${car.nama} - ${car.instansi.namaInstansi}`,
        createdAt: car.createdAt,
        instansiNama: car.instansi.namaInstansi,
      });
    }

    // Add user registration activities
    for (const profile of recentProfiles) {
      activities.push({
        id: `profile-${profile.id}`,
        type: 'customer_registered',
        title: `Pelanggan baru terdaftar`,
        description: profile.nama,
        createdAt: profile.createdAt,
      });
    }

    // Sort by createdAt descending and take top 15
    const sortedActivities = activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15)
      .map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
        instansiNama: a.instansiNama,
      }));

    res.json({ data: sortedActivities });
  } catch (error) {
    console.error('Dashboard Activities error:', error);
    res.status(500).json({ error: 'Gagal mengambil data aktivitas' });
  }
});

/**
 * GET /api/superadmin/dashboard/approvals
 * Pending approvals summary
 */
superadminRouter.get('/dashboard/approvals', async (_req, res) => {
  try {
    const [pendingInstansi, pendingVehicles] = await Promise.all([
      prisma.instansi.count({ where: { status: 'menunggu_verifikasi' } }),
      prisma.car.count({ where: { statusApproval: 'menunggu_persetujuan' } }),
    ]);

    // Count pending drivers (profiles with no SIM verified)
    const pendingDrivers = await prisma.profile.count({
      where: {
        role: 'customer',
        dokumenSimUrl: null,
      },
    });

    // Count pending payments using raw SQL with explicit casting to work around enum issues
    const pendingPaymentsResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM payments WHERE status::text = 'pending'
    `;
    const pendingPayments = Number(pendingPaymentsResult[0]?.count ?? 0);

    res.json({
      data: {
        rentalCompanies: pendingInstansi,
        vehicles: pendingVehicles,
        drivers: pendingDrivers,
        payments: pendingPayments,
        total: pendingInstansi + pendingVehicles + pendingDrivers + pendingPayments,
      },
    });
  } catch (error) {
    console.error('Dashboard Approvals error:', error);
    res.status(500).json({ error: 'Gagal mengambil data approval' });
  }
});

/**
 * GET /api/superadmin/dashboard/notifications
 * Notification list
 */
superadminRouter.get('/dashboard/notifications', async (req, res) => {
  const { unreadOnly } = req.query;
  const user = req.user!;

  try {
    const baseWhere = {
      OR: [
        { userId: user.id },
        { targetRole: Role.super_admin },
      ],
    };
    const where = unreadOnly === 'true' ? { ...baseWhere, isRead: false } : baseWhere;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        ...baseWhere,
        isRead: false,
      },
    });

    res.json({ data: notifications, unreadCount });
  } catch (error) {
    console.error('Dashboard Notifications error:', error);
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
});

/**
 * PATCH /api/superadmin/dashboard/notifications/:id/read
 * Mark notification as read
 */
superadminRouter.patch('/dashboard/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ data: notification });
  } catch (error) {
    console.error('Mark Notification Read error:', error);
    res.status(500).json({ error: 'Gagal mengupdate notifikasi' });
  }
});

/**
 * GET /api/superadmin/dashboard/top-companies
 * Top rental companies by revenue
 */
superadminRouter.get('/dashboard/top-companies', async (_req, res) => {
  try {
    // Get total revenue per instansi from bookings (hanya yang sudah dibayar)
    const bookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
        car: {
          instansi: { status: 'aktif' },
        },
      },
      select: {
        totalHarga: true,
        car: { select: { instansiId: true } },
      },
    });

    // Calculate revenue per instansi
    const revenueByInstansi: Record<string, number> = {};
    for (const booking of bookings) {
      const instId = booking.car?.instansiId;
      if (instId) {
        revenueByInstansi[instId] = (revenueByInstansi[instId] || 0) + Number(booking.totalHarga);
      }
    }

    // Get instansi details and combine
    const allInstansi = await prisma.instansi.findMany({
      where: { status: 'aktif' },
      select: {
        id: true,
        namaInstansi: true,
        createdAt: true,
      },
    });

    const topCompanies = allInstansi
      .map((inst) => ({
        id: inst.id,
        namaInstansi: inst.namaInstansi,
        totalRevenue: revenueByInstansi[inst.id] || 0,
        memberSince: inst.createdAt,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Calculate growth based on revenue comparison (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
      },
      select: {
        totalHarga: true,
        car: { select: { instansiId: true } },
      },
    });

    const previousBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
      },
      select: {
        totalHarga: true,
        car: { select: { instansiId: true } },
      },
    });

    const recentRevenueByInstansi: Record<string, number> = {};
    const previousRevenueByInstansi: Record<string, number> = {};

    for (const b of recentBookings) {
      const instId = b.car?.instansiId;
      if (instId) {
        recentRevenueByInstansi[instId] = (recentRevenueByInstansi[instId] || 0) + Number(b.totalHarga);
      }
    }
    for (const b of previousBookings) {
      const instId = b.car?.instansiId;
      if (instId) {
        previousRevenueByInstansi[instId] = (previousRevenueByInstansi[instId] || 0) + Number(b.totalHarga);
      }
    }

    const totalAllRevenue = Object.values(revenueByInstansi).reduce((sum, val) => sum + val, 0);

    const topCompaniesWithGrowth = topCompanies.map((company) => {
      const recent = recentRevenueByInstansi[company.id] || 0;
      const previous = previousRevenueByInstansi[company.id] || 0;
      let growth = 0;
      if (previous > 0) {
        growth = Math.round(((recent - previous) / previous) * 100);
      } else if (recent > 0) {
        growth = 100;
      }
      const percentageShare = totalAllRevenue > 0
        ? Math.round((company.totalRevenue / totalAllRevenue) * 1000) / 10
        : 0;

      return { ...company, growth, percentageShare };
    });

    res.json({ data: topCompaniesWithGrowth });
  } catch (error) {
    console.error('Dashboard Top Companies error:', error);
    res.status(500).json({ error: 'Gagal mengambil data perusahaan teratas' });
  }
});

/**
 * GET /api/superadmin/dashboard/popular-vehicles
 * Most booked vehicles
 */
superadminRouter.get('/dashboard/popular-vehicles', async (_req, res) => {
  try {
    const vehicles = await prisma.car.findMany({
      where: {
        statusApproval: 'disetujui',
        status: 'tersedia',
      },
      include: {
        images: { take: 1, orderBy: { urutan: 'asc' } },
        instansi: { select: { namaInstansi: true } },
        _count: {
          select: {
            bookings: {
              where: {
                status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
              },
            },
          },
        },
      },
      orderBy: {
        bookings: { _count: 'desc' },
      },
      take: 6,
    });

    const popularVehicles = vehicles.map((v) => ({
      id: v.id,
      nama: v.nama,
      kategori: v.kategori,
      thumbnail: v.images[0]?.url || null,
      bookingCount: v._count.bookings,
      available: v.status === 'tersedia',
      namaInstansi: v.instansi?.namaInstansi ?? null,
    }));

    res.json({ data: popularVehicles });
  } catch (error) {
    console.error('Dashboard Popular Vehicles error:', error);
    res.status(500).json({ error: 'Gagal mengambil data kendaraan populer' });
  }
});

/**
 * GET /api/superadmin/dashboard/commission
 * Monthly commission stats
 */
superadminRouter.get('/dashboard/commission', async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month bookings (hanya yang sudah dibayar)
    const currentMonthBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
      },
      select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
    });

    // Last month bookings (hanya yang sudah dibayar)
    const lastMonthBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
      },
      select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
    });

    // Rate komisi per instansi — JANGAN hardcode 10%: tiap instansi bisa
    // punya rate berbeda dan endpoint lain semuanya memakai rateMap.
    const instansiRates = await prisma.instansi.findMany({
      select: { id: true, komisiPlatformPersen: true },
    });
    const rateMap = new Map(instansiRates.map((i) => [i.id, Number(i.komisiPlatformPersen)]));

    const currentMonthRevenue = currentMonthBookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);
    const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);

    const calcCommission = (bookings: typeof currentMonthBookings) =>
      bookings.reduce((sum, b) =>
        sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateMap), 0);

    const commission = calcCommission(currentMonthBookings);
    const lastMonthCommission = calcCommission(lastMonthBookings);

    // Commission target based on last month performance (120% of last month)
    const targetCommission = lastMonthCommission * 1.2;
    const targetProgress = targetCommission > 0 ? Math.min(Math.round((commission / targetCommission) * 100), 100) : 0;

    res.json({
      data: {
        revenue: currentMonthRevenue,
        commission,
        lastMonthCommission,
        targetCommission,
        targetProgress,
        growth: lastMonthCommission > 0 ? Math.round(((commission - lastMonthCommission) / lastMonthCommission) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Dashboard Commission error:', error);
    res.status(500).json({ error: 'Gagal mengambil data komisi' });
  }
});

/**
 * GET /api/superadmin/dashboard/system-health
 * System health status - real data from database
 */
superadminRouter.get('/dashboard/system-health', async (_req, res) => {
  try {
    // 1. Host Server (Node.js Express)
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    let uptimeStr: string;
    if (uptimeDays > 0) {
      uptimeStr = `${uptimeDays}h ${uptimeHours}j`;
    } else if (uptimeHours > 0) {
      uptimeStr = `${uptimeHours}j ${uptimeMinutes}m`;
    } else {
      uptimeStr = `${uptimeMinutes}m`;
    }
    const memUsedMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    // 2. Supabase Database Ping (PostgreSQL via Prisma)
    let dbStatus = 'online';
    let dbLatency = '< 10ms';
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbMs = Date.now() - dbStart;
      dbLatency = `${dbMs}ms`;
      dbStatus = dbMs < 300 ? 'online' : dbMs < 800 ? 'warning' : 'offline';
    } catch {
      dbStatus = 'offline';
      dbLatency = 'Error Koneksi';
    }

    // 3. Supabase Storage & Auth Ping
    let storageStatus = 'online';
    let storageLatency = '< 50ms';
    const storageStart = Date.now();
    try {
      await supabaseAdmin.storage.listBuckets();
      const storageMs = Date.now() - storageStart;
      storageLatency = `${storageMs}ms`;
      storageStatus = storageMs < 600 ? 'online' : 'warning';
    } catch {
      storageStatus = 'offline';
      storageLatency = 'Error API';
    }

    // 4. Pakasir Payment Gateway Ping
    let pakasirStatus = 'online';
    let pakasirLatency = 'Terhubung';
    const pakasirStart = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const pakasirUrl = process.env.PAKASIR_BASE_URL || 'https://app.pakasir.com/api';
      await fetch(pakasirUrl, { method: 'HEAD', signal: controller.signal }).catch(() => {});
      clearTimeout(timeoutId);
      const pakasirMs = Date.now() - pakasirStart;
      pakasirLatency = `${pakasirMs}ms`;
      pakasirStatus = pakasirMs < 1500 ? 'online' : 'warning';
    } catch {
      pakasirStatus = 'online';
      pakasirLatency = 'Terhubung';
    }

    const isAnyOffline = dbStatus === 'offline' || storageStatus === 'offline';
    const isAnyWarning = dbStatus === 'warning' || storageStatus === 'warning' || pakasirStatus === 'warning';
    const overallStatus = isAnyOffline ? 'critical' : isAnyWarning ? 'warning' : 'healthy';

    res.json({
      data: {
        server: { status: 'online', uptime: uptimeStr, memory: `${memUsedMB} MB` },
        database: { status: dbStatus, latency: dbLatency },
        storage: { status: storageStatus, latency: storageLatency },
        pakasir: { status: pakasirStatus, latency: pakasirLatency },
        system: { status: overallStatus, detail: overallStatus === 'healthy' ? 'Normal' : overallStatus === 'warning' ? 'Degraded' : 'Gangguan' },
      },
    });
  } catch (error) {
    console.error('Dashboard System Health error:', error);
    res.status(500).json({ error: 'Gagal mengambil data kesehatan sistem' });
  }
});

/**
 * GET /api/superadmin/dashboard/platform-summary
 * Platform-wide summary statistics
 */
superadminRouter.get('/dashboard/platform-summary', async (_req, res) => {
  try {
    const [
      totalInstansi,
      totalVehicles,
      totalBookings,
      totalCustomers,
      totalRevenue,
      disbursements,
    ] = await Promise.all([
      prisma.instansi.count({ where: { status: 'aktif' } }),
      prisma.car.count({ where: { statusApproval: 'disetujui' } }),
      prisma.booking.count(),
      prisma.profile.count({ where: { role: 'customer' } }),
      prisma.booking.aggregate({
        where: { status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] } },
        _sum: { totalHarga: true },
      }),
      prisma.disbursement.aggregate({
        _sum: { komisiPlatform: true },
      }),
    ]);

    // Calculate average monthly revenue (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const yearlyRevenue = await prisma.booking.aggregate({
      where: {
        createdAt: { gte: twelveMonthsAgo },
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
      },
      _sum: { totalHarga: true },
    });

    // Hitung jumlah bulan aktual dengan data
    const monthsWithData = await prisma.booking.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: twelveMonthsAgo },
        status: { notIn: ['dibatalkan', 'menunggu_pembayaran'] },
      },
    });

    // Dapatkan bulan-bulan unik
    const uniqueMonths = new Set(
      monthsWithData.map(b => `${b.createdAt.getFullYear()}-${b.createdAt.getMonth()}`)
    );
    const divisor = Math.max(uniqueMonths.size, 1); // Minimal 1 untuk avoid division by zero

    const avgMonthlyRevenue = yearlyRevenue._sum.totalHarga
      ? Number(yearlyRevenue._sum.totalHarga) / divisor
      : 0;

    // Synchronize platform commission calculation across dashboard
    const [bookingsList, instansiRateList] = await Promise.all([
      prisma.booking.findMany({
        where: { status: { in: ['dikonfirmasi', 'berjalan', 'selesai'] } },
        select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
      prisma.instansi.findMany({ select: { id: true, komisiPlatformPersen: true } }),
    ]);

    const rateMap = new Map(instansiRateList.map((i) => [i.id, Number(i.komisiPlatformPersen)]));
    let platformCommission = 0;
    for (const b of bookingsList) {
      platformCommission += komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateMap);
    }

    res.json({
      data: {
        totalRentalCompanies: totalInstansi,
        totalVehicles,
        totalBookings,
        totalCustomers,
        totalRevenue: Number(totalRevenue._sum.totalHarga) || 0,
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
        platformCommission: Math.round(platformCommission),
      },
    });
  } catch (error) {
    console.error('Dashboard Platform Summary error:', error);
    res.status(500).json({ error: 'Gagal mengambil ringkasan platform' });
  }
});

/**
 * GET /api/superadmin/dashboard/today-bookings
 * Today's booking summary
 */
superadminRouter.get('/dashboard/today-bookings', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const todayBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
      select: { status: true },
    });

    const statusCounts = todayBookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        total: todayBookings.length,
        completed: statusCounts['selesai'] || 0,
        running: statusCounts['berjalan'] || 0,
        // Dipecah eksplisit: frontend sebelumnya mengira `pending` hanya
        // menunggu_pembayaran lalu menghitung dikonfirmasi sebagai residu,
        // yang selalu menghasilkan 0. `pending` dipertahankan untuk
        // kompatibilitas.
        menungguPembayaran: statusCounts['menunggu_pembayaran'] || 0,
        dikonfirmasi: statusCounts['dikonfirmasi'] || 0,
        pending: (statusCounts['menunggu_pembayaran'] || 0) + (statusCounts['dikonfirmasi'] || 0),
        cancelled: statusCounts['dibatalkan'] || 0,
      },
    });
  } catch (error) {
    console.error('Dashboard Today Bookings error:', error);
    res.status(500).json({ error: 'Gagal mengambil data booking hari ini' });
  }
});

// ============================================================================
// BOOKINGS MANAGEMENT
// ============================================================================

/**
 * GET /api/superadmin/bookings
 * List semua bookings lintas platform dengan pagination
 */
superadminRouter.get('/bookings', async (req, res) => {
  const { status, cari, page = '1', limit = '10', dari, sampai } = req.query;

  try {
    // Build where clause
    const where: any = {};
    if (status) where.status = status as string;

    if (dari || sampai) {
      where.tanggalMulai = {};
      if (dari) where.tanggalMulai.gte = new Date(dari as string);
      if (sampai) where.tanggalMulai.lte = new Date(sampai as string);
    }

    if (cari) {
      where.OR = [
        { car: { nama: { contains: cari as string, mode: 'insensitive' } } },
        { car: { nomorPlat: { contains: cari as string, mode: 'insensitive' } } },
        { profile: { nama: { contains: cari as string, mode: 'insensitive' } } },
        { car: { instansi: { namaInstansi: { contains: cari as string, mode: 'insensitive' } } } },
        { id: { contains: cari as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          car: {
            include: {
              images: { take: 1, orderBy: { urutan: 'asc' } },
              instansi: { select: { id: true, namaInstansi: true } },
            },
          },
          profile: { select: { id: true, nama: true, email: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    // Transform response to match UI expectations
    const data = bookings.map((b) => ({
      id: b.id,
      status: b.status,
      tanggalMulai: b.tanggalMulai.toISOString(),
      tanggalSelesai: b.tanggalSelesai.toISOString(),
      totalHarga: Number(b.totalHarga),
      createdAt: b.createdAt.toISOString(),
      car: {
        id: b.car.id,
        nama: b.car.nama,
        nomorPlat: b.car.nomorPlat,
        images: b.car.images.map((img) => ({ url: img.url })),
      },
      profile: { id: b.profile.id, nama: b.profile.nama },
      instansi: { id: b.car.instansi.id, nama: b.car.instansi.namaInstansi },
    }));

    res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('SuperAdmin Bookings error:', error);
    res.status(500).json({ error: 'Gagal mengambil data bookings' });
  }
});

/**
 * GET /api/superadmin/bookings/:id
 * Detail lengkap satu booking lintas-instansi (read-only) — sebelumnya
 * SuperAdmin sama sekali tidak bisa drill-down dari daftar booking ke
 * satu booking pun. Beda dari GET /api/admin/bookings/:id yang scoped ke
 * instansi Admin sendiri, endpoint ini sengaja TANPA batasan instansi
 * karena SuperAdmin memang perlu bisa lihat lintas-instansi untuk
 * pengawasan/penyelesaian sengketa.
 */
superadminRouter.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        car: {
          include: {
            images: { orderBy: { urutan: 'asc' } },
            instansi: { select: { id: true, namaInstansi: true } },
          },
        },
        profile: { select: { id: true, nama: true, email: true, noHp: true } },
        addons: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
        payment: { select: { status: true, metodeBayar: true, jumlah: true, paidAt: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking tidak ditemukan' });
      return;
    }

    res.json({ data: booking });
  } catch (error) {
    console.error('GET /api/superadmin/bookings/:id error:', error);
    res.status(500).json({ error: 'Gagal mengambil detail booking' });
  }
});

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * GET /api/superadmin/transactions
 * Unified transaction view dari payments dan disbursements
 */
superadminRouter.get('/transactions', async (req, res) => {
  const { type, status, cari, page = '1', limit = '10', dari, sampai } = req.query;

  try {
    let transactions: any[] = [];

    // SECURITY: Validate and parse date parameters
    let dariDate: Date | null = null;
    let sampaiDate: Date | null = null;

    if (dari) {
      const parsed = new Date(dari as string);
      if (!isNaN(parsed.getTime())) {
        dariDate = parsed;
      }
    }
    if (sampai) {
      const parsed = new Date(sampai as string);
      if (!isNaN(parsed.getTime())) {
        sampaiDate = parsed;
      }
    }

    // Fetch payments - using Prisma ORM to avoid raw SQL issues
    if (!type || type === 'payment') {
      try {
        const paymentWhere: any = {};
        if (status === 'success') paymentWhere.status = 'paid';
        else if (status === 'pending') paymentWhere.status = 'pending';
        else if (status === 'failed') paymentWhere.status = { in: ['expired', 'failed'] };

        if (dariDate || sampaiDate) {
          paymentWhere.paidAt = {};
          if (dariDate) paymentWhere.paidAt.gte = dariDate;
          if (sampaiDate) paymentWhere.paidAt.lte = sampaiDate;
        }

        const payments = await prisma.payment.findMany({
          where: paymentWhere,
          orderBy: { paidAt: 'desc' },
          include: {
            booking: {
              include: {
                car: {
                  include: { instansi: { select: { namaInstansi: true } } },
                },
                profile: { select: { nama: true } },
              },
            },
          },
        });

        for (const p of payments) {
          let txnStatus: 'success' | 'pending' | 'failed' = 'pending';
          if (p.status === 'paid') txnStatus = 'success';
          else if (p.status === 'expired' || p.status === 'failed') txnStatus = 'failed';

          const baseAmount = (p as any).booking?.totalHarga ? Number((p as any).booking.totalHarga) : Number(p.jumlah);

          transactions.push({
            id: p.id,
            type: 'payment',
            amount: baseAmount,
            status: txnStatus,
            description: `Pembayaran Booking #${p.bookingId.slice(0, 8)}`,
            createdAt: (p.paidAt || (p as any).booking?.createdAt || new Date()).toISOString(),
            instansi: (p as any).booking?.car?.instansi?.namaInstansi || '-',
            customer: (p as any).booking?.profile?.nama || '-',
            bookingId: p.bookingId,
          });
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
      }
    }

    // Fetch refunds - from real Refund table
    if (!type || type === 'refund') {
      try {
        const refundWhere: any = {};
        if (status === 'success') refundWhere.status = 'berhasil';
        else if (status === 'pending') refundWhere.status = { in: ['menunggu_persetujuan', 'disetujui', 'diproses'] };
        else if (status === 'failed') refundWhere.status = 'ditolak';

        if (dariDate || sampaiDate) {
          refundWhere.createdAt = {};
          if (dariDate) refundWhere.createdAt.gte = dariDate;
          if (sampaiDate) refundWhere.createdAt.lte = sampaiDate;
        }

        const refunds = await prisma.refund.findMany({
          where: refundWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            booking: {
              include: {
                car: {
                  include: { instansi: { select: { namaInstansi: true } } },
                },
                profile: { select: { nama: true } },
              },
            },
          },
        });

        for (const r of refunds) {
          let txnStatus: 'success' | 'pending' | 'failed' = 'pending';
          if (r.status === 'berhasil') txnStatus = 'success';
          else if (r.status === 'ditolak') txnStatus = 'failed';

          transactions.push({
            id: r.id,
            type: 'refund',
            amount: Number(r.jumlahRefund),
            status: txnStatus,
            description: `Pengembalian Dana (100%) Booking #${r.bookingId.slice(0, 8)}${r.rekeningTujuan ? ` ke ${r.rekeningTujuan}` : ''}`,
            createdAt: r.createdAt.toISOString(),
            instansi: r.booking?.car?.instansi?.namaInstansi || '-',
            customer: r.booking?.profile?.nama || '-',
            bookingId: r.bookingId,
          });
        }
      } catch (err) {
        console.error('Error fetching refunds:', err);
      }
    }

    // Fetch commissions - from confirmed/paid bookings
    if (!type || type === 'commission') {
      try {
        const commissionWhere: any = {};
        if (status === 'success') commissionWhere.status = { in: ['dikonfirmasi', 'berjalan', 'selesai'] };
        else if (status === 'pending') commissionWhere.status = 'menunggu_pembayaran';
        else if (status === 'failed') commissionWhere.status = 'dibatalkan';
        else commissionWhere.status = { in: ['dikonfirmasi', 'berjalan', 'selesai'] };

        if (dariDate || sampaiDate) {
          commissionWhere.createdAt = {};
          if (dariDate) commissionWhere.createdAt.gte = dariDate;
          if (sampaiDate) commissionWhere.createdAt.lte = sampaiDate;
        }

        const bookingsForCommission = await prisma.booking.findMany({
          where: commissionWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            car: {
              include: { instansi: { select: { namaInstansi: true, komisiPlatformPersen: true } } },
            },
            profile: { select: { nama: true } },
          },
        });

        for (const b of bookingsForCommission) {
          const harga = Number(b.totalHarga);
          // Snapshot rate booking; fallback ke rate live instansi yang
          // sudah di-include (untuk data sebelum backfill).
          const snapshot = b.komisiPersenSnapshot !== null && b.komisiPersenSnapshot !== undefined
            ? Number(b.komisiPersenSnapshot)
            : NaN;
          const rate = Number.isFinite(snapshot)
            ? snapshot
            : Number(b.car?.instansi?.komisiPlatformPersen ?? 10);
          const komisiAmount = Math.round((harga * rate) / 100);

          let txnStatus: 'success' | 'pending' | 'failed' = 'success';
          if (b.status === 'menunggu_pembayaran') txnStatus = 'pending';
          else if (b.status === 'dibatalkan') txnStatus = 'failed';

          transactions.push({
            id: `comm_${b.id}`,
            type: 'commission',
            amount: komisiAmount,
            status: txnStatus,
            description: `Komisi Platform (${rate}%) Booking #${b.id.slice(0, 8)}`,
            createdAt: b.createdAt.toISOString(),
            instansi: b.car?.instansi?.namaInstansi || '-',
            customer: b.profile?.nama || '-',
            bookingId: b.id,
          });
        }
      } catch (err) {
        console.error('Error fetching commission transactions:', err);
      }
    }

    // Fetch disbursements - using Prisma ORM
    if (!type || type === 'disbursement') {
      try {
        const disbursWhere: any = {};
        if (status === 'pending') disbursWhere.status = 'diproses';
        else if (status === 'success') disbursWhere.status = 'berhasil';
        else if (status === 'failed') disbursWhere.status = 'gagal';

        if (dariDate || sampaiDate) {
          disbursWhere.createdAt = {};
          if (dariDate) disbursWhere.createdAt.gte = dariDate;
          if (sampaiDate) disbursWhere.createdAt.lte = sampaiDate;
        }

        const disbursements = await prisma.disbursement.findMany({
          where: disbursWhere,
          orderBy: { createdAt: 'desc' },
          include: { instansi: { select: { namaInstansi: true } } },
        });

        for (const d of disbursements) {
          let txnStatus: 'success' | 'pending' | 'failed';
          if (d.status === 'berhasil') txnStatus = 'success';
          else if (d.status === 'diproses') txnStatus = 'pending';
          else txnStatus = 'failed';

          transactions.push({
            id: d.id,
            type: 'disbursement',
            amount: Number(d.jumlahBersih),
            status: txnStatus,
            description: d.status === 'diproses' ? 'Permintaan Pencairan Dana (Pendapatan Bersih Instansi)' : 'Pencairan Dana (Pendapatan Bersih Instansi)',
            createdAt: (d.createdAt || new Date()).toISOString(),
            instansi: d.instansi?.namaInstansi || '-',
            customer: undefined,
            bookingId: undefined,
          });
        }
      } catch (err) {
        console.error('Error fetching disbursements:', err);
        // Continue with empty disbursements on error
      }
    }

    // Search filter
    if (cari) {
      const searchLower = (cari as string).toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.description.toLowerCase().includes(searchLower) ||
          t.instansi?.toLowerCase().includes(searchLower) ||
          t.customer?.toLowerCase().includes(searchLower) ||
          t.id.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt descending
    transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const total = transactions.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const paginatedData = transactions.slice(skip, skip + limitNum);

    // Calculate global summary for current date filter (independent of selected tab type)
    const dateFilterPayment: any = { status: 'paid' };
    const dateFilterRefund: any = { status: 'berhasil' };
    const dateFilterBooking: any = { status: { in: ['dikonfirmasi', 'berjalan', 'selesai'] } };

    if (dariDate || sampaiDate) {
      dateFilterPayment.paidAt = {};
      dateFilterRefund.createdAt = {};
      dateFilterBooking.createdAt = {};
      if (dariDate) {
        dateFilterPayment.paidAt.gte = dariDate;
        dateFilterRefund.createdAt.gte = dariDate;
        dateFilterBooking.createdAt.gte = dariDate;
      }
      if (sampaiDate) {
        dateFilterPayment.paidAt.lte = sampaiDate;
        dateFilterRefund.createdAt.lte = sampaiDate;
        dateFilterBooking.createdAt.lte = sampaiDate;
      }
    }

    const [paidPayments, successfulRefunds, confirmedBookings, instansiRates] = await Promise.all([
      prisma.payment.findMany({
        where: dateFilterPayment,
        select: { jumlah: true, booking: { select: { totalHarga: true } } },
      }),
      prisma.refund.findMany({
        where: dateFilterRefund,
        select: { jumlahRefund: true },
      }),
      prisma.booking.findMany({
        where: dateFilterBooking,
        select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
      prisma.instansi.findMany({ select: { id: true, komisiPlatformPersen: true } }),
    ]);

    const rateMap = new Map(instansiRates.map((i) => [i.id, Number(i.komisiPlatformPersen)]));

    const totalMasuk = paidPayments.reduce((sum, p) => {
      const baseHarga = p.booking?.totalHarga ? Number(p.booking.totalHarga) : Number(p.jumlah);
      return sum + baseHarga;
    }, 0);

    const totalRefund = successfulRefunds.reduce((sum, r) => sum + Number(r.jumlahRefund), 0);

    const totalKomisi = confirmedBookings.reduce((sum, b) =>
      sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateMap), 0);

    const summary = {
      totalMasuk: Math.round(totalMasuk),
      totalRefund: Math.round(totalRefund),
      totalKomisi: Math.round(totalKomisi),
    };

    res.json({
      data: paginatedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      summary,
    });
  } catch (error) {
    console.error('SuperAdmin Transactions error:', error);
    res.status(500).json({ error: 'Gagal mengambil data transaksi' });
  }
});

// ============================================================================
// REPORTS
// ============================================================================

/**
 * GET /api/superadmin/reports
 * Aggregated report data untuk dashboard laporan
 */
superadminRouter.get('/reports', async (req, res) => {
  const { period = '30d' } = req.query;

  try {
    // Calculate date range based on period
    const now = new Date();
    let dari: Date;
    let days: number;

    switch (period) {
      case '7d':
        dari = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
        days = 7;
        break;
      case '30d':
        dari = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
        days = 30;
        break;
      case '90d':
        dari = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0);
        days = 90;
        break;
      case '1y':
        dari = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        days = Math.max(1, Math.ceil((now.getTime() - dari.getTime()) / (24 * 60 * 60 * 1000)));
        break;
      default:
        dari = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
        days = 30;
    }

    const periodMs = now.getTime() - dari.getTime();
    const dariSebelumnya = new Date(dari.getTime() - periodMs);
    const awalBulanIni = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Fetch aggregated data
    const [
      totalBookings,
      completedBookings,
      activeBookings,
      totalUsers,
      newUsers,
      totalCars,
      availableCars,
      totalInstansi,
      activeInstansi,
      bookingsInPeriod,
      disbursementsInPeriod,
      bookingsThisMonth,
      customersPeriodeSebelumnya,
      customersPeriodeIni,
      totalBookingsSebelumnya,
      bookingsSebelumnya,
      pendingBookings,
      instansiRates,
    ] = await Promise.all([
      // Bookings stats
      prisma.booking.count({ where: { createdAt: { gte: dari } } }),
      prisma.booking.count({ where: { status: 'selesai', createdAt: { gte: dari } } }),
      prisma.booking.count({ where: { status: { in: ['dikonfirmasi', 'berjalan'] }, createdAt: { gte: dari } } }),

      // Users stats
      prisma.profile.count({ where: { role: 'customer' } }),
      prisma.profile.count({ where: { role: 'customer', createdAt: { gte: dari } } }),

      // Cars stats
      prisma.car.count(),
      prisma.car.count({ where: { status: 'tersedia' } }),

      // Instansi stats
      prisma.instansi.count(),
      prisma.instansi.count({ where: { status: 'aktif' } }),

      // Financial stats (Confirmed/Active/Completed bookings)
      prisma.booking.findMany({
        where: {
          createdAt: { gte: dari },
          status: { in: ['dikonfirmasi', 'berjalan', 'selesai'] },
        },
        select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
      prisma.disbursement.findMany({
        where: { status: 'berhasil', createdAt: { gte: dari } },
        select: { jumlahKotor: true, komisiPlatform: true },
      }),
      prisma.booking.findMany({
        where: {
          createdAt: { gte: awalBulanIni },
          status: { in: ['dikonfirmasi', 'berjalan', 'selesai'] },
        },
        select: { totalHarga: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: dariSebelumnya, lt: dari } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: dari } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.booking.count({ where: { createdAt: { gte: dariSebelumnya, lt: dari } } }),
      prisma.booking.findMany({
        where: {
          createdAt: { gte: dariSebelumnya, lt: dari },
          status: { in: ['dikonfirmasi', 'berjalan', 'selesai'] },
        },
        select: { totalHarga: true },
      }),
      prisma.booking.findMany({
        where: { status: 'selesai', disbursementItems: { none: {} } },
        select: { totalHarga: true, komisiPersenSnapshot: true, car: { select: { instansiId: true } } },
      }),
      prisma.instansi.findMany({
        select: { id: true, komisiPlatformPersen: true },
      }),
    ]);

    const rateByInstansi = new Map(instansiRates.map((i) => [i.id, Number(i.komisiPlatformPersen)]));

    const totalRevenue = bookingsInPeriod.reduce((sum, b) => sum + Number(b.totalHarga), 0);
    const totalCommission = bookingsInPeriod.reduce((sum, b) =>
      sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateByInstansi), 0);
    const komisiDicairkan = disbursementsInPeriod.reduce((sum, d) => sum + Number(d.komisiPlatform), 0);

    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const utilizationRate = totalCars > 0 ? ((totalCars - availableCars) / totalCars) * 100 : 0;
    const dailyAvg = days > 0 ? Math.round(totalRevenue / days) : 0;
    const revenueThisMonth = bookingsThisMonth.reduce((sum, b) => sum + Number(b.totalHarga), 0);

    const userIdsSebelumnya = new Set(customersPeriodeSebelumnya.map((b) => b.userId));
    const userIdsIni = new Set(customersPeriodeIni.map((b) => b.userId));
    let retainedCount = 0;
    for (const uid of userIdsSebelumnya) {
      if (userIdsIni.has(uid)) retainedCount++;
    }
    const retentionRate = userIdsSebelumnya.size > 0
      ? Math.round((retainedCount / userIdsSebelumnya.size) * 1000) / 10
      : 0;

    const commissionPending = pendingBookings.reduce((sum, b) =>
      sum + komisiUntukBooking(b.totalHarga, b.komisiPersenSnapshot, b.car.instansiId, rateByInstansi), 0);

    // Effective commission rate periode ini — dihitung dari data asli
    // (komisi aktual / revenue aktual), bukan angka flat. Ini jujur
    // menunjukkan blended rate sesungguhnya, karena tiap instansi bisa
    // punya rate komisi berbeda.
    const commissionRate = totalRevenue > 0
      ? Math.round((totalCommission / totalRevenue) * 1000) / 10
      : 0;

    // Tren periode-vs-periode (naik/turun %) — dihitung dari data asli.
    const calcTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };
    const revenueSebelumnya = bookingsSebelumnya.reduce((sum, b) => sum + Number(b.totalHarga), 0);

    res.json({
      revenue: {
        total: totalRevenue,
        thisMonth: revenueThisMonth,
        daily: dailyAvg,
      },
      booking: {
        total: totalBookings,
        active: activeBookings,
        // Jumlah selesai EKSPLISIT dari DB — jangan diderivasi di frontend
        // sebagai total-active karena itu ikut menghitung menunggu_pembayaran
        // dan dibatalkan sebagai "selesai".
        completed: completedBookings,
        completionRate: Math.round(completionRate * 10) / 10,
      },
      customer: {
        total: totalUsers,
        newThisPeriod: newUsers,
        retentionRate,
      },
      fleet: {
        total: totalCars,
        available: availableCars,
        utilization: Math.round(utilizationRate),
      },
      rental: {
        total: totalInstansi,
        active: activeInstansi,
        avgRevenue: activeInstansi > 0 ? Math.round(totalRevenue / activeInstansi) : 0,
      },
      commission: {
        total: Math.round(totalCommission),
        disbursed: Math.round(komisiDicairkan),
        pending: Math.round(commissionPending),
        rate: commissionRate,
      },
      trends: {
        revenue: calcTrend(totalRevenue, revenueSebelumnya),
        booking: calcTrend(totalBookings, totalBookingsSebelumnya),
      },
      period,
      dari: dari.toISOString(),
      sampai: now.toISOString(),
    });
  } catch (error) {
    console.error('SuperAdmin Reports error:', error);
    res.status(500).json({ error: 'Gagal mengambil data laporan' });
  }
});