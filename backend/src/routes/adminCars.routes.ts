import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';
import { asyncHandler, AppError } from '../lib/errorHandler';
import { notifySuperAdmins } from '../services/notification.service';
import { logAdminActivity } from '../services/activity.service';

export const adminCarsRouter = Router();

adminCarsRouter.use(verifySupabaseToken, requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cari: z.string().trim().optional(),
});

/** GET /api/admin/cars — termasuk mobil nonaktif/maintenance (F10) dengan pagination. */
adminCarsRouter.get('/', asyncHandler(async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Query tidak valid', 400);
  }

  // KRITIS: sebelumnya endpoint ini TIDAK memfilter instansiId sama sekali
  // — Admin dari instansi manapun akan melihat SELURUH mobil dari SELURUH
  // instansi di platform di halaman "Armada Saya" mereka, bukan cuma
  // miliknya sendiri. Kebocoran data lintas-tenant yang serius (Admin bisa
  // melihat inventaris kompetitor/instansi lain).
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Akun admin tidak terikat ke instansi manapun', 403);
  }

  const { page, limit, cari } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    instansiId,
    ...(cari && { nama: { contains: cari, mode: 'insensitive' as const } }),
  };

  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where,
      include: { images: { orderBy: { urutan: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.car.count({ where }),
  ]);

  res.json({
    data: cars,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

/**
 * GET /api/admin/cars/:id — ditambahkan v1.1, sebelumnya form edit admin
 * harus memfilter dari response list yang tidak efisien untuk armada besar.
 */
adminCarsRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.findUnique({
    where: { id, instansiId },
    include: { images: { orderBy: { urutan: 'asc' } } },
  });

  if (!car) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  res.json({ data: car });
}));

const carBaseSchema = z.object({
  nama: z.string().trim().min(1),
  nomorPlat: z.string().trim().min(1).transform((v) => v.toUpperCase()).optional(),
  kategori: z.enum(['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric']),
  transmisi: z.enum(['manual', 'matic']),
  bahanBakar: z.enum(['bensin', 'diesel', 'hybrid', 'electric']).default('bensin'),
  tipeSewa: z.enum(['lepas_kunci', 'dengan_sopir', 'keduanya']),
  hargaSopirPerHari: z.number().nonnegative().nullable().optional(),
  hargaAntarJemput: z.number().nonnegative().nullable().optional(),
  kapasitasKursi: z.number().int().positive(),
  hargaPerHari: z.number().positive(),
  status: z.enum(['tersedia', 'maintenance', 'nonaktif']).default('tersedia'),
  deskripsi: z.string().optional(),
});


/** Validasi bisnis: tipeSewa yang butuh harga sopir wajib mengisinya (§9 PRD). */
function validateTipeSewaHargaSopir(data: z.infer<typeof carBaseSchema>) {
  const butuhHargaSopir = data.tipeSewa === 'dengan_sopir' || data.tipeSewa === 'keduanya';
  if (butuhHargaSopir && (data.hargaSopirPerHari === null || data.hargaSopirPerHari === undefined)) {
    return 'harga_sopir_per_hari wajib diisi untuk tipe_sewa dengan_sopir/keduanya';
  }
  return null;
}

/** POST /api/admin/cars */
adminCarsRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = carBaseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  const bisnisError = validateTipeSewaHargaSopir(parsed.data);
  if (bisnisError) {
    throw new AppError(bisnisError, 400);
  }

  // Admin scoping: assign car to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.create({
    // statusApproval sengaja TIDAK diset di sini — biar schema default
    // 'menunggu_persetujuan' yang berlaku. Mobil baru harus melewati
    // antrian approval Super Admin sebelum bisa tayang di katalog publik.
    data: { ...parsed.data, instansiId },
    include: { images: true },
  });

  void notifySuperAdmins({
    type: 'approval',
    title: 'Pengajuan Mobil Baru',
    message: `Mobil baru ${car.nama} (${car.nomorPlat ?? 'Tanpa plat'}) diajukan oleh instansi dan menunggu persetujuan.`,
    data: { actionUrl: '/superadmin/approval', carId: car.id },
  });

  void logAdminActivity({
    instansiId,
    userId: req.user!.id,
    action: 'create_car',
    title: 'Penambahan Armada Baru',
    description: `${(req.user as any)?.nama || req.user?.email || 'Admin'} menambahkan armada baru: ${car.nama} (${car.nomorPlat ?? 'Tanpa plat'})`,
    metadata: { carId: car.id, nama: car.nama, detailUrl: '/admin/armada' },
  });

  res.status(201).json({ data: car });
}));

