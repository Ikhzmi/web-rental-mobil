"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daftarInstansiSchema = exports.instansiRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const verifySupabaseToken_1 = require("../middleware/verifySupabaseToken");
// Schema untuk pendaftaran instansi baru (public)
const zod_1 = require("zod");
exports.instansiRouter = (0, express_1.Router)();
// Public endpoint - pendaftaran instansi baru
exports.daftarInstansiSchema = zod_1.z.object({
    namaInstansi: zod_1.z.string().trim().min(2),
    alamat: zod_1.z.string().trim().min(5),
    noHpPic: zod_1.z.string().trim().min(8),
    emailPic: zod_1.z.string().email(),
    dokumenLegalitasUrl: zod_1.z.string().url().optional(),
});
/**
 * POST /api/instansi/daftar
 * Pendaftaran instansi baru - publik, tanpa auth
 * Setelah submit, status = 'menunggu_verifikasi'
 */
exports.instansiRouter.post('/daftar', async (req, res) => {
    const parsed = exports.daftarInstansiSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
        return;
    }
    const { namaInstansi, alamat, noHpPic, emailPic, dokumenLegalitasUrl } = parsed.data;
    try {
        // Cek apakah email sudah terdaftar
        const existing = await prisma_1.prisma.instansi.findFirst({
            where: { emailPic },
        });
        if (existing) {
            res.status(409).json({ error: 'Email sudah terdaftar. Gunakan email lain.' });
            return;
        }
        const instansi = await prisma_1.prisma.instansi.create({
            data: {
                namaInstansi,
                alamat,
                noHpPic,
                emailPic,
                dokumenLegalitasUrl,
                status: 'menunggu_verifikasi',
            },
        });
        res.status(201).json({
            data: {
                id: instansi.id,
                namaInstansi: instansi.namaInstansi,
                status: instansi.status,
            },
            message: 'Pendaftaran berhasil. Tim kami akan memverifikasi dalam 1-2 hari kerja.',
        });
    }
    catch (error) {
        console.error('POST /api/instansi/daftar error:', error);
        res.status(500).json({ error: 'Gagal mendaftarkan instansi' });
    }
});
// ============================================================================
// ADMIN INSTANSI ENDPOINTS (Butuh Auth + Scoping)
// ============================================================================
// Semua endpoint di bawah butuh auth + admin role + instansi scoping
exports.instansiRouter.use(verifySupabaseToken_1.verifySupabaseToken, async (req, res, next) => {
    // Check if user is admin and has instansiId
    if (req.user?.role !== 'admin' || !req.user?.instansiId) {
        res.status(403).json({ error: 'Endpoint ini khusus admin instansi' });
        return;
    }
    // Attach instansiId to request
    req.instansiScope = { instansiId: req.user.instansiId };
    next();
});
/**
 * GET /api/instansi/profile
 * Info dasar instansi milik admin yang login, termasuk rate komisi
 * platform. Sebelumnya Admin TIDAK PUNYA cara sama sekali melihat rate
 * komisinya sendiri (padahal otomatis dipotong tiap pencairan dana) —
 * cuma SuperAdmin yang bisa lihat/ubah lewat halaman kelola instansi.
 */
exports.instansiRouter.get('/profile', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    try {
        const instansi = await prisma_1.prisma.instansi.findUnique({
            where: { id: instansiId },
            select: {
                id: true,
                namaInstansi: true,
                status: true,
                komisiPlatformPersen: true,
                rekeningBank: true,
            },
        });
        if (!instansi) {
            res.status(404).json({ error: 'Instansi tidak ditemukan' });
            return;
        }
        res.json({ data: instansi });
    }
    catch (error) {
        console.error('GET /api/instansi/profile error:', error);
        res.status(500).json({ error: 'Gagal mengambil data instansi' });
    }
});
/**
 * GET /api/instansi/dashboard
 * Statistik ringkasan milik instansi sendiri
 */
