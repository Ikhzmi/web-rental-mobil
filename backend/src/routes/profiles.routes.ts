import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { asyncHandler, AppError } from '../lib/errorHandler';

export const profilesRouter = Router();

profilesRouter.use(verifySupabaseToken);

/** GET /api/profiles/me */
profilesRouter.get('/me', asyncHandler(async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.user!.id } });

    if (!profile) {
      throw new AppError('Profil tidak ditemukan', 404);
    }

    res.json({ data: profile });
  } catch (err) {
    if (err instanceof AppError) throw err;

    console.error('[GET /api/profiles/me] Full fetch failed, falling back to core fields:', err);
    const coreProfile = await prisma.profile.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        nama: true,
        noHp: true,
        role: true,
        aktif: true,
      },
    });

    if (!coreProfile) {
      throw new AppError('Profil tidak ditemukan', 404);
    }

    res.json({
      data: {
        ...coreProfile,
        alamat: null,
        noKtp: null,
        noSim: null,
        dokumenKtpUrl: null,
        dokumenSimUrl: null,
        dokumenVerified: false,
        namaBank: null,
        nomorRekening: null,
        namaPemilikRekening: null,
      },
    });
  }
}));

const updateProfileSchema = z.object({
  nama: z.string().trim().min(1).optional(),
  noHp: z.string().trim().min(1).optional(),
  // noKtp dan noSim boleh kosong (string kosong) karena opsional
  noKtp: z.string().trim().optional(),
  noSim: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
  namaBank: z.string().trim().optional(),
  nomorRekening: z.string().trim().optional(),
  namaPemilikRekening: z.string().trim().optional(),
});

/** PATCH /api/profiles/me */
profilesRouter.patch('/me', asyncHandler(async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Data tidak valid', 400);
  }

  const { alamat, noKtp, noSim, namaBank, nomorRekening, namaPemilikRekening, ...rest } = parsed.data;

  const updated = await prisma.profile.update({
    where: { id: req.user!.id },
    data: {
      ...rest,
      ...(alamat !== undefined ? { alamat } : {}),
      ...(noKtp !== undefined ? { noKtp: noKtp || null } : {}),
      ...(noSim !== undefined ? { noSim: noSim || null } : {}),
      ...(namaBank !== undefined ? { namaBank: namaBank || null } : {}),
      ...(nomorRekening !== undefined ? { nomorRekening: nomorRekening || null } : {}),
      ...(namaPemilikRekening !== undefined ? { namaPemilikRekening: namaPemilikRekening || null } : {}),
    },
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

// File size limit info (enforcement is at storage bucket level, this is for display)
const MAX_DOCUMENT_SIZE_MB = 5;

/**
 * SECURITY: Validate document path format
 * Path dikirim frontend adalah path RELATIF dalam bucket (bukan termasuk nama bucket).
 * Format valid: "<uuid>/ktp.jpg", "<uuid>/sim.png", dll.
 * Tidak boleh ada path traversal (..) atau karakter berbahaya.
 */
function isValidDocumentPath(path: string): boolean {
  // Pastikan tidak ada path traversal
  if (path.includes('..') || path.includes('~') || path.startsWith('/')) {
    return false;
  }
  // Format: folder/filename.ext (satu level subfolder, atau langsung filename)
  // Contoh valid: "abc-uuid/ktp.jpg", "abc-uuid/sim.png", "abc-uuid/ktp.pdf"
  const validPathPattern = /^[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_.\-]+$/;
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
    throw new AppError('Path dokumen tidak valid. Pastikan file diunggah dari halaman profil.', 400);
  }

  // SECURITY: Validate file extension
  const extension = getFileExtension(storagePath);
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
    throw new AppError(
      `Tipe file tidak diizinkan. Gunakan JPG, PNG, atau PDF (maks ${MAX_DOCUMENT_SIZE_MB}MB).`,
      400
    );
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