/** PATCH /api/admin/cars/:id */
adminCarsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const parsed = carBaseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.car.findUnique({ where: { id, instansiId } });
  if (!existing) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const merged = { ...existing, ...parsed.data };
  const bisnisError = validateTipeSewaHargaSopir(merged as z.infer<typeof carBaseSchema>);
  if (bisnisError) {
    throw new AppError(bisnisError, 400);
  }

  const car = await prisma.car.update({
    where: { id },
    data: {
      ...parsed.data,
      // Jika mobil sudah disetujui sebelumnya, perubahan data wajib
      // di-review ulang oleh Super Admin — reset ke menunggu_persetujuan.
      // Jika masih dalam status lain (ditolak / menunggu), biarkan tetap.
      ...(existing.statusApproval === 'disetujui' && {
        statusApproval: 'menunggu_persetujuan',
        alasanPenolakan: null,
      }),
    },
  });

  void logAdminActivity({
    instansiId,
    userId: req.user!.id,
    action: 'update_car',
    title: 'Pembaruan Data Armada',
    description: `${(req.user as any)?.nama || req.user?.email || 'Admin'} memperbarui armada: ${car.nama}`,
    metadata: { carId: car.id, nama: car.nama, detailUrl: '/admin/armada' },
  });

  res.json({ data: car });
}));

/** DELETE /api/admin/cars/:id — hapus armada (hard-delete jika belum ada booking, soft-delete jika ada histori selesai/batal, tolak jika ada booking aktif) */
adminCarsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.car.findUnique({
    where: { id, instansiId },
    include: {
      bookings: { select: { id: true, status: true } },
    },
  });
  if (!existing) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  // Cek apakah ada booking aktif yang belum selesai/batal
  const activeBookings = existing.bookings.filter((b) =>
    ['menunggu_pembayaran', 'dikonfirmasi', 'berjalan'].includes(b.status)
  );
  if (activeBookings.length > 0) {
    throw new AppError(
      `Armada "${existing.nama}" tidak dapat dihapus karena sedang memiliki ${activeBookings.length} pesanan aktif`,
      400
    );
  }

  // Jika tidak pernah memiliki riwayat booking sama sekali -> Hapus permanen
  if (existing.bookings.length === 0) {
    await prisma.car.delete({ where: { id } });

    void logAdminActivity({
      instansiId,
      userId: req.user!.id,
      action: 'update_car',
      title: 'Armada Dihapus Permanen',
      description: `${(req.user as any)?.nama || req.user?.email || 'Admin'} menghapus armada: ${existing.nama}`,
      metadata: { carId: existing.id, nama: existing.nama, detailUrl: '/admin/armada' },
    });

    res.json({
      message: `Armada "${existing.nama}" berhasil dihapus permanen`,
      deletedPermanently: true,
    });
  } else {
    // Jika ada riwayat booking lampau -> soft-delete (nonaktifkan & tolak approval)
    const car = await prisma.car.update({
      where: { id },
      data: {
        status: 'nonaktif',
        statusApproval: 'ditolak',
        alasanPenolakan: 'Dihapus oleh admin instansi',
      },
    });

    void logAdminActivity({
      instansiId,
      userId: req.user!.id,
      action: 'update_car',
      title: 'Armada Dinonaktifkan',
      description: `${(req.user as any)?.nama || req.user?.email || 'Admin'} menonaktifkan armada: ${existing.nama}`,
      metadata: { carId: existing.id, nama: existing.nama, detailUrl: '/admin/armada' },
    });

    res.json({
      data: car,
      message: `Armada "${existing.nama}" berhasil dinonaktifkan dan ditarik dari katalog`,
      deletedPermanently: false,
    });
  }
}));

const imageSchema = z.object({
  url: z.string().url(),
  urutan: z.number().int().nonnegative().default(0),
});

