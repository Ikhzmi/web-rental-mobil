"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
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
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? 'http://localhost:5173',
}));
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Publik
app.use('/api/cars', cars_routes_1.carsRouter);
// Customer (verifySupabaseToken dipasang di dalam masing-masing router)
app.use('/api/bookings', bookings_routes_1.bookingsRouter);
app.use('/api/profiles', profiles_routes_1.profilesRouter);
// Admin (verifySupabaseToken + requireAdmin dipasang di dalam masing-masing router)
app.use('/api/admin/cars', adminCars_routes_1.adminCarsRouter);
app.use('/api/admin/bookings', adminBookings_routes_1.adminBookingsRouter);
app.use('/api/admin/users', adminUsers_routes_1.adminUsersRouter);
app.use('/api/admin/dokumen', adminUsers_routes_1.adminDokumenRouter);
app.use('/api/admin/dashboard', adminDashboard_routes_1.adminDashboardRouter);
// Super Admin (verifySupabaseToken + requireSuperAdmin dipasang di dalam router)
app.use('/api/superadmin', superadmin_routes_1.superadminRouter);
// Instansi routes (public + admin scoped)
app.use('/api/instansi', instansi_routes_1.instansiRouter);
// Webhooks (Xendit)
app.use('/api/webhooks', webhooks_routes_1.webhooksRouter);
app.use((req, res) => {
    res.status(404).json({ error: `Endpoint tidak ditemukan: ${req.method} ${req.path}` });
});
// Error handler terakhir — menangkap error async yang tidak sengaja lolos
// dari try/catch di masing-masing route.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});
app.listen(PORT, () => {
    console.log(`KerenTal Kita API berjalan di http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map