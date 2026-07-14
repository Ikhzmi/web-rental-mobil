import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const adminUsersRouter = Router();
export const adminDokumenRouter = Router();

adminUsersRouter.use(verifySupabaseToken, requireAdmin);
adminDokumenRouter.use(verifySupabaseToken, requireAdmin);

/** GET /api/admin/users — F12. */
adminUsersRouter.get('/', async (_req, res) => {
  const users = await prisma.profile.findMany({
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
  });
  res.json({ data: users });
});

const statusSchema = z.object({
  aktif: z.boolean(),
});

/** PATCH /api/admin/users/:id/status — F12. */
adminUsersRouter.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const user = await prisma.profile
    .update({ where: { id: req.params.id }, data: { aktif: parsed.data.aktif } })
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
 */
adminDokumenRouter.get('/:userId/signed-url', async (req, res) => {
  const tipe = req.query.tipe === 'sim' ? 'sim' : 'ktp';

  const profile = await prisma.profile.findUnique({
    where: { id: req.params.userId },
    select: { dokumenKtpUrl: true, dokumenSimUrl: true },
  });

  const storagePath = tipe === 'sim' ? profile?.dokumenSimUrl : profile?.dokumenKtpUrl;
  if (!profile || !storagePath) {
    res.status(404).json({ error: `Dokumen ${tipe.toUpperCase()} belum diunggah pengguna ini` });
    return;
  }

  const { data, error } = await supabaseAdmin.storage
    .from('dokumen-penyewa')
    .createSignedUrl(storagePath, 60 * 5); // berlaku 5 menit

  if (error || !data) {
    console.error('Gagal membuat signed URL:', error);
    res.status(500).json({ error: 'Gagal membuat signed URL' });
    return;
  }

  res.json({ data: { signedUrl: data.signedUrl, expiresInSeconds: 300 } });
});
