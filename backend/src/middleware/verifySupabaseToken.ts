import { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'SUPABASE_URL dan SUPABASE_ANON_KEY wajib diisi di .env — lihat .env.example'
  );
}

// Client biasa (anon key) — cukup untuk memverifikasi access_token yang
// dikirim frontend. TIDAK memakai service-role key di sini karena
// middleware ini cuma perlu memvalidasi token, bukan bypass akses apa pun.
const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Memverifikasi header `Authorization: Bearer <supabase_access_token>`.
 * Sesuai §8/§10 PRD — registrasi & login TIDAK lewat Express, tapi setiap
 * endpoint Customer/Admin di Express tetap wajib memverifikasi token
 * Supabase yang dikirim frontend lewat middleware ini sebelum memproses
 * request apa pun.
 *
 * Setelah token valid, `role` dan `instansiId` diambil dari tabel `profiles`
 * (lewat Prisma) — bukan dari token itu sendiri — supaya perubahan role
 * oleh admin langsung berlaku tanpa menunggu token lama expire.
 *
 * Updated v1.3: - role diperluas dengan 'super_admin'
 *               - instansiId ditambahkan untuk scoping admin ke instansi
 */
export async function verifySupabaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Header Authorization: Bearer <token> wajib diisi' });
    return;
  }

  const accessToken = authHeader.slice('Bearer '.length);

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data.user) {
    res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
    return;
  }

  // Updated v1.3: select juga instansiId
  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, role: true, aktif: true, instansiId: true },
  });

  if (!profile) {
    // Baris di auth.users ada, tapi trigger belum sempat/gagal membuat
    // baris profiles yang bersangkutan — lihat prisma/sql/001_*.sql.
    res.status(404).json({
      error: 'Profil pengguna tidak ditemukan. Hubungi admin bila ini terjadi berulang.',
    });
    return;
  }

  if (!profile.aktif) {
    res.status(403).json({ error: 'Akun ini telah dinonaktifkan. Hubungi admin.' });
    return;
  }

  // Updated v1.3: include instansiId di req.user
  req.user = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    instansiId: profile.instansiId ?? undefined,
  };
  next();
}

/**
 * Dipasang setelah verifySupabaseToken — menolak request non-admin.
 * Updated v1.3: sekarang juga menolak super_admin (khusus admin instansi).
 * Jika butuh akses untuk super_admin, gunakan requireSuperAdmin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Endpoint ini khusus admin instansi' });
    return;
  }
  next();
}

/**
 * Dipasang setelah verifySupabaseToken — menolak request non-super_admin.
 * Updated v1.3: untuk endpoint yang hanya bisa diakses Super Admin platform.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ error: 'Endpoint ini khusus Super Admin' });
    return;
  }
  next();
}
