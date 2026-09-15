import type { Role } from './api';

/**
 * Resolver target notifikasi yang AMAN untuk semua role.
 *
 * Masalah yang diselesaikan:
 * 1. actionUrl basi/mati (mis. rute yang tidak ada) → dulu mendarat di
 *    halaman 404 atau layar kosong. Sekarang jatuh ke halaman aman
 *    sesuai role + alasan yang bisa ditampilkan sebagai toast.
 * 2. URL lintas-role (mis. customer menerima link /admin/...) → dulu
 *    mendarat di halaman guard yang gelap/membingungkan. Sekarang
 *    dialihkan ke beranda role masing-masing.
 * 3. Deep-link chat virtual `/user/chat?conversationId=` (tidak ada rute
 *    fisik; chat customer hidup di ChatWidget) → dibuka sebagai widget,
 *    bukan navigasi.
 */

export type NotificationTarget =
  | { kind: 'navigate'; url: string }
  | { kind: 'chat'; conversationId: string }
  | { kind: 'fallback'; url: string; reason: string };

type AppRole = Role | 'unknown';

/** Pola rute yang BENAR-BENAR ada di App.tsx (tanpa query/hash). */
const KNOWN_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/armada$/,
  /^\/armada\/[^/]+$/,
  /^\/tentang$/,
  /^\/kontak$/,
  /^\/faq$/,
  /^\/login$/,
  /^\/daftar$/,
  /^\/auth\/callback$/,
  /^\/reset-password$/,
  /^\/booking\/[^/]+$/,
  /^\/booking\/[^/]+\/konfirmasi$/,
  /^\/booking\/[^/]+\/bayar$/,
  /^\/akun$/,
  /^\/akun\/profil$/,
  /^\/akun\/pesanan$/,
  /^\/akun\/pesanan\/[^/]+$/,
  /^\/admin$/,
  /^\/admin\/armada$/,
  /^\/admin\/pesanan$/,
  /^\/admin\/pesanan\/[^/]+$/,
  /^\/admin\/keuangan$/,
  /^\/admin\/refunds$/,
  /^\/admin\/messages$/,
  /^\/admin\/calendar$/,
  /^\/admin\/settings$/,
  /^\/superadmin$/,
  /^\/superadmin\/bookings$/,
  /^\/superadmin\/transactions$/,
  /^\/superadmin\/refunds$/,
  /^\/superadmin\/reports$/,
  /^\/superadmin\/instansi$/,
  /^\/superadmin\/admin$/,
  /^\/superadmin\/armada$/,
  /^\/superadmin\/pencairan$/,
];

/** Prefix yang boleh dibuka tiap role. */
const ALLOWED_PREFIXES: Record<Exclude<AppRole, 'unknown'>, string[]> = {
  customer: ['/', '/armada', '/tentang', '/kontak', '/faq', '/booking', '/akun'],
  admin: ['/', '/armada', '/tentang', '/kontak', '/faq', '/booking', '/akun', '/admin'],
  super_admin: ['/', '/armada', '/tentang', '/kontak', '/faq', '/booking', '/akun', '/admin', '/superadmin'],
};

const ROLE_HOME: Record<Exclude<AppRole, 'unknown'>, string> = {
  customer: '/akun/pesanan',
  admin: '/admin',
  super_admin: '/superadmin',
};

function roleAllows(role: Exclude<AppRole, 'unknown'>, path: string): boolean {
  // Exact '/' hanya untuk root; prefix lain harus cocok penuh per segmen.
  if (path === '/') return true;
  return ALLOWED_PREFIXES[role].some(
    (prefix) => prefix !== '/' && (path === prefix || path.startsWith(`${prefix}/`)),
  );
}

function isKnownRoute(path: string): boolean {
  return KNOWN_ROUTES.some((re) => re.test(path));
}

/**
 * Tentukan aksi aman untuk sebuah actionUrl notifikasi.
 * Selalu mengembalikan target yang valid — tidak pernah melempar.
 */
export function resolveNotificationTarget(
  rawUrl: string | null | undefined,
  role: AppRole,
): NotificationTarget {
  const safeRole: Exclude<AppRole, 'unknown'> =
    role === 'admin' || role === 'super_admin' ? role : 'customer';

  if (!rawUrl || typeof rawUrl !== 'string') {
    return { kind: 'fallback', url: ROLE_HOME[safeRole], reason: 'empty' };
  }

  const trimmed = rawUrl.trim();
  // Tolak URL eksternal / skema aneh (javascript:, http...) — hanya
  // path internal yang diizinkan.
  if (!trimmed.startsWith('/')) {
    return { kind: 'fallback', url: ROLE_HOME[safeRole], reason: 'external' };
  }

  // Pisahkan hash (#ulasan) agar tidak mengganggu pencocokan rute.
  const [withoutHash, hashPart] = trimmed.split('#');
  const [pathPart, queryPart] = withoutHash.split('?');
  const path = pathPart || '/';
  const suffix = `${queryPart ? `?${queryPart}` : ''}${hashPart ? `#${hashPart}` : ''}`;

  // Deep-link chat customer (virtual, tanpa rute fisik).
  if (path === '/user/chat') {
    if (safeRole !== 'customer') {
      return { kind: 'fallback', url: ROLE_HOME[safeRole], reason: 'role' };
    }
    const params = new URLSearchParams(queryPart ?? '');
    const conversationId = params.get('conversationId') ?? '';
    if (!conversationId) {
      return { kind: 'fallback', url: '/akun/pesanan', reason: 'empty' };
    }
    return { kind: 'chat', conversationId };
  }

  // Rute tak dikenal (mis. sisa URL lama) → beranda role.
  if (!isKnownRoute(path)) {
    return { kind: 'fallback', url: ROLE_HOME[safeRole], reason: 'unknown' };
  }

  // Rute dikenal tapi di luar hak role → beranda role.
  if (!roleAllows(safeRole, path)) {
    return { kind: 'fallback', url: ROLE_HOME[safeRole], reason: 'role' };
  }

  return { kind: 'navigate', url: `${path}${suffix}` };
}
