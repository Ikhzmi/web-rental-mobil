"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDokumenRouter = exports.adminUsersRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
exports.adminUsersRouter = (0, express_1.Router)();
exports.adminDokumenRouter = (0, express_1.Router)();
exports.adminUsersRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireAdmin);
exports.adminDokumenRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireAdmin);
const listUsersSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    cari: zod_1.z.string().trim().optional(),
});
/** GET /api/admin/users — F12 dengan pagination. */
exports.adminUsersRouter.get('/', async (req, res) => {
    const parsed = listUsersSchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: 'Query tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { page, limit, cari } = parsed.data;
    const skip = (page - 1) * limit;
    // Admin scoping: filter users by admin's instansiId
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
        return;
    }
    const where = {
        instansiId, // Admin scoping - only show users from same instansi
        ...(cari && {
            OR: [
                { nama: { contains: cari, mode: 'insensitive' } },
                { email: { contains: cari, mode: 'insensitive' } },
            ],
        }),
    };
    const [users, total] = await Promise.all([
        prisma_1.prisma.profile.findMany({
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
        prisma_1.prisma.profile.count({ where }),
    ]);
    res.json({
        data: users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});
const statusSchema = zod_1.z.object({
    aktif: zod_1.z.boolean(),
});
/** PATCH /api/admin/users/:id/status — F12. */
exports.adminUsersRouter.patch('/:id/status', async (req, res) => {
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
    const targetUser = await prisma_1.prisma.profile.findUnique({
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
    const user = await prisma_1.prisma.profile
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
 */
exports.adminDokumenRouter.get('/:userId/signed-url', async (req, res) => {
    const tipe = req.query.tipe === 'sim' ? 'sim' : 'ktp';
    // Admin scoping
    const instansiId = req.user?.instansiId;
    if (!instansiId) {
        res.status(403).json({ error: 'Instansi tidak ditemukan untuk admin ini' });
        return;
    }
    const profile = await prisma_1.prisma.profile.findUnique({
        where: { id: req.params.userId, instansiId },
        select: { dokumenKtpUrl: true, dokumenSimUrl: true },
    });
    if (!profile) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        return;
    }
    const storagePath = tipe === 'sim' ? profile?.dokumenSimUrl : profile?.dokumenKtpUrl;
    if (!storagePath) {
        res.status(404).json({ error: `Dokumen ${tipe.toUpperCase()} belum diunggah pengguna ini` });
        return;
    }
    const { data, error } = await supabaseAdmin_1.supabaseAdmin.storage
        .from('dokumen-penyewa')
        .createSignedUrl(storagePath, 60 * 2); // 2 menit (dikurangi dari 5 menit untuk security)
    if (error || !data) {
        console.error('Gagal membuat signed URL:', error);
        res.status(500).json({ error: 'Gagal membuat signed URL' });
        return;
    }
    res.json({ data: { signedUrl: data.signedUrl, expiresInSeconds: 120 } });
});
//# sourceMappingURL=adminUsers.routes.js.map