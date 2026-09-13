"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
const errorHandler_1 = require("../lib/errorHandler");
exports.profilesRouter = (0, express_1.Router)();
exports.profilesRouter.use(verifySupabaseToken_1.verifySupabaseToken);
/** GET /api/profiles/me */
exports.profilesRouter.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const profile = await prisma_1.prisma.profile.findUnique({ where: { id: req.user.id } });
    if (!profile) {
        throw new errorHandler_1.AppError('Profil tidak ditemukan', 404);
    }
    res.json({ data: profile });
}));
const updateProfileSchema = zod_1.z.object({
    nama: zod_1.z.string().trim().min(1).optional(),
    noHp: zod_1.z.string().trim().min(1).optional(),
    // noKtp dan noSim boleh kosong (string kosong) karena opsional
    noKtp: zod_1.z.string().trim().optional(),
    noSim: zod_1.z.string().trim().optional(),
    alamat: zod_1.z.string().trim().optional(),
    namaBank: zod_1.z.string().trim().optional(),
    nomorRekening: zod_1.z.string().trim().optional(),
    namaPemilikRekening: zod_1.z.string().trim().optional(),
});
/** PATCH /api/profiles/me */
exports.profilesRouter.patch('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Data tidak valid', 400);
    }
    const { alamat, noKtp, noSim, namaBank, nomorRekening, namaPemilikRekening, ...rest } = parsed.data;
    const updated = await prisma_1.prisma.profile.update({
        where: { id: req.user.id },
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
const dokumenSchema = zod_1.z.object({
    tipe: zod_1.z.enum(['ktp', 'sim']),
    /** Path objek di bucket privat `dokumen-penyewa`, BUKAN URL publik. */
    storagePath: zod_1.z.string().trim().min(1),
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
function isValidDocumentPath(path) {
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
function getFileExtension(path) {
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
exports.profilesRouter.post('/me/dokumen', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const parsed = dokumenSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new errorHandler_1.AppError('Data tidak valid', 400);
    }
    const { tipe, storagePath } = parsed.data;
    // SECURITY: Validate document path format
    if (!isValidDocumentPath(storagePath)) {
        throw new errorHandler_1.AppError('Path dokumen tidak valid. Pastikan file diunggah dari halaman profil.', 400);
    }
    // SECURITY: Validate file extension
    const extension = getFileExtension(storagePath);
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
        throw new errorHandler_1.AppError(`Tipe file tidak diizinkan. Gunakan JPG, PNG, atau PDF (maks ${MAX_DOCUMENT_SIZE_MB}MB).`, 400);
    }
    const updated = await prisma_1.prisma.profile.update({
        where: { id: req.user.id },
        data: {
            ...(tipe === 'ktp' ? { dokumenKtpUrl: storagePath } : { dokumenSimUrl: storagePath }),
            dokumenVerified: false,
        },
    });
    res.json({ data: updated });
}));
//# sourceMappingURL=profiles.routes.js.map