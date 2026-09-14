import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';

import { carsRouter } from './routes/cars.routes';
import { bookingsRouter } from './routes/bookings.routes';
import { profilesRouter } from './routes/profiles.routes';
import { adminCarsRouter } from './routes/adminCars.routes';
import { adminBookingsRouter } from './routes/adminBookings.routes';
import { adminUsersRouter, adminDokumenRouter } from './routes/adminUsers.routes';
import { adminDashboardRouter } from './routes/adminDashboard.routes';
import { superadminRouter } from './routes/superadmin.routes';
import { instansiRouter } from './routes/instansi.routes';
import { webhooksRouter } from './routes/webhooks.routes';
import { reviewsRouter } from './routes/reviews.routes';
import { publicStatsRouter } from './routes/publicStats.routes';
import { customerMessagesRouter, adminMessagesRouter } from './routes/messages.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { globalErrorHandler, notFoundHandler } from './lib/errorHandler';
import { cronRouter } from './routes/cron.routes';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Trust proxy (diperlukan untuk ngrok dan proxy Vite agar IP tidak dianggap sama)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration (mendukung localhost dan ngrok)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(',') ?? [];
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('ngrok') ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Rate limiting - general (dilonggarkan di mode development/testing agar tidak 429)
const isDev = process.env.NODE_ENV !== 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 300, // 2000 request per 15 menit di dev mode
  message: { error: 'Terlalu banyak permintaan, coba lagi nanti' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - auth-sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // 1000 request per 15 menit di dev mode
  message: { error: 'Terlalu banyak percobaan, coba lagi dalam 15 menit' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payment requests per minute per user
  keyGenerator: (req) => req.user?.id || (req.ip ? ipKeyGenerator(req.ip) : 'anonymous'),
  validate: { ip: false },
  message: { error: 'Terlalu banyak request pembayaran, coba lagi dalam 1 menit' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: Rate limiting for webhooks (prevent webhook spam/DOS)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 webhook requests per minute per IP
  keyGenerator: (req) => (req.ip ? ipKeyGenerator(req.ip) : 'anonymous'),
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
app.use('/api/cars', carsRouter);
app.use('/api/public/stats', publicStatsRouter);

// Customer (verifySupabaseToken dipasang di dalam masing-masing router)
// Stricter rate limit for checkout (payment endpoint)
app.use('/api/bookings', authLimiter, bookingsRouter);
app.use('/api/profiles', authLimiter, profilesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/messages', authLimiter, customerMessagesRouter);
app.use('/api/notifications', authLimiter, notificationsRouter);
app.use('/api/admin/notifications', authLimiter, notificationsRouter);

// Admin (verifySupabaseToken + requireAdmin dipasang di dalam masing-masing router)
app.use('/api/admin/cars', adminCarsRouter);
app.use('/api/admin/bookings', adminBookingsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/dokumen', adminDokumenRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/messages', adminMessagesRouter);

// Super Admin (verifySupabaseToken + requireSuperAdmin dipasang di dalam router)
app.use('/api/superadmin', superadminRouter);

// Instansi routes (public + admin scoped)
app.use('/api/instansi', authLimiter, instansiRouter);

// Webhooks (payment gateway) - with rate limiting to prevent webhook spam
app.use('/api/webhooks', webhookLimiter, webhooksRouter);

// Cron jobs (dipanggil oleh Vercel Cron, diproteksi CRON_SECRET)
// Endpoint: GET /api/cron/expire-bookings
app.use('/api/cron', cronRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler - harus di akhir
app.use(globalErrorHandler);

// Di lingkungan lokal (non-Vercel), jalankan server seperti biasa.
// Di Vercel, file ini di-import sebagai module dan app di-export sebagai
// Serverless Function — app.listen() tidak dipanggil di sana.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`KerenTal Kita API berjalan di http://localhost:${PORT}`);
  });
}

export default app;