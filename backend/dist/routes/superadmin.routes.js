"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superadminRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
const supabase_js_1 = require("@supabase/supabase-js");
exports.superadminRouter = (0, express_1.Router)();
// Semua endpoint Super Admin wajib verifikasi token + role super_admin
exports.superadminRouter.use(verifySupabaseToken_1.verifySupabaseToken, verifySupabaseToken_1.requireSuperAdmin);
// ============================================================================
// SCHEMAS
// ============================================================================
const verifyInstansiSchema = zod_1.z.object({
    action: zod_1.z.enum(['approve', 'reject']),
    alasan: zod_1.z.string().optional(),
});
const updateInstansiStatusSchema = zod_1.z.object({
    aktif: zod_1.z.boolean(),
});
const toggleUserStatusSchema = zod_1.z.object({
    aktif: zod_1.z.boolean(),
});
const approveCarSchema = zod_1.z.object({
    action: zod_1.z.enum(['approve', 'reject']),
    alasan: zod_1.z.string().optional(),
});
const createAdminSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email tidak valid'),
    password: zod_1.z.string().min(8, 'Password minimal 8 karakter'),
    nama: zod_1.z.string().min(2, 'Nama minimal 2 karakter'),
    noHp: zod_1.z.string().min(10, 'No HP minimal 10 digit'),
    instansiId: zod_1.z.string().uuid('ID Instansi tidak valid'),
});
// ============================================================================
// DASHBOARD
// ============================================================================
/**
 * GET /api/superadmin/dashboard
 * Statistik lintas-instansi untuk dashboard Super Admin
 */
exports.superadminRouter.get('/dashboard', async (_req, res) => {
    try {
        const [totalInstansiAktif, totalInstansiMenunggu, totalUsers, totalMobil, mobilMenungguApproval, bookings,] = await Promise.all([
            // Jumlah instansi aktif
            prisma_1.prisma.instansi.count({ where: { status: 'aktif' } }),
            // Jumlah instansi menunggu verifikasi
            prisma_1.prisma.instansi.count({ where: { status: 'menunggu_verifikasi' } }),
            // Total users (kecuali super_admin)
            prisma_1.prisma.profile.count({ where: { role: { not: 'super_admin' } } }),
            // Total mobil
            prisma_1.prisma.car.count(),
            // Mobil waiting approval
            prisma_1.prisma.car.count({ where: { statusApproval: 'menunggu_persetujuan' } }),
            // Booking stats
            prisma_1.prisma.booking.findMany({
                select: {
                    status: true,
                    totalHarga: true,
                    car: { select: { instansiId: true } },
                },
            }),
        ]);
        // Hitung total pendapatan
        let totalPendapatan = 0;
        const bookingCounts = {};
        for (const booking of bookings) {
            totalPendapatan += Number(booking.totalHarga);
            if (!bookingCounts[booking.status]) {
                bookingCounts[booking.status] = 0;
            }
            bookingCounts[booking.status]++;
        }
        // Estimasi komisi (10% default)
        const totalKomisi = totalPendapatan * 0.1;
        res.json({
            data: {
                totalInstansiAktif,
                totalInstansiMenunggu,
                totalUsers,
                totalMobil,
                mobilMenungguApproval,
                totalPendapatanPlatform: totalPendapatan,
                totalKomisiTerkumpul: totalKomisi,
                bookingStats: bookingCounts,
            },
        });
    }
    catch (error) {
        console.error('Super Admin Dashboard error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Gagal mengambil data dashboard', details: message });
    }
});
// ============================================================================
// INSTANSI MANAGEMENT
// ============================================================================
/**
 * GET /api/superadmin/instansi
 * List semua instansi dengan filter
 */
