"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
exports.profilesRouter = (0, express_1.Router)();
exports.profilesRouter.use(verifySupabaseToken_1.verifySupabaseToken);
/** GET /api/profiles/me */
exports.profilesRouter.get('/me', async (req, res) => {
    const profile = await prisma_1.prisma.profile.findUnique({ where: { id: req.user.id } });
    res.json({ data: profile });
});
const updateProfileSchema = zod_1.z.object({
    nama: zod_1.z.string().trim().min(1).optional(),
    noHp: zod_1.z.string().trim().min(1).optional(),
    noKtp: zod_1.z.string().trim().min(1).optional(),
    noSim: zod_1.z.string().trim().min(1).optional(),
});
/** PATCH /api/profiles/me */
exports.profilesRouter.patch('/me', async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const updated = await prisma_1.prisma.profile.update({
        where: { id: req.user.id },
        data: parsed.data,
    });
    res.json({ data: updated });
});
const dokumenSchema = zod_1.z.object({
    tipe: zod_1.z.enum(['ktp', 'sim']),
    /** Path objek di bucket privat `dokumen-penyewa`, BUKAN URL publik. */
    storagePath: zod_1.z.string().trim().min(1),
});
/**
 * POST /api/profiles/me/dokumen — F8 PRD.
 * Frontend sudah meng-upload file KTP/SIM langsung ke bucket privat
 * `dokumen-penyewa` lewat supabase-js (anon key). Endpoint ini cuma
 * menyimpan REFERENSI path-nya ke kolom profiles yang sesuai, dan
 * me-reset status verifikasi supaya admin tahu ada dokumen baru untuk
 * diperiksa.
 */
exports.profilesRouter.post('/me/dokumen', async (req, res) => {
    const parsed = dokumenSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { tipe, storagePath } = parsed.data;
    const updated = await prisma_1.prisma.profile.update({
        where: { id: req.user.id },
        data: {
            ...(tipe === 'ktp' ? { dokumenKtpUrl: storagePath } : { dokumenSimUrl: storagePath }),
            dokumenVerified: false,
        },
    });
    res.json({ data: updated });
});
//# sourceMappingURL=profiles.routes.js.map