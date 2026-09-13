import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const adminUsersRouter = Router();
export const adminDokumenRouter = Router();

adminUsersRouter.use(verifySupabaseToken, requireAdmin);
adminDokumenRouter.use(verifySupabaseToken, requireAdmin);

const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cari: z.string().trim().optional(),
});

/** GET /api/admin/users — F12 dengan pagination. */
adminUsersRouter.get('/', async (req, res) => {
  const parsed = listUsersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
    return;
  }
  const { page, limit, cari } = parsed.data;
  const skip = (page - 1) * limit;

  const createAdminUserSchema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    nama: z.string().min(1, 'Nama wajib diisi'),
    noHp: z.string().min(1, 'No HP wajib diisi'),
  });

  /** POST /api/admin/users/create-admin — Admin menambahkan admin baru untuk instansinya sendiri */
  adminUsersRouter.post('/create-admin', async (req, res) => {
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
      res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
      return;
    }

    const parsed = createAdminUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
      return;
    }

    const { email, password, nama, noHp } = parsed.data;

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email sudah terdaftar' });
      return;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama, role: 'admin' },
    });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message || 'Gagal membuat akun auth' });
      return;
    }

    const profile = await prisma.profile.upsert({
      where: { id: authData.user.id },
      create: {
        id: authData.user.id,
        email,
        nama,
        noHp,
        role: 'admin',
        instansiId,
        aktif: true,
      },
      update: {
        email,
        nama,
        noHp,
        role: 'admin',
        instansiId,
        aktif: true,
      },
    });

    res.status(201).json({ data: profile });
  });

  // Admin scoping: filter users by admin's instansiId
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  const where: any = {
    instansiId, // Admin scoping - only show users from same instansi
    ...(cari && {
      OR: [
        { nama: { contains: cari, mode: 'insensitive' } },
        { email: { contains: cari, mode: 'insensitive' } },
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
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  res.json({
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const statusSchema = z.object({
  aktif: z.boolean(),
});

/** PATCH /api/admin/users/:id/status — F12. */
adminUsersRouter.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid' });
    return;
  }

  // Admin scoping: verify user belongs to admin's instansi
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  // SECURITY: Prevent modifying super_admin accounts
  const targetUser = await prisma.profile.findUnique({
    where: { id: req.params.id },
    select: { role: true },
  });

  if (!targetUser) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    return;
  }

  if (targetUser.role === 'super_admin') {
    res.status(403).json({ error: 'Tidak dapat mengubah status super admin' });
    return;
  }

  // SECURITY: Also prevent admin from deactivating other admins
  if (targetUser.role === 'admin') {
    res.status(403).json({ error: 'Tidak dapat mengubah status admin lain' });
    return;
  }

  const user = await prisma.profile
    .update({
      where: { id: req.params.id, instansiId },
      data: { aktif: parsed.data.aktif },
    })
    .catch(() => null);

  if (!user) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    return;
  }

  res.json({ data: user });
});

/**
 * GET /api/admin/dokumen/:userId/signed-url — buat signed URL sementara
 * untuk melihat dokumen KTP/SIM di bucket privat `dokumen-penyewa`.
 * Query ?tipe=ktp|sim menentukan dokumen mana yang diminta.
 *
 * Ownership check: Admin bisa melihat dokumen customer jika customer
 * pernah membuat booking di mobil milik instansi admin tsb.
 * (Customer profiles TIDAK punya instansiId — hanya admin profiles yang punya.)
 */
adminDokumenRouter.get('/:userId/signed-url', async (req, res) => {
  const tipe = req.query.tipe === 'sim' ? 'sim' : 'ktp';

  // Admin scoping
  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  // Cari profile langsung (tanpa filter instansiId — customer tidak punya)
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.userId },
    select: { dokumenKtpUrl: true, dokumenSimUrl: true },
  });

  if (!profile) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    return;
  }

  // Verifikasi admin berhak: customer punya booking di mobil instansi admin
  const hasRelatedBooking = await prisma.booking.findFirst({
    where: {
      userId: req.params.userId,
      car: { instansiId },
    },
    select: { id: true },
  });

  if (!hasRelatedBooking) {
    res.status(403).json({ error: 'Tidak berhak melihat dokumen penyewa ini' });
    return;
  }

  const storagePath = tipe === 'sim' ? profile?.dokumenSimUrl : profile?.dokumenKtpUrl;
  if (!storagePath) {
    res.status(404).json({ error: `Dokumen ${tipe.toUpperCase()} belum diunggah pengguna ini` });
    return;
  }

  const { data, error } = await supabaseAdmin.storage
    .from('dokumen-penyewa')
    .createSignedUrl(storagePath, 60 * 2); // 2 menit

  if (error || !data) {
    console.error('Gagal membuat signed URL:', error);
    res.status(500).json({ error: 'Gagal membuat signed URL' });
    return;
  }

  res.json({ data: { signedUrl: data.signedUrl, expiresInSeconds: 120 } });
});

const verifySchema = z.object({
  verified: z.boolean(),
});

/**
 * PATCH /api/admin/dokumen/:userId/verify — tandai dokumen KTP+SIM
 * penyewa sebagai terverifikasi/belum.
 *
 * Ownership check: sama dengan signed-url di atas.
 */
adminDokumenRouter.patch('/:userId/verify', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid' });
    return;
  }

  const instansiId = req.user?.instansiId;
  if (!instansiId) {
    res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
    return;
  }

  // Verifikasi admin berhak: customer punya booking di mobil instansi admin
  const hasRelatedBooking = await prisma.booking.findFirst({
    where: {
      userId: req.params.userId,
      car: { instansiId },
    },
    select: { id: true },
  });

  if (!hasRelatedBooking) {
    res.status(403).json({ error: 'Tidak berhak mengubah status dokumen penyewa ini' });
    return;
  }

  const profile = await prisma.profile
    .update({
      where: { id: req.params.userId },
      data: { dokumenVerified: parsed.data.verified },
      select: { id: true, dokumenVerified: true },
    })
    .catch(() => null);

  if (!profile) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    return;
  }

  res.json({ data: profile });
});