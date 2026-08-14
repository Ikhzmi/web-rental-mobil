"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
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
const errorHandler_1 = require("./lib/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
// Security headers
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? 'http://localhost:5173',
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting - general
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Terlalu banyak permintaan, coba lagi nanti' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting - stricter for auth-sensitive endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: { error: 'Terlalu banyak percobaan, coba lagi dalam 15 menit' },
    standardHeaders: true,
    legacyHeaders: false,
});
// SECURITY: Rate limiting for payment endpoints
const paymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 payment requests per minute per user
    keyGenerator: (req) => req.user?.id || req.ip || 'anonymous',
    validate: { ip: false },
    message: { error: 'Terlalu banyak request pembayaran, coba lagi dalam 1 menit' },
    standardHeaders: true,
    legacyHeaders: false,
});
// SECURITY: Rate limiting for webhooks (prevent webhook spam/DOS)
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 webhook requests per minute per IP
    keyGenerator: (req) => req.ip || 'anonymous',
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
// Webhooks (DOKU) - with rate limiting to prevent webhook spam
app.use('/api/webhooks', webhookLimiter, webhooks_routes_1.webhooksRouter);
// 404 handler
app.use(errorHandler_1.notFoundHandler);
// Global error handler - harus di akhir
app.use(errorHandler_1.globalErrorHandler);
app.listen(PORT, () => {
    console.log(`KerenTal Kita API berjalan di http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map