"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopeToInstansi = scopeToInstansi;
/**
 * Middleware scopeToInstansi - CRITICAL untuk multi-tenancy security
 *
 * Fungsi:
 * - Untuk role 'super_admin': bypass sepenuhnya (bisa akses semua data)
 * - Untuk role 'admin': wajib punya instansiId, inject filter ke request
 * - Untuk role 'customer': bypass (customer tidak punya scoping)
 *
 * Penggunaan:
 * Pasang di router level untuk semua endpoint /api/instansi/* dan /api/admin/*
 * untuk memastikan admin satu instansi tidak bisa akses data instansi lain.
 *
 * Contoh penggunaan di route:
 * ```typescript
 * router.get('/', verifySupabaseToken, requireRole('admin'), scopeToInstansi, async (req, res) => {
 *   // req.instansiScope.instansiId bisa dipakai untuk filter query
 *   const cars = await prisma.car.findMany({
 *     where: { instansiId: req.instansiScope?.instansiId }
 *   });
 * });
 * ```
 */
function scopeToInstansi(req, res, next) {
    // Super Admin bypass - bisa akses semua data lintas instansi
    if (req.user?.role === 'super_admin') {
        next();
        return;
    }
    // Customer bypass - customer hanya akses data sendiri (handled by other middleware)
    if (req.user?.role === 'customer') {
        next();
        return;
    }
    // Admin harus punya instansiId yang terikat
    if (req.user?.role === 'admin') {
        if (!req.user.instansiId) {
            res.status(403).json({
                error: 'Akun admin tidak terikat ke instansi manapun. Hubungi Super Admin.',
            });
            return;
        }
        // Simpan scoping filter di request untuk dipakai di route handler
        req.instansiScope = { instansiId: req.user.instansiId };
        next();
        return;
    }
    // Fallback - seharusnya tidak tercapai karena verifySupabaseToken sudah filter
    res.status(403).json({ error: 'Akses ditolak' });
}
//# sourceMappingURL=scopeToInstansi.js.map