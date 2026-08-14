import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { asyncHandler, AppError } from '../lib/errorHandler';

export const profilesRouter = Router();

profilesRouter.use(verifySupabaseToken);

/** GET /api/profiles/me */
profilesRouter.get('/me', asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.user!.id } });

  if (!profile) {
    throw new AppError('Profil tidak ditemukan', 404);
  }

  res.json({ data: profile });
}));

const updateProfileSchema = z.object({
  nama: z.string().trim().min(1).optional(),
  noHp: z.string().trim().min(1).optional(),
  noKtp: z.string().trim().min(1).optional(),
  noSim: z.string().trim().min(1).optional(),
});

/** PATCH /api/profiles/me */
profilesRouter.patch('/me', asyncHandler(async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  const updated = await prisma.profile.update({
    where: { id: req.user!.id },
    data: parsed.data,
  });
  res.json({ data: updated });
}));

const dokumenSchema = z.object({
  tipe: z.enum(['ktp', 'sim']),
  /** Path objek di bucket privat `dokumen-penyewa`, BUKAN URL publik. */
  storagePath: z.string().trim().min(1),
});

// SECURITY: Allowed file extensions for documents
const ALLOWED_DOCUMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

// SECURITY: Allowed MIME types for documents
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf'
];

/**
 * SECURITY: Validate document path format
 * Ensures path follows expected Supabase storage pattern
 */
function isValidDocumentPath(path: string): boolean {
  // Path must be in format: dokumen-penyewa/folder/filename.ext
  const validPathPattern = /^dokumen-penyewa\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
  return validPathPattern.test(path);
}

/**
 * SECURITY: Get file extension from path
 */
function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
}

/**
 * POST /api/profiles/me/dokumen — F8 PRD.
 * Frontend sudah meng-upload file KTP/SIM langsung ke bucket privat
 * `dokumen-penyewa` lewat supabase-js (anon key). Endpoint ini cuma
 * menyimpan REFERENSI path-nya ke kolom profiles yang sesuai, dan
 * me-reset status verifikasi supaya admin tahu ada dokumen baru untuk
 * diperiksa.
 *
 * SECURITY: Validates document path format and file extension
 */
profilesRouter.post('/me/dokumen', asyncHandler(async (req, res) => {
  const parsed = dokumenSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  const { tipe, storagePath } = parsed.data;

  // SECURITY: Validate document path format
  if (!isValidDocumentPath(storagePath)) {
    throw new AppError('Format path dokumen tidak valid', 400);
  }

  // SECURITY: Validate file extension
  const extension = getFileExtension(storagePath);
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
    throw new AppError(`Tipe file tidak diizinkan. Gunakan: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`, 400);
  }

  // SECURITY: Additional path traversal prevention
  if (storagePath.includes('..') || storagePath.includes('~')) {
    throw new AppError('Path dokumen tidak valid', 400);
  }

  const updated = await prisma.profile.update({
    where: { id: req.user!.id },
    data: {
      ...(tipe === 'ktp' ? { dokumenKtpUrl: storagePath } : { dokumenSimUrl: storagePath }),
      dokumenVerified: false,
    },
  });

  res.json({ data: updated });
}));
