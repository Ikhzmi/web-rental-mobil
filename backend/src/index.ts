import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';

import { carsRouter } from './routes/cars.routes';
import { bookingsRouter } from './routes/bookings.routes';
import { profilesRouter } from './routes/profiles.routes';
import { adminCarsRouter } from './routes/adminCars.routes';
import { adminBookingsRouter } from './routes/adminBookings.routes';
import { adminUsersRouter, adminDokumenRouter } from './routes/adminUsers.routes';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Publik
app.use('/api/cars', carsRouter);

// Customer (verifySupabaseToken dipasang di dalam masing-masing router)
app.use('/api/bookings', bookingsRouter);
app.use('/api/profiles', profilesRouter);

// Admin (verifySupabaseToken + requireAdmin dipasang di dalam masing-masing router)
app.use('/api/admin/cars', adminCarsRouter);
app.use('/api/admin/bookings', adminBookingsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/dokumen', adminDokumenRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Endpoint tidak ditemukan: ${req.method} ${req.path}` });
});

// Error handler terakhir — menangkap error async yang tidak sengaja lolos
// dari try/catch di masing-masing route.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

app.listen(PORT, () => {
  console.log(`KerenTal Kita API berjalan di http://localhost:${PORT}`);
});
