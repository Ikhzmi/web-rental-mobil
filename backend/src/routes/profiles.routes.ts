import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';

export const profilesRouter = Router();

profilesRouter.use(verifySupabaseToken);

/** GET /api/profiles/me */
profilesRouter.get('/me', async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.user!.id } });
  res.json({ data: profile });
});

const updateProfileSchema = z.object({
  nama: z.string().trim().min(1).optional(),
  noHp: z.string().trim().min(1).optional(),
  noKtp: z.string().trim().min(1).optional(),
  noSim: z.string().trim().min(1).optional(),
});

/** PATCH /api/profiles/me */
profilesRouter.patch('/me', async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }

  const updated = await prisma.profile.update({
    where: { id: req.user!.id },
    data: parsed.data,
  });
  res.json({ data: updated });
});

const dokumenSchema = z.object({
  tipe: z.enum(['ktp', 'sim']),
  /** Path objek di bucket privat `dokumen-penyewa`, BUKAN URL publik. */
  storagePath: z.string().trim().min(1),
});

/**
 * POST /api/profiles/me/dokumen — F8 PRD.
 * Frontend sudah meng-upload file KTP/SIM langsung ke bucket privat
 * `dokumen-penyewa` lewat supabase-js (anon key). Endpoint ini cuma
 * menyimpan REFERENSI path-nya ke kolom profiles yang sesuai, dan
 * me-reset status verifikasi supaya admin tahu ada dokumen baru untuk
 * diperiksa.
 */
profilesRouter.post('/me/dokumen', async (req, res) => {
  const parsed = dokumenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
    return;
  }
  const { tipe, storagePath } = parsed.data;

  const updated = await prisma.profile.update({
    where: { id: req.user!.id },
    data: {
      ...(tipe === 'ktp' ? { dokumenKtpUrl: storagePath } : { dokumenSimUrl: storagePath }),
      dokumenVerified: false,
    },
  });

  res.json({ data: updated });
});