exports.superadminRouter.get('/instansi', async (req, res) => {
    const { status, cari } = req.query;
    try {
        const instansi = await prisma_1.prisma.instansi.findMany({
            where: {
                ...(status && { status: status }),
                ...(cari && {
                    OR: [
                        { namaInstansi: { contains: String(cari), mode: 'insensitive' } },
                        { alamat: { contains: String(cari), mode: 'insensitive' } },
                    ],
                }),
            },
            include: {
                _count: {
                    select: {
                        cars: true,
                        profiles: { where: { role: 'admin' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ data: instansi });
    }
    catch (error) {
        console.error('List Instansi error:', error);
        res.status(500).json({ error: 'Gagal mengambil data instansi' });
    }
});
/**
 * GET /api/superadmin/instansi/:id
 * Detail satu instansi
 */
exports.superadminRouter.get('/instansi/:id', async (req, res) => {
    try {
        const instansi = await prisma_1.prisma.instansi.findUnique({
            where: { id: req.params.id },
            include: {
                cars: {
                    include: {
                        _count: { select: { bookings: true } },
                    },
                },
                profiles: { where: { role: 'admin' } },
                _count: {
                    select: {
                        cars: true,
                        profiles: { where: { role: 'admin' } },
                    },
                },
            },
        });
        if (!instansi) {
            res.status(404).json({ error: 'Instansi tidak ditemukan' });
            return;
        }
        res.json({ data: instansi });
    }
    catch (error) {
        console.error('Detail Instansi error:', error);
        res.status(500).json({ error: 'Gagal mengambil detail instansi' });
    }
});
/**
 * PATCH /api/superadmin/instansi/:id/verifikasi
 * Approve atau reject pendaftaran instansi
 */
exports.superadminRouter.patch('/instansi/:id/verifikasi', async (req, res) => {
    const parsed = verifyInstansiSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { action, alasan } = parsed.data;
    try {
        const instansi = await prisma_1.prisma.instansi.findUnique({ where: { id: req.params.id } });
        if (!instansi) {
            res.status(404).json({ error: 'Instansi tidak ditemukan' });
            return;
        }
        if (instansi.status !== 'menunggu_verifikasi') {
            res.status(400).json({ error: 'Instansi sudah pernah diproses' });
            return;
        }
        const updated = await prisma_1.prisma.instansi.update({
            where: { id: req.params.id },
            data: {
                status: action === 'approve' ? 'aktif' : 'nonaktif',
            },
        });
        res.json({
            data: updated,
            message: action === 'approve'
                ? 'Instansi berhasil disetujui'
                : 'Instansi ditolak',
        });
    }
    catch (error) {
        console.error('Verify Instansi error:', error);
        res.status(500).json({ error: 'Gagal memproses verifikasi instansi' });
    }
});
/**
 * PATCH /api/superadmin/instansi/:id/status
 * Aktifkan atau nonaktifkan instansi
 */
exports.superadminRouter.patch('/instansi/:id/status', async (req, res) => {
    const parsed = updateInstansiStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    try {
        const updated = await prisma_1.prisma.instansi.update({
            where: { id: req.params.id },
            data: {
                status: parsed.data.aktif ? 'aktif' : 'nonaktif',
            },
        });
        res.json({ data: updated });
    }
    catch (error) {
        console.error('Update Instansi Status error:', error);
        res.status(500).json({ error: 'Gagal mengupdate status instansi' });
    }
});
/**
 * POST /api/superadmin/instansi
 * Buat instansi baru
 */
const createInstansiSchema = zod_1.z.object({
    namaInstansi: zod_1.z.string().min(2, 'Nama instansi minimal 2 karakter'),
    alamat: zod_1.z.string().min(5, 'Alamat minimal 5 karakter'),
    noHpPic: zod_1.z.string().min(10, 'No HP minimal 10 digit'),
    emailPic: zod_1.z.string().email('Email tidak valid'),
    rekeningBank: zod_1.z.string().optional(),
    komisiPlatformPersen: zod_1.z.number().min(0).max(100).default(10),
});
exports.superadminRouter.post('/instansi', async (req, res) => {
    const parsed = createInstansiSchema.safeParse(req.body);
    if (!parsed.success) {
        const message = parsed.error.issues?.[0]?.message ?? 'Data tidak valid';
        res.status(400).json({ error: message });
        return;
    }
    try {
        const instansi = await prisma_1.prisma.instansi.create({
            data: {
                namaInstansi: parsed.data.namaInstansi,
                alamat: parsed.data.alamat,
                noHpPic: parsed.data.noHpPic,
                emailPic: parsed.data.emailPic,
                rekeningBank: parsed.data.rekeningBank,
                komisiPlatformPersen: parsed.data.komisiPlatformPersen,
                status: 'menunggu_verifikasi',
            },
        });
        res.status(201).json({ data: instansi });
    }
    catch (error) {
        console.error('Create Instansi error:', error);
        res.status(500).json({ error: 'Gagal membuat instansi' });
    }
});
/**
 * PUT /api/superadmin/instansi/:id
 * Update data instansi
 */
const updateInstansiSchema = zod_1.z.object({
    namaInstansi: zod_1.z.string().min(2).optional(),
    alamat: zod_1.z.string().min(5).optional(),
    noHpPic: zod_1.z.string().min(10).optional(),
    emailPic: zod_1.z.string().email().optional(),
    rekeningBank: zod_1.z.string().nullable().optional(),
    komisiPlatformPersen: zod_1.z.number().min(0).max(100).optional(),
});
exports.superadminRouter.put('/instansi/:id', async (req, res) => {
    const parsed = updateInstansiSchema.safeParse(req.body);
    if (!parsed.success) {
        const message = parsed.error.issues?.[0]?.message ?? 'Data tidak valid';
        res.status(400).json({ error: message });
        return;
    }
    try {
        const existing = await prisma_1.prisma.instansi.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ error: 'Instansi tidak ditemukan' });
            return;
        }
        const updated = await prisma_1.prisma.instansi.update({
            where: { id: req.params.id },
            data: {
                ...(parsed.data.namaInstansi && { namaInstansi: parsed.data.namaInstansi }),
                ...(parsed.data.alamat && { alamat: parsed.data.alamat }),
                ...(parsed.data.noHpPic && { noHpPic: parsed.data.noHpPic }),
                ...(parsed.data.emailPic && { emailPic: parsed.data.emailPic }),
                ...(parsed.data.rekeningBank !== undefined && { rekeningBank: parsed.data.rekeningBank }),
                ...(parsed.data.komisiPlatformPersen && { komisiPlatformPersen: parsed.data.komisiPlatformPersen }),
            },
        });
        res.json({ data: updated });
    }
    catch (error) {
        console.error('Update Instansi error:', error);
        res.status(500).json({ error: 'Gagal mengupdate instansi' });
    }
});
/**
 * DELETE /api/superadmin/instansi/:id
 * Hapus instansi
 */
exports.superadminRouter.delete('/instansi/:id', async (req, res) => {
    try {
        const existing = await prisma_1.prisma.instansi.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { cars: true, profiles: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Instansi tidak ditemukan' });
            return;
        }
        if (existing._count.cars > 0 || existing._count.profiles > 0) {
            res.status(400).json({
                error: 'Tidak bisa hapus instansi yang masih memiliki data',
                detail: `${existing._count.cars} mobil, ${existing._count.profiles} profile terkait`,
            });
            return;
        }
        await prisma_1.prisma.instansi.delete({ where: { id: req.params.id } });
        res.json({ message: 'Instansi berhasil dihapus' });
    }
    catch (error) {
        console.error('Delete Instansi error:', error);
        res.status(500).json({ error: 'Gagal menghapus instansi' });
    }
});
// ============================================================================
// ADMIN MANAGEMENT
// ============================================================================
/**
 * POST /api/superadmin/admin
 * Membuat akun admin baru untuk instansi tertentu
 */
exports.superadminRouter.post('/admin', async (req, res) => {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
        const message = parsed.error.issues?.[0]?.message ?? parsed.error.message ?? 'Validation error';
        res.status(400).json({ error: message });
        return;
    }
    const { email, password, nama, noHp, instansiId } = parsed.data;
    // Validasi instansi exists
    const instansi = await prisma_1.prisma.instansi.findUnique({ where: { id: instansiId } });
    if (!instansi) {
        res.status(404).json({ error: 'Instansi tidak ditemukan' });
        return;
    }
    // Check email belum terdaftar
    const existingProfile = await prisma_1.prisma.profile.findUnique({ where: { email } });
    if (existingProfile) {
        res.status(409).json({ error: 'Email sudah terdaftar' });
        return;
    }
    try {
        // Buat user via Supabase Auth Admin API
        const supabaseAdmin = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nama, no_hp: noHp },
        });
        if (authError || !authUser.user) {
            console.error('Auth create error:', authError);
            res.status(400).json({ error: authError?.message ?? 'Gagal membuat user auth' });
            return;
        }
        // Buat profile dengan role admin
        const profile = await prisma_1.prisma.profile.create({
            data: {
                id: authUser.user.id,
                email,
                nama,
                noHp,
                role: 'admin',
                instansiId,
                aktif: true,
            },
        });
        res.status(201).json({
            data: {
                id: profile.id,
                email: profile.email,
                nama: profile.nama,
                noHp: profile.noHp,
                role: profile.role,
                instansiId: profile.instansiId,
                aktif: profile.aktif,
            },
        });
    }
    catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Gagal membuat akun admin' });
    }
});
// ============================================================================
// USER MANAGEMENT
// ============================================================================
/**
 * GET /api/superadmin/pengguna
 * List semua user (customer + admin)
 */
