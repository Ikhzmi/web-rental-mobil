import { Router, Request, Response } from 'express';
import { expireStaleBookings } from '../services/bookingExpiry.service';

export const cronRouter = Router();

/**
 * GET /api/cron/expire-bookings
 *
 * Endpoint ini dipanggil oleh Vercel Cron Jobs setiap 10 menit secara otomatis.
 * Diproteksi dengan CRON_SECRET agar tidak bisa dipanggil sembarangan dari luar.
 *
 * Cara kerja di Vercel:
 * - Vercel mengirim header `Authorization: Bearer <CRON_SECRET>` setiap kali
 *   cron job berjalan.
 * - Kita validasi header tersebut sebelum menjalankan logika pembatalan.
 *
 * Referensi: https://vercel.com/docs/cron-jobs/manage-cron-jobs
 */
cronRouter.get('/expire-bookings', async (req: Request, res: Response) => {
  // Validasi CRON_SECRET — wajib di production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    const result = await expireStaleBookings();
    res.json({
      ok: true,
      cancelled: result.cancelled,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron] expire-bookings gagal:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