exports.instansiRouter.get('/dashboard', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    try {
        const [totalMobil, mobilTersedia, mobilMaintenance, bookingsThisMonth, completedBookings, disbursements, recentBookings,] = await Promise.all([
            // Total mobil
            prisma_1.prisma.car.count({ where: { instansiId } }),
            // Mobil tersedia
            prisma_1.prisma.car.count({ where: { instansiId, status: 'tersedia' } }),
            // Mobil maintenance
            prisma_1.prisma.car.count({ where: { instansiId, status: 'maintenance' } }),
            // Booking bulan ini
            prisma_1.prisma.booking.findMany({
                where: {
                    car: { instansiId },
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
                select: {
                    id: true,
                    totalHarga: true,
                    status: true,
                    createdAt: true,
                },
            }),
            // Booking selesai (untuk hitung saldo tertunda)
            prisma_1.prisma.booking.findMany({
                where: {
                    car: { instansiId },
                    status: 'selesai',
                },
                select: {
                    id: true,
                    totalHarga: true,
                    disbursementItems: { select: { id: true } },
                },
            }),
            // Recent disbursements
            prisma_1.prisma.disbursement.findMany({
                where: { instansiId },
                select: {
                    id: true,
                    jumlahBersih: true,
                    status: true,
                    dicairkanPada: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            // Recent bookings
            prisma_1.prisma.booking.findMany({
                where: { car: { instansiId } },
                include: {
                    car: { select: { nama: true } },
                    profile: { select: { nama: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);
        // Hitung statistik
        const totalPendapatanBulanIni = bookingsThisMonth
            .filter(b => ['dikonfirmasi', 'berjalan', 'selesai'].includes(b.status))
            .reduce((sum, b) => sum + Number(b.totalHarga), 0);
        const bookingCounts = bookingsThisMonth.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});
        // Hitung saldo tertunda (booking selesai tapi belum dicairkan)
        const saldoTertunda = completedBookings
            .filter(b => b.disbursementItems.length === 0)
            .reduce((sum, b) => sum + Number(b.totalHarga), 0);
        // Total sudah dicairkan
        const totalSudahDicairkan = disbursements
            .filter(d => d.status === 'berhasil')
            .reduce((sum, d) => sum + Number(d.jumlahBersih), 0);
        res.json({
            data: {
                totalMobil,
                mobilTersedia,
                mobilMaintenance,
                totalPendapatanBulanIni,
                bookingStats: bookingCounts,
                saldoTertunda,
                totalSudahDicairkan,
                recentBookings,
                recentDisbursements: disbursements,
            },
        });
    }
    catch (error) {
        console.error('GET /api/instansi/dashboard error:', error);
        res.status(500).json({ error: 'Gagal mengambil data dashboard' });
    }
});
const STATUS_DIHITUNG_PENDAPATAN = ['dikonfirmasi', 'berjalan', 'selesai'];
/**
 * GET /api/instansi/dashboard/trends
 * Tren harian nyata (hari ini vs kemarin) + sparkline 7 hari terakhir,
 * dihitung dari data booking asli — bukan angka statis/acak.
 */
exports.instansiRouter.get('/dashboard/trends', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // termasuk hari ini = 7 hari
        // Ambil semua booking 7 hari terakhir sekali jalan, lalu bucket-kan di memory
        const recentBookings = await prisma_1.prisma.booking.findMany({
            where: { car: { instansiId }, createdAt: { gte: sevenDaysAgo } },
            select: { totalHarga: true, status: true, createdAt: true },
        });
        const dayKey = (d) => d.toISOString().split('T')[0];
        const todayKey = dayKey(startOfToday);
        const yesterdayKey = dayKey(startOfYesterday);
        const revenueByDay = {};
        const bookingCountByDay = {};
        for (const b of recentBookings) {
            const key = dayKey(new Date(b.createdAt));
            bookingCountByDay[key] = (bookingCountByDay[key] ?? 0) + 1;
            if (STATUS_DIHITUNG_PENDAPATAN.includes(b.status)) {
                revenueByDay[key] = (revenueByDay[key] ?? 0) + Number(b.totalHarga);
            }
        }
        const calcTrend = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };
        const pendapatanHariIni = revenueByDay[todayKey] ?? 0;
        const pendapatanKemarin = revenueByDay[yesterdayKey] ?? 0;
        const bookingBaruHariIni = bookingCountByDay[todayKey] ?? 0;
        const bookingBaruKemarin = bookingCountByDay[yesterdayKey] ?? 0;
        const sparklinePendapatan = [];
        const sparklineBookingBaru = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(startOfToday);
            d.setDate(d.getDate() - i);
            const key = dayKey(d);
            sparklinePendapatan.push(revenueByDay[key] ?? 0);
            sparklineBookingBaru.push(bookingCountByDay[key] ?? 0);
        }
        res.json({
            data: {
                pendapatanHariIni,
                bookingBaruHariIni,
                trendPendapatan: calcTrend(pendapatanHariIni, pendapatanKemarin),
                trendBookingBaru: calcTrend(bookingBaruHariIni, bookingBaruKemarin),
                sparklinePendapatan,
                sparklineBookingBaru,
            },
        });
    }
    catch (error) {
        console.error('GET /api/instansi/dashboard/trends error:', error);
        res.status(500).json({ error: 'Gagal mengambil data trend' });
    }
});
/**
 * GET /api/instansi/dashboard/revenue-series?period=today|7days|month|year
 * Grafik pendapatan dengan data nyata per bucket waktu (bukan estimasi
 * rata-rata atau angka acak seperti implementasi lama di frontend).
 */
exports.instansiRouter.get('/dashboard/revenue-series', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    const period = req.query.period || '7days';
    const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    try {
        const now = new Date();
        let rangeStart;
        if (period === 'today') {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        else if (period === '7days') {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        }
        else if (period === 'month') {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        else {
            rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        }
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                car: { instansiId },
                createdAt: { gte: rangeStart },
                status: { in: [...STATUS_DIHITUNG_PENDAPATAN] },
            },
            select: { totalHarga: true, createdAt: true },
        });
        let labels = [];
        let values = [];
        if (period === 'today') {
            // Bucket per 4 jam
            labels = Array.from({ length: 6 }, (_, i) => `${String(i * 4).padStart(2, '0')}:00`);
            values = new Array(6).fill(0);
            for (const b of bookings) {
                const hour = new Date(b.createdAt).getHours();
                values[Math.floor(hour / 4)] += Number(b.totalHarga);
            }
        }
        else if (period === '7days') {
            const days = [];
            const keys = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                days.push(DAYS_ID[d.getDay()]);
                keys.push(d.toISOString().split('T')[0]);
            }
            labels = days;
            values = new Array(7).fill(0);
            for (const b of bookings) {
                const key = new Date(b.createdAt).toISOString().split('T')[0];
                const idx = keys.indexOf(key);
                if (idx !== -1)
                    values[idx] += Number(b.totalHarga);
            }
        }
        else if (period === 'month') {
            const weeksInMonth = Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) / 7);
            labels = Array.from({ length: weeksInMonth }, (_, i) => `Minggu ${i + 1}`);
            values = new Array(weeksInMonth).fill(0);
            for (const b of bookings) {
                const dayOfMonth = new Date(b.createdAt).getDate();
                const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), weeksInMonth - 1);
                values[weekIdx] += Number(b.totalHarga);
            }
        }
        else {
            // year — 12 bulan terakhir
            const monthKeys = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(MONTHS_ID[d.getMonth()]);
                monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
            }
            values = new Array(12).fill(0);
            for (const b of bookings) {
                const d = new Date(b.createdAt);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                const idx = monthKeys.indexOf(key);
                if (idx !== -1)
                    values[idx] += Number(b.totalHarga);
            }
        }
        res.json({ data: { labels, values } });
    }
    catch (error) {
        console.error('GET /api/instansi/dashboard/revenue-series error:', error);
        res.status(500).json({ error: 'Gagal mengambil data grafik pendapatan' });
    }
});
/**
 * GET /api/instansi/saldo
 * Saldo tertunda & ringkasan keuangan instansi
 */