exports.superadminRouter.get('/pengguna', async (req, res) => {
    const { role, cari } = req.query;
    try {
        const users = await prisma_1.prisma.profile.findMany({
            where: {
                ...(role && role !== 'all' && { role: role }),
                ...(cari && {
                    OR: [
                        { nama: { contains: String(cari), mode: 'insensitive' } },
                        { email: { contains: String(cari), mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nama: true,
                email: true,
                noHp: true,
                role: true,
                aktif: true,
                dokumenVerified: true,
                createdAt: true,
                instansi: {
                    select: {
                        id: true,
                        namaInstansi: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ data: users });
    }
    catch (error) {
        console.error('List Pengguna error:', error);
        res.status(500).json({ error: 'Gagal mengambil data pengguna' });
    }
});
/**
 * PATCH /api/superadmin/pengguna/:id/status
 * Toggle aktif/nonaktif user
 */
exports.superadminRouter.patch('/pengguna/:id/status', async (req, res) => {
    const parsed = toggleUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    try {
        // Prevent self-deactivation
        if (req.user.id === req.params.id) {
            res.status(400).json({ error: 'Tidak dapat mengubah status akun sendiri' });
            return;
        }
        const updated = await prisma_1.prisma.profile.update({
            where: { id: req.params.id },
            data: { aktif: parsed.data.aktif },
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                aktif: true,
            },
        });
        res.json({ data: updated });
    }
    catch (error) {
        console.error('Toggle User Status error:', error);
        res.status(500).json({ error: 'Gagal mengupdate status pengguna' });
    }
});
// ============================================================================
// CAR APPROVAL
// ============================================================================
/**
 * GET /api/superadmin/armada/approval
 * List mobil yang menunggu persetujuan
 */
exports.superadminRouter.get('/armada/approval', async (req, res) => {
    const { instansiId } = req.query;
    try {
        const cars = await prisma_1.prisma.car.findMany({
            where: {
                statusApproval: 'menunggu_persetujuan',
                ...(instansiId && { instansiId: String(instansiId) }),
            },
            include: {
                instansi: {
                    select: {
                        id: true,
                        namaInstansi: true,
                    },
                },
                images: { take: 1 },
            },
            orderBy: { createdAt: 'asc' }, // oldest first = FIFO
        });
        res.json({ data: cars });
    }
    catch (error) {
        console.error('List Approval Cars error:', error);
        res.status(500).json({ error: 'Gagal mengambil data antrian approval' });
    }
});
/**
 * PATCH /api/superadmin/armada/:id/approval
 * Approve atau reject mobil
 */
exports.superadminRouter.patch('/armada/:id/approval', async (req, res) => {
    const parsed = approveCarSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { action, alasan } = parsed.data;
    try {
        const car = await prisma_1.prisma.car.findUnique({ where: { id: req.params.id } });
        if (!car) {
            res.status(404).json({ error: 'Mobil tidak ditemukan' });
            return;
        }
        if (car.statusApproval !== 'menunggu_persetujuan') {
            res.status(400).json({ error: 'Mobil sudah pernah diproses' });
            return;
        }
        const updated = await prisma_1.prisma.car.update({
            where: { id: req.params.id },
            data: {
                statusApproval: action === 'approve' ? 'disetujui' : 'ditolak',
                alasanPenolakan: action === 'reject' ? (alasan ?? null) : null,
                // Jika disetujui, auto-set status ke tersedia
                ...(action === 'approve' && { status: 'tersedia' }),
            },
        });
        res.json({
            data: updated,
            message: action === 'approve'
                ? 'Mobil berhasil disetujui dan siap tayang'
                : 'Mobil ditolak',
        });
    }
    catch (error) {
        console.error('Approve/Reject Car error:', error);
        res.status(500).json({ error: 'Gagal memproses approval mobil' });
    }
});
// ============================================================================
// DISBURSEMENT MANAGEMENT
// ============================================================================
/**
 * GET /api/superadmin/disbursements
 * List semua disbursement lintas platform
 */
exports.superadminRouter.get('/disbursements', async (req, res) => {
    const { instansiId, status, dari, sampai } = req.query;
    try {
        const disbursements = await prisma_1.prisma.disbursement.findMany({
            where: {
                ...(instansiId && { instansiId: String(instansiId) }),
                ...(status && { status: status }),
                ...((dari || sampai) && {
                    createdAt: {
                        ...(dari && { gte: new Date(String(dari)) }),
                        ...(sampai && { lte: new Date(String(sampai)) }),
                    },
                }),
            },
            include: {
                instansi: {
                    select: {
                        id: true,
                        namaInstansi: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        bookingId: true,
                        jumlahKotor: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ data: disbursements });
    }
    catch (error) {
        console.error('List Disbursements error:', error);
        res.status(500).json({ error: 'Gagal mengambil data pencairan' });
    }
});
// ============================================================================
// DASHBOARD ANALYTICS ENDPOINTS
// ============================================================================
/**
 * GET /api/superadmin/dashboard/analytics
 * Revenue and booking analytics with time period filter
 */
exports.superadminRouter.get('/dashboard/analytics', async (req, res) => {
    const { period = '30d' } = req.query;
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    let days;
    switch (period) {
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            days = 7;
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            days = 30;
            break;
        case '6m':
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            days = 180;
            break;
        case '1y':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            days = 365;
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            days = 30;
    }
    try {
        // Get bookings for the period
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: startDate },
                status: { not: 'dibatalkan' },
            },
            select: {
                id: true,
                totalHarga: true,
                status: true,
                createdAt: true,
            },
        });
        // Calculate daily revenue
        const dailyRevenue = {};
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailyRevenue[dateStr] = 0;
        }
        for (const booking of bookings) {
            const dateStr = booking.createdAt.toISOString().split('T')[0];
            if (dailyRevenue[dateStr] !== undefined) {
                dailyRevenue[dateStr] += Number(booking.totalHarga);
            }
        }
        // Convert to array format for charts
        const revenueData = Object.entries(dailyRevenue)
            .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Calculate total revenue
        const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
        // Booking status breakdown
        const bookingStatusCounts = bookings.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});
        // Convert status keys to readable format
        const statusLabels = {
            'menunggu_pembayaran': 'Menunggu Bayar',
            'dikonfirmasi': 'Dikonfirmasi',
            'berjalan': 'Berjalan',
            'selesai': 'Selesai',
            'dibatalkan': 'Dibatalkan',
        };
        const bookingStatusData = Object.entries(bookingStatusCounts).map(([status, count]) => ({
            status: statusLabels[status] || status,
            statusKey: status,
            count,
        }));
        res.json({
            data: {
                revenueData,
                totalRevenue,
                bookingStatusData,
                period,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
            },
        });
    }
    catch (error) {
        console.error('Dashboard Analytics error:', error);
        res.status(500).json({ error: 'Gagal mengambil data analytics' });
    }
});
/**
 * GET /api/superadmin/dashboard/activities
 * Recent activities for timeline
 */
exports.superadminRouter.get('/dashboard/activities', async (_req, res) => {
    try {
        const activities = await prisma_1.prisma.dashboardActivity.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        res.json({ data: activities });
    }
    catch (error) {
        console.error('Dashboard Activities error:', error);
        res.status(500).json({ error: 'Gagal mengambil data aktivitas' });
    }
});
/**
 * GET /api/superadmin/dashboard/approvals
 * Pending approvals summary
 */
exports.superadminRouter.get('/dashboard/approvals', async (_req, res) => {
    try {
        const [pendingInstansi, pendingVehicles] = await Promise.all([
            prisma_1.prisma.instansi.count({ where: { status: 'menunggu_verifikasi' } }),
            prisma_1.prisma.car.count({ where: { statusApproval: 'menunggu_persetujuan' } }),
        ]);
        // Count pending drivers (profiles with no SIM verified)
        const pendingDrivers = await prisma_1.prisma.profile.count({
            where: {
                role: 'customer',
                dokumenSimUrl: null,
            },
        });
        // Count pending payments using raw SQL with explicit casting to work around enum issues
        const pendingPaymentsResult = await prisma_1.prisma.$queryRaw `
      SELECT COUNT(*) as count FROM payments WHERE status::text = 'pending'
    `;
        const pendingPayments = Number(pendingPaymentsResult[0]?.count ?? 0);
        res.json({
            data: {
                rentalCompanies: pendingInstansi,
                vehicles: pendingVehicles,
                drivers: pendingDrivers,
                payments: pendingPayments,
                total: pendingInstansi + pendingVehicles + pendingDrivers + pendingPayments,
            },
        });
    }
    catch (error) {
        console.error('Dashboard Approvals error:', error);
        res.status(500).json({ error: 'Gagal mengambil data approval' });
    }
});
/**
 * GET /api/superadmin/dashboard/notifications
 * Notification list
 */
exports.superadminRouter.get('/dashboard/notifications', async (req, res) => {
    const { unreadOnly } = req.query;
    try {
        const notifications = await prisma_1.prisma.notification.findMany({
            where: {
                ...(unreadOnly === 'true' && { isRead: false }),
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const unreadCount = await prisma_1.prisma.notification.count({ where: { isRead: false } });
        res.json({ data: notifications, unreadCount });
    }
    catch (error) {
        console.error('Dashboard Notifications error:', error);
        res.status(500).json({ error: 'Gagal mengambil notifikasi' });
    }
});
/**
 * PATCH /api/superadmin/dashboard/notifications/:id/read
 * Mark notification as read
 */
exports.superadminRouter.patch('/dashboard/notifications/:id/read', async (req, res) => {
    try {
        const notification = await prisma_1.prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true },
        });
        res.json({ data: notification });
    }
    catch (error) {
        console.error('Mark Notification Read error:', error);
        res.status(500).json({ error: 'Gagal mengupdate notifikasi' });
    }
});
/**
 * GET /api/superadmin/dashboard/top-companies
 * Top rental companies by revenue
 */
exports.superadminRouter.get('/dashboard/top-companies', async (_req, res) => {
    try {
        // Get total revenue per instansi from bookings
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                status: { not: 'dibatalkan' },
                car: {
                    instansi: { status: 'aktif' },
                },
            },
            select: {
                totalHarga: true,
                car: { select: { instansiId: true } },
            },
        });
        // Calculate revenue per instansi
        const revenueByInstansi = {};
        for (const booking of bookings) {
            const instId = booking.car.instansiId;
            revenueByInstansi[instId] = (revenueByInstansi[instId] || 0) + Number(booking.totalHarga);
        }
        // Get instansi details and combine
        const allInstansi = await prisma_1.prisma.instansi.findMany({
            where: { status: 'aktif' },
            select: {
                id: true,
                namaInstansi: true,
                createdAt: true,
            },
        });
        const topCompanies = allInstansi
            .map((inst) => ({
            id: inst.id,
            namaInstansi: inst.namaInstansi,
            totalRevenue: revenueByInstansi[inst.id] || 0,
            memberSince: inst.createdAt,
        }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);
        // Calculate growth (simulated - comparing last 30 days vs previous 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const recentBookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                status: { not: 'dibatalkan' },
            },
            select: {
                totalHarga: true,
                car: { select: { instansiId: true } },
            },
        });
        const previousBookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
                status: { not: 'dibatalkan' },
            },
            select: {
                totalHarga: true,
                car: { select: { instansiId: true } },
            },
        });
        const recentRevenueByInstansi = {};
        const previousRevenueByInstansi = {};
        for (const b of recentBookings) {
            recentRevenueByInstansi[b.car.instansiId] = (recentRevenueByInstansi[b.car.instansiId] || 0) + Number(b.totalHarga);
        }
        for (const b of previousBookings) {
            previousRevenueByInstansi[b.car.instansiId] = (previousRevenueByInstansi[b.car.instansiId] || 0) + Number(b.totalHarga);
        }
        const topCompaniesWithGrowth = topCompanies.map((company) => {
            const recent = recentRevenueByInstansi[company.id] || 0;
            const previous = previousRevenueByInstansi[company.id] || 0;
            const growth = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;
            return { ...company, growth };
        });
        res.json({ data: topCompaniesWithGrowth });
    }
    catch (error) {
        console.error('Dashboard Top Companies error:', error);
        res.status(500).json({ error: 'Gagal mengambil data perusahaan teratas' });
    }
});
/**
 * GET /api/superadmin/dashboard/popular-vehicles
 * Most booked vehicles
 */