/**
 * POST /api/admin/cars/:id/images — ditambahkan v1.1.
 * Dipanggil SETELAH file foto sudah diunggah ke bucket publik Supabase
 * Storage `car-photos` dari sisi admin dashboard; endpoint ini menyimpan
 * referensi URL publiknya ke tabel car_images (pola yang sama seperti
 * POST /api/profiles/me/dokumen untuk dokumen KTP/SIM).
 */
adminCarsRouter.post('/:id/images', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  // Admin scoping: verify car belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.findUnique({ where: { id, instansiId } });
  if (!car) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const image = await prisma.carImage.create({
    data: { carId: id, url: parsed.data.url, urutan: parsed.data.urutan },
  });
  res.status(201).json({ data: image });
}));

/** DELETE /api/admin/cars/:id/images/:imageId — ditambahkan v1.1. */
adminCarsRouter.delete('/:id/images/:imageId', asyncHandler(async (req, res) => {
  const imageId = req.params.imageId as string;

  // Admin scoping: verify image belongs to admin's car's
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.carImage.findFirst({
    where: {
      id: imageId,
      car: { instansiId },
    },
  });
  if (!existing) {
    throw new AppError('Foto tidak ditemukan', 404);
  }

  const image = await prisma.carImage.delete({ where: { id: imageId } });
  res.json({ data: image });
}));

const createBlockedDateSchema = z.object({
  tanggalMulai: z.string(),
  tanggalSelesai: z.string(),
  alasan: z.string().optional(),
});

/** GET /api/admin/cars/:id/blocked-dates — list blocked dates for car */
adminCarsRouter.get('/:id/blocked-dates', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const car = await prisma.car.findFirst({ where: { id, instansiId } });
  if (!car) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  const blockedDates = await prisma.carBlockedDate.findMany({
    where: { carId: id },
    orderBy: { tanggalMulai: 'asc' },
  });

  res.json({ data: blockedDates });
}));

/** POST /api/admin/cars/:id/blocked-dates — add blocked date for car */
adminCarsRouter.post('/:id/blocked-dates', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const parsed = createBlockedDateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tanggal tidak valid', 400);
  }

  const car = await prisma.car.findFirst({ where: { id, instansiId } });
  if (!car) {
    throw new AppError('Mobil tidak ditemukan', 404);
  }

  // Parse tanggal sebagai UTC noon (T12:00:00Z) bukan midnight (T00:00:00Z)
  // agar tanggal tidak bergeser 1 hari di timezone manapun (termasuk WIB UTC+7).
  // Frontend mengirim "YYYY-MM-DD" → kita normalkan ke noon UTC.
  const parseUTCDate = (dateStr: string): Date => {
    const datePart = dateStr.split('T')[0]; // ambil "YYYY-MM-DD" saja
    return new Date(`${datePart}T12:00:00Z`); // simpan sebagai noon UTC
  };

  const tanggalMulai = parseUTCDate(parsed.data.tanggalMulai);
  const tanggalSelesai = parseUTCDate(parsed.data.tanggalSelesai);

  if (isNaN(tanggalMulai.getTime()) || isNaN(tanggalSelesai.getTime())) {
    throw new AppError('Format tanggal tidak valid', 400);
  }

  if (tanggalSelesai < tanggalMulai) {
    throw new AppError('Tanggal selesai tidak boleh sebelum tanggal mulai', 400);
  }

  const created = await prisma.carBlockedDate.create({
    data: {
      carId: id,
      tanggalMulai,
      tanggalSelesai,
      alasan: parsed.data.alasan || 'Manual Blokir Admin',
    },
  });

  res.status(201).json({ data: created });
}));

/** DELETE /api/admin/cars/:id/blocked-dates/:blockedId — delete blocked date */
adminCarsRouter.delete('/:id/blocked-dates/:blockedId', asyncHandler(async (req, res) => {
  const { id, blockedId } = req.params as { id: string; blockedId: string };
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    throw new AppError('Instansi tidak ditemukan untuk admin ini', 403);
  }

  const existing = await prisma.carBlockedDate.findFirst({
    where: {
      id: blockedId,
      carId: id,
      car: { instansiId },
    },
  });

  if (!existing) {
    throw new AppError('Data blokir tanggal tidak ditemukan', 404);
  }

  await prisma.carBlockedDate.delete({ where: { id: blockedId } });
  res.json({ success: true });
}));