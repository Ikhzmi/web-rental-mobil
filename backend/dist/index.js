"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const cars_routes_1 = require("./routes/cars.routes");
const bookings_routes_1 = require("./routes/bookings.routes");
const profiles_routes_1 = require("./routes/profiles.routes");
const adminCars_routes_1 = require("./routes/adminCars.routes");
const adminBookings_routes_1 = require("./routes/adminBookings.routes");
const adminUsers_routes_1 = require("./routes/adminUsers.routes");
const adminDashboard_routes_1 = require("./routes/adminDashboard.routes");
const superadmin_routes_1 = require("./routes/superadmin.routes");
const instansi_routes_1 = require("./routes/instansi.routes");
const webhooks_routes_1 = require("./routes/webhooks.routes");
const reviews_routes_1 = require("./routes/reviews.routes");
const errorHandler_1 = require("./lib/errorHandler");
const bookingExpiry_service_1 = require("./services/bookingExpiry.service");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
// Trust proxy (diperlukan untuk ngrok dan proxy Vite agar IP tidak dianggap sama)
app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)());
// CORS configuration (mendukung localhost dan ngrok)
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(',') ?? [];
        if (origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin.includes('ngrok') ||
            allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting - general (dilonggarkan di mode development/testing agar tidak 429)
const isDev = process.env.NODE_ENV !== 'production';
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 2000 : 300, // 2000 request per 15 menit di dev mode
    message: { error: 'Terlalu banyak permintaan, coba lagi nanti' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting - auth-sensitive endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 100, // 1000 request per 15 menit di dev mode
    message: { error: 'Terlalu banyak percobaan, coba lagi dalam 15 menit' },
    standardHeaders: true,
    legacyHeaders: false,
});
// SECURITY: Rate limiting for payment endpoints
const paymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 payment requests per minute per user
    keyGenerator: (req) => req.user?.id || (req.ip ? (0, express_rate_limit_1.ipKeyGenerator)(req.ip) : 'anonymous'),
    validate: { ip: false },
    message: { error: 'Terlalu banyak request pembayaran, coba lagi dalam 1 menit' },
    standardHeaders: true,
    legacyHeaders: false,
});
// SECURITY: Rate limiting for webhooks (prevent webhook spam/DOS)
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 webhook requests per minute per IP
    keyGenerator: (req) => (req.ip ? (0, express_rate_limit_1.ipKeyGenerator)(req.ip) : 'anonymous'),
    validate: { ip: false },
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply general rate limiting to all routes
app.use('/api', generalLimiter);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Publik
app.use('/api/cars', cars_routes_1.carsRouter);
// Customer (verifySupabaseToken dipasang di dalam masing-masing router)
// Stricter rate limit for checkout (payment endpoint)
app.use('/api/bookings', authLimiter, bookings_routes_1.bookingsRouter);
app.use('/api/profiles', authLimiter, profiles_routes_1.profilesRouter);
app.use('/api/reviews', reviews_routes_1.reviewsRouter);
// Admin (verifySupabaseToken + requireAdmin dipasang di dalam masing-masing router)
app.use('/api/admin/cars', adminCars_routes_1.adminCarsRouter);
app.use('/api/admin/bookings', adminBookings_routes_1.adminBookingsRouter);
app.use('/api/admin/users', adminUsers_routes_1.adminUsersRouter);
app.use('/api/admin/dokumen', adminUsers_routes_1.adminDokumenRouter);
app.use('/api/admin/dashboard', adminDashboard_routes_1.adminDashboardRouter);
// Super Admin (verifySupabaseToken + requireSuperAdmin dipasang di dalam router)
app.use('/api/superadmin', superadmin_routes_1.superadminRouter);
// Instansi routes (public + admin scoped)
app.use('/api/instansi', authLimiter, instansi_routes_1.instansiRouter);
// Webhooks (payment gateway) - with rate limiting to prevent webhook spam
app.use('/api/webhooks', webhookLimiter, webhooks_routes_1.webhooksRouter);
// 404 handler
app.use(errorHandler_1.notFoundHandler);
// Global error handler - harus di akhir
app.use(errorHandler_1.globalErrorHandler);
app.listen(PORT, () => {
    console.log(`KerenTal Kita API berjalan di http://localhost:${PORT}`);
    // Jaring pengaman: batalkan otomatis booking yang mengendap di status
    // menunggu_pembayaran (lihat bookingExpiry.service.ts untuk penjelasan
    // kenapa ini perlu — tanpa ini, booking yang tidak pernah checkout bisa
    // memblokir tanggal mobil untuk penyewa lain selamanya).
    (0, bookingExpiry_service_1.startBookingExpiryJob)();
});
//# sourceMappingURL=index.js.map