exports.superadminRouter.get('/dashboard/popular-vehicles', async (_req, res) => {
    try {
        const vehicles = await prisma_1.prisma.car.findMany({
            where: {
                statusApproval: 'disetujui',
                status: 'tersedia',
            },
            include: {
                images: { take: 1, orderBy: { urutan: 'asc' } },
                _count: {
                    select: { bookings: true },
                },
            },
            orderBy: {
                bookings: { _count: 'desc' },
            },
            take: 6,
        });
        const popularVehicles = vehicles.map((v) => ({
            id: v.id,
            nama: v.nama,
            kategori: v.kategori,
            thumbnail: v.images[0]?.url || null,
            bookingCount: v._count.bookings,
            available: v.status === 'tersedia',
        }));
        res.json({ data: popularVehicles });
    }
    catch (error) {
        console.error('Dashboard Popular Vehicles error:', error);
        res.status(500).json({ error: 'Gagal mengambil data kendaraan populer' });
    }
});
/**
 * GET /api/superadmin/dashboard/commission
 * Monthly commission stats
 */
exports.superadminRouter.get('/dashboard/commission', async (_req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        // Current month bookings
        const currentMonthBookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: startOfMonth },
                status: { not: 'dibatalkan' },
            },
            select: { totalHarga: true },
        });
        // Last month bookings
        const lastMonthBookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
                status: { not: 'dibatalkan' },
            },
            select: { totalHarga: true },
        });
        const currentMonthRevenue = currentMonthBookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);
        const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);
        const commission = currentMonthRevenue * 0.1; // 10% platform commission
        const lastMonthCommission = lastMonthRevenue * 0.1;
        // Commission target (simulated - 80% of last month)
        const targetCommission = lastMonthCommission * 1.2;
        const targetProgress = targetCommission > 0 ? Math.min(Math.round((commission / targetCommission) * 100), 100) : 0;
        res.json({
            data: {
                revenue: currentMonthRevenue,
                commission,
                lastMonthCommission,
                targetCommission,
                targetProgress,
                growth: lastMonthCommission > 0 ? Math.round(((commission - lastMonthCommission) / lastMonthCommission) * 100) : 0,
            },
        });
    }
    catch (error) {
        console.error('Dashboard Commission error:', error);
        res.status(500).json({ error: 'Gagal mengambil data komisi' });
    }
});
/**
 * GET /api/superadmin/dashboard/system-health
 * System health status (simulated - real implementation would check actual services)
 */