exports.instansiRouter.get('/saldo', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    try {
        // Ambil informasi instansi untuk komisi
        const instansi = await prisma_1.prisma.instansi.findUnique({
            where: { id: instansiId },
            select: {
                komisiPlatformPersen: true,
                rekeningBank: true,
            },
        });
        if (!instansi) {
            res.status(404).json({ error: 'Instansi tidak ditemukan' });
            return;
        }
        // Booking yang sudah selesai tapi belum dicairkan
        const pendingBookings = await prisma_1.prisma.booking.findMany({
            where: {
                car: { instansiId },
                status: 'selesai',
            },
            include: {
                disbursementItems: { select: { id: true } },
            },
        });
        const eligibleBookings = pendingBookings.filter(b => b.disbursementItems.length === 0);
        const jumlahKotor = eligibleBookings.reduce((sum, b) => sum + Number(b.totalHarga), 0);
        const komisi = jumlahKotor * (Number(instansi.komisiPlatformPersen) / 100);
        const jumlahBersih = jumlahKotor - komisi;
        // Estimasi disbursement berikutnya
        const lastDisbursement = await prisma_1.prisma.disbursement.findFirst({
            where: { instansiId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });
        res.json({
            data: {
                saldoTertunda: {
                    jumlahKotor,
                    komisi,
                    jumlahBersih,
                    jumlahBooking: eligibleBookings.length,
                },
                infoRekening: instansi.rekeningBank ? 'tersedia' : 'belum_dibuat',
                komisiPlatformPersen: Number(instansi.komisiPlatformPersen),
                estimasiPencairanBerikutnya: lastDisbursement?.createdAt ?? null,
            },
        });
    }
    catch (error) {
        console.error('GET /api/instansi/saldo error:', error);
        res.status(500).json({ error: 'Gagal mengambil data saldo' });
    }
});
/**
 * GET /api/instansi/disbursements
 * Riwayat pencairan dana instansi
 */