exports.superadminRouter.get('/dashboard/system-health', async (_req, res) => {
    try {
        // In a real implementation, this would check:
        // - Database connection
        // - External API services (Xendit, Supabase)
        // - Storage buckets
        // - Queue workers
        // For now, return simulated healthy status
        const systemHealth = {
            server: { status: 'online', uptime: '99.9%' },
            database: { status: 'online', latency: '< 10ms' },
            storage: { status: 'online', usage: '45%' },
            api: { status: 'online', requestsPerMinute: 150 },
            cpu: { status: 'healthy', usage: '35%' },
        };
        // Check if any critical issues exist in disbursements using raw SQL
        const [failedResult, pendingResult] = await Promise.all([
            prisma_1.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM disbursements WHERE status::text = 'gagal'
      `,
            prisma_1.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM disbursements WHERE status::text = 'diproses'
      `,
        ]);
        const failedDisbursements = Number(failedResult[0]?.count ?? 0);
        const pendingDisbursements = Number(pendingResult[0]?.count ?? 0);
        res.json({
            data: {
                ...systemHealth,
                alerts: {
                    failedDisbursements,
                    pendingDisbursements,
                },
            },
        });
    }
    catch (error) {
        console.error('Dashboard System Health error:', error);
        res.status(500).json({ error: 'Gagal mengambil data kesehatan sistem' });
    }
});
/**
 * GET /api/superadmin/dashboard/platform-summary
 * Platform-wide summary statistics
 */
exports.superadminRouter.get('/dashboard/platform-summary', async (_req, res) => {
    try {
        const [totalInstansi, totalVehicles, totalBookings, totalCustomers, totalRevenue, disbursements,] = await Promise.all([
            prisma_1.prisma.instansi.count({ where: { status: 'aktif' } }),
            prisma_1.prisma.car.count({ where: { statusApproval: 'disetujui' } }),
            prisma_1.prisma.booking.count(),
            prisma_1.prisma.profile.count({ where: { role: 'customer' } }),
            prisma_1.prisma.booking.aggregate({
                where: { status: { not: 'dibatalkan' } },
                _sum: { totalHarga: true },
            }),
            prisma_1.prisma.disbursement.aggregate({
                _sum: { komisiPlatform: true },
            }),
        ]);
        // Calculate average monthly revenue (last 12 months)
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const yearlyRevenue = await prisma_1.prisma.booking.aggregate({
            where: {
                createdAt: { gte: twelveMonthsAgo },
                status: { not: 'dibatalkan' },
            },
            _sum: { totalHarga: true },
        });
        const avgMonthlyRevenue = yearlyRevenue._sum.totalHarga
            ? Number(yearlyRevenue._sum.totalHarga) / 12
            : 0;
        res.json({
            data: {
                totalRentalCompanies: totalInstansi,
                totalVehicles,
                totalBookings,
                totalCustomers,
                totalRevenue: Number(totalRevenue._sum.totalHarga) || 0,
                avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
                platformCommission: Number(disbursements._sum.komisiPlatform) || 0,
            },
        });
    }
    catch (error) {
        console.error('Dashboard Platform Summary error:', error);
        res.status(500).json({ error: 'Gagal mengambil ringkasan platform' });
    }
});
/**
 * GET /api/superadmin/dashboard/today-bookings
 * Today's booking summary
 */
exports.superadminRouter.get('/dashboard/today-bookings', async (_req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const todayBookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: today, lt: tomorrow },
            },
            select: { status: true },
        });
        const statusCounts = todayBookings.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});
        res.json({
            data: {
                total: todayBookings.length,
                completed: statusCounts['selesai'] || 0,
                running: statusCounts['berjalan'] || 0,
                pending: (statusCounts['menunggu_pembayaran'] || 0) + (statusCounts['dikonfirmasi'] || 0),
                cancelled: statusCounts['dibatalkan'] || 0,
            },
        });
    }
    catch (error) {
        console.error('Dashboard Today Bookings error:', error);
        res.status(500).json({ error: 'Gagal mengambil data booking hari ini' });
    }
});
//# sourceMappingURL=superadmin.routes.js.map