exports.instansiRouter.get('/disbursements', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    const { dari, sampai, status } = req.query;
    try {
        const disbursements = await prisma_1.prisma.disbursement.findMany({
            where: {
                instansiId,
                ...(status && { status: status }),
                ...((dari || sampai) && {
                    createdAt: {
                        ...(dari && { gte: new Date(String(dari)) }),
                        ...(sampai && { lte: new Date(String(sampai)) }),
                    },
                }),
            },
            include: {
                items: {
                    include: {
                        booking: {
                            select: {
                                id: true,
                                tanggalMulai: true,
                                tanggalSelesai: true,
                                profile: { select: { nama: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Summary stats
        const summary = {
            totalDisbursement: disbursements.length,
            totalJumlahKotor: disbursements.reduce((sum, d) => sum + Number(d.jumlahKotor), 0),
            totalKomisi: disbursements.reduce((sum, d) => sum + Number(d.komisiPlatform), 0),
            totalJumlahBersih: disbursements.reduce((sum, d) => sum + Number(d.jumlahBersih), 0),
            berhasil: disbursements.filter(d => d.status === 'berhasil').length,
            diproses: disbursements.filter(d => d.status === 'diproses').length,
            gagal: disbursements.filter(d => d.status === 'gagal').length,
        };
        res.json({ data: disbursements, summary });
    }
    catch (error) {
        console.error('GET /api/instansi/disbursements error:', error);
        res.status(500).json({ error: 'Gagal mengambil riwayat pencairan' });
    }
});
/**
 * GET /api/instansi/disbursements/:id
 * Detail satu pencairan + booking terkait
 */
exports.instansiRouter.get('/disbursements/:id', async (req, res) => {
    const instansiId = req.instansiScope.instansiId;
    try {
        const disbursement = await prisma_1.prisma.disbursement.findFirst({
            where: {
                id: req.params.id,
                instansiId, // Ensure scoped to this instansi
            },
            include: {
                items: {
                    include: {
                        booking: {
                            include: {
                                car: { select: { nama: true, kategori: true } },
                                profile: { select: { nama: true, noHp: true } },
                            },
                        },
                    },
                },
                instansi: {
                    select: {
                        namaInstansi: true,
                        rekeningBank: true,
                        komisiPlatformPersen: true,
                    },
                },
            },
        });
        if (!disbursement) {
            res.status(404).json({ error: 'Pencairan tidak ditemukan' });
            return;
        }
        res.json({ data: disbursement });
    }
    catch (error) {
        console.error('GET /api/instansi/disbursements/:id error:', error);
        res.status(500).json({ error: 'Gagal mengambil detail pencairan' });
    }
});
//# sourceMappingURL=instansi.routes.js.map