import { supabase } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

// Kategori diperluas dari 4 ke 8 di v1.3
export type Kategori = 'city_car' | 'hatchback' | 'suv' | 'mpv' | 'minibus' | 'pickup' | 'mewah' | 'electric';
export type Transmisi = 'manual' | 'matic';
export type TipeSewa = 'lepas_kunci' | 'dengan_sopir' | 'keduanya';
export type StatusMobil = 'tersedia' | 'maintenance' | 'nonaktif';

export interface CarImage {
  id: string;
  url: string;
  urutan: number;
}

export interface Car {
  id: string;
  nama: string;
  kategori: Kategori;
  transmisi: Transmisi;
  tipeSewa: TipeSewa;
  hargaSopirPerHari: string | null;
  kapasitasKursi: number;
  hargaPerHari: string;
  status: StatusMobil;
  statusApproval?: 'menunggu_persetujuan' | 'disetujui' | 'ditolak'; // v1.3: Super Admin approval
  deskripsi: string | null;
  images: CarImage[];
  // v1.3: Instance info for multi-tenancy label
  instansi?: {
    id: string;
    namaInstansi: string;
    status: 'aktif' | 'nonaktif';
  };
}

export interface BookedRange {
  tanggalMulai: string;
  tanggalSelesai: string;
}

export interface Profile {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  role: 'customer' | 'admin';
  noKtp: string | null;
  noSim: string | null;
  dokumenKtpUrl: string | null;
  dokumenSimUrl: string | null;
  dokumenVerified: boolean;
  aktif: boolean;
}

export type JenisAddon = 'sopir' | 'asuransi' | 'antar_jemput';

export interface BookingAddonRecord {
  id: string;
  jenis: JenisAddon;
  harga: string;
}

export interface BookingStatusLogEntry {
  id: string;
  statusLama: string;
  statusBaru: string;
  diubahOleh: string;
  createdAt: string;
}
export interface Booking {
  id: string;
  userId: string;
  carId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasiAmbil: string;
  lokasiKembali: string;
  hargaDasar: string;
  totalAddon: string;
  totalHarga: string;
  status: StatusBooking;
  createdAt: string;
  car?: Car;
  addons?: BookingAddonRecord[];
  // GET /api/bookings/:id (dipakai admin juga) sudah mengirim ini dari
  // dulu di backend -- cuma belum pernah diakui di tipe frontend.
  statusLogs?: BookingStatusLogEntry[];
  // Ditambahkan ke include backend supaya admin bisa lihat data penyewa
  // dari endpoint yang sama (lihat AdminPesananDetailPage.tsx).
  profile?: { nama: string; email: string; noHp: string };
}

export interface CreateBookingInput {
  carId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasiAmbil: string;
  lokasiKembali: string;
  addons: { jenis: JenisAddon; harga?: number }[];
}

export interface InstansiDashboardData {
  totalMobil: number;
  mobilTersedia: number;
  mobilMaintenance: number;
  totalPendapatanBulanIni: number;
  bookingStats: Record<string, number>;
  saldoTertunda: number;
  totalSudahDicairkan: number;
  recentBookings: Array<{
    id: string;
    car: { nama: string };
    profile: { nama: string };
    totalHarga: string;
    status: string;
  }>;
  recentDisbursements: Array<{
    id: string;
    jumlahBersih: string;
    status: string;
    dicairkanPada: string | null;
  }>;
}

export interface DashboardSummary {
  totalPendapatanBulanIni: number;
  jumlahPesananAktif: number;
  tingkatOkupansiArmada: number;
  mobilSedangBerjalan: number;
  totalMobilTersedia: number;
  mobilTerlaris: { id: string; nama: string; jumlahBooking: number } | null;
}

export interface AdminUser {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  role: 'customer' | 'admin';
  aktif: boolean;
  dokumenVerified: boolean;
  createdAt: string;
}

export interface AdminBooking extends Booking {
  car: Car;
  profile: { nama: string; email: string; noHp: string };
}

// ── Super Admin Types (v1.3) ──
export type Role = 'customer' | 'admin' | 'super_admin';
export type StatusInstansi = 'menunggu_verifikasi' | 'aktif' | 'nonaktif';
export type StatusApproval = 'menunggu_persetujuan' | 'disetujui' | 'ditolak';
export type StatusBooking = 'menunggu_pembayaran' | 'dikonfirmasi' | 'berjalan' | 'selesai' | 'dibatalkan';
export type StatusDisbursement = 'diproses' | 'berhasil' | 'gagal';
export type KategoriMobil = 'city_car' | 'hatchback' | 'suv' | 'mpv' | 'minibus' | 'pickup' | 'mewah' | 'electric';

export interface Instansi {
  id: string;
  namaInstansi: string;
  alamat: string;
  noHpPic: string;
  emailPic: string;
  dokumenLegalitasUrl: string | null;
  status: StatusInstansi;
  komisiPlatformPersen: string;
  rekeningBank: string | null;
  createdAt: string;
  _count?: {
    cars: number;
    profiles: number;
  };
}

export interface SuperAdminUser {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  role: Role;
  aktif: boolean;
  dokumenVerified: boolean;
  createdAt: string;
  instansi?: { id: string; namaInstansi: string } | null;
}

export interface SuperAdminCar {
  id: string;
  nama: string;
  kategori: KategoriMobil;
  transmisi: Transmisi;
  tipeSewa: TipeSewa;
  kapasitasKursi: number;
  hargaPerHari: string;
  status: StatusMobil;
  statusApproval: StatusApproval;
  alasanPenolakan: string | null;
  createdAt: string;
  images: CarImage[];
  instansi: { id: string; namaInstansi: string };
}

export interface Disbursement {
  id: string;
  instansiId: string;
  jumlahKotor: string;
  komisiPlatform: string;
  jumlahBersih: string;
  status: StatusDisbursement;
  xenditDisbursementId: string | null;
  dicairkanPada: string | null;
  createdAt: string;
  instansi: { id: string; namaInstansi: string };
  items: DisbursementItem[];
}

export interface DisbursementItem {
  id: string;
  disbursementId: string;
  bookingId: string;
  jumlahKotor: string;
  booking?: {
    id: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    profile: { nama: string };
  };
}

export interface SuperAdminDashboardData {
  totalInstansiAktif: number;
  totalInstansiMenunggu: number;
  totalUsers: number;
  totalMobil: number;
  mobilMenungguApproval: number;
  totalPendapatanPlatform: number;
  totalKomisiTerkumpul: number;
  bookingStats: Record<string, number>;
}

export interface DashboardTrendData {
  trendInstansi: number;
  trendUsers: number;
  trendArmada: number;
  trendKomisi: number;
  sparklineInstansi: number[];
  sparklineUsers: number[];
  sparklineArmada: number[];
  sparklineKomisi: number[];
}

// ── Dashboard Analytics Types ──

export type AnalyticsPeriod = '7d' | '30d' | '6m' | '1y';

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface BookingStatusData {
  status: string;
  statusKey: string;
  count: number;
}

export interface AnalyticsData {
  revenueData: RevenueDataPoint[];
  totalRevenue: number;
  bookingStatusData: BookingStatusData[];
  period: AnalyticsPeriod;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ApprovalSummary {
  rentalCompanies: number;
  vehicles: number;
  drivers: number;
  payments: number;
  total: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  data: Notification[];
  unreadCount: number;
}

export interface TopCompany {
  id: string;
  namaInstansi: string;
  totalRevenue: number;
  memberSince: string;
  growth: number;
}

export interface PopularVehicle {
  id: string;
  nama: string;
  kategori: KategoriMobil;
  thumbnail: string | null;
  bookingCount: number;
  available: boolean;
}

export interface CommissionStats {
  revenue: number;
  commission: number;
  lastMonthCommission: number;
  targetCommission: number;
  targetProgress: number;
  growth: number;
}

export interface SystemHealth {
  server: { status: string; uptime: string };
  database: { status: string; latency: string };
  storage: { status: string; usage: string };
  api: { status: string; requestsPerMinute: number };
  cpu: { status: string; usage: string };
  alerts: {
    failedDisbursements: number;
    pendingDisbursements: number;
  };
  stats?: {
    totalBookings: number;
    totalInstansi: number;
    totalUsers: number;
  };
}

export interface PlatformSummary {
  totalRentalCompanies: number;
  totalVehicles: number;
  totalBookings: number;
  totalCustomers: number;
  totalRevenue: number;
  avgMonthlyRevenue: number;
  platformCommission: number;
}

export interface TodayBookings {
  total: number;
  completed: number;
  running: number;
  pending: number;
  cancelled: number;
}

export interface InstansiSaldo {
  saldoTertunda: {
    jumlahKotor: number;
    komisi: number;
    jumlahBersih: number;
    jumlahBooking: number;
  };
  infoRekening: 'tersedia' | 'belum_dibuat';
  komisiPlatformPersen: number;
  estimasiPencairanBerikutnya: string | null;
}

export interface InstansiDisbursementSummary {
  totalDisbursement: number;
  totalJumlahKotor: number;
  totalKomisi: number;
  totalJumlahBersih: number;
  berhasil: number;
  diproses: number;
  gagal: number;
}

export interface CarInput {
  nama: string;
  kategori: Kategori;
  transmisi: Transmisi;
  tipeSewa: TipeSewa;
  hargaSopirPerHari?: number | null;
  kapasitasKursi: number;
  hargaPerHari: number;
  status: StatusMobil;
  deskripsi?: string;
}

export interface ListCarsParams {
  kategori?: Kategori;
  transmisi?: Transmisi;
  tipeSewa?: TipeSewa;
  hargaMin?: number;
  hargaMax?: number;
  kapasitasMin?: number;
  cari?: string;
  sort?: 'harga_asc' | 'harga_desc';
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetch wrapper ke Express API. Menyisipkan Bearer token dari sesi
 * Supabase yang sedang aktif (kalau ada) — dibutuhkan endpoint
 * Customer/Admin sesuai §10 PRD. Endpoint publik tetap jalan tanpa token.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  console.log('[apiFetch] Session:', data?.session?.user?.email, 'error:', sessionError);
  const token = data.session?.access_token;
  console.log('[apiFetch] Token exists:', !!token, 'Path:', path);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  console.log('[apiFetch] Response status:', res.status, 'for', path);

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request gagal (${res.status})`, res.status);
  }

  return body.data as T;
}

export const api = {
  listCars: (params: ListCarsParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) qs.set(key, String(value));
    });
    const query = qs.toString();
    return apiFetch<Car[]>(`/api/cars${query ? `?${query}` : ''}`);
  },

  getCar: (id: string) => apiFetch<Car>(`/api/cars/${id}`),

  getCarAvailability: (id: string) => apiFetch<BookedRange[]>(`/api/cars/${id}/availability`),

  getMyProfile: () => apiFetch<Profile>('/api/profiles/me'),

  createBooking: (input: CreateBookingInput) =>
    apiFetch<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getBooking: (id: string) => apiFetch<Booking>(`/api/bookings/${id}`),

  // ── Admin: Dashboard (F9) ──
  getDashboardSummary: () => apiFetch<DashboardSummary>('/api/admin/dashboard/summary'),
  getInstansiDashboard: () => apiFetch<InstansiDashboardData>('/api/instansi/dashboard'),

  // ── Admin: Armada (F10) ──
  listAdminCars: () => apiFetch<Car[]>('/api/admin/cars'),
  getAdminCar: (id: string) => apiFetch<Car>(`/api/admin/cars/${id}`),
  createAdminCar: (input: CarInput) =>
    apiFetch<Car>('/api/admin/cars', { method: 'POST', body: JSON.stringify(input) }),
  updateAdminCar: (id: string, input: Partial<CarInput>) =>
    apiFetch<Car>(`/api/admin/cars/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAdminCar: (id: string) => apiFetch<Car>(`/api/admin/cars/${id}`, { method: 'DELETE' }),
  addCarImage: (carId: string, input: { url: string; urutan?: number }) =>
    apiFetch<CarImage>(`/api/admin/cars/${carId}/images`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteCarImage: (carId: string, imageId: string) =>
    apiFetch<CarImage>(`/api/admin/cars/${carId}/images/${imageId}`, { method: 'DELETE' }),

  // ── Admin: Pesanan (F11) ──
  listAdminBookings: (params: { status?: StatusBooking } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    const query = qs.toString();
    return apiFetch<AdminBooking[]>(`/api/admin/bookings${query ? `?${query}` : ''}`);
  },
  updateBookingStatus: (id: string, status: StatusBooking) =>
    apiFetch<Booking>(`/api/admin/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ── Admin: Pengguna (F12) ──
  listAdminUsers: () => apiFetch<AdminUser[]>('/api/admin/users'),
  updateUserStatus: (id: string, aktif: boolean) =>
    apiFetch<AdminUser>(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ aktif }),
    }),

    // ── Admin: Verifikasi dokumen (bagian dari F11) ──
  getDokumenSignedUrl: (userId: string, tipe: 'ktp' | 'sim') =>
    apiFetch<{ signedUrl: string; expiresInSeconds: number }>(
      `/api/admin/dokumen/${userId}/signed-url?tipe=${tipe}`
    ),

    // ── Customer: Riwayat Pesanan (F7) ──
  listMyBookings: () => apiFetch<Booking[]>('/api/bookings/mine'),
  cancelBooking: (id: string) =>
    apiFetch<Booking>(`/api/bookings/${id}/cancel`, { method: 'PATCH' }),

  // ── Customer: Profil (F8) ──
  updateMyProfile: (input: Partial<Pick<Profile, 'nama' | 'noHp' | 'noKtp' | 'noSim'>>) =>
    apiFetch<Profile>('/api/profiles/me', { method: 'PATCH', body: JSON.stringify(input) }),
  saveDokumenReference: (tipe: 'ktp' | 'sim', storagePath: string) =>
    apiFetch<Profile>('/api/profiles/me/dokumen', {
      method: 'POST',
      body: JSON.stringify({ tipe, storagePath }),
    }),

  // ── Super Admin (v1.3) ──
  // Dashboard
  getSuperAdminDashboard: () => apiFetch<SuperAdminDashboardData>('/api/superadmin/dashboard'),
  getDashboardTrends: () => apiFetch<DashboardTrendData>('/api/superadmin/dashboard/trends'),

  // Dashboard Analytics
  getSuperAdminAnalytics: (period: AnalyticsPeriod = '30d') =>
    apiFetch<AnalyticsData>(`/api/superadmin/dashboard/analytics?period=${period}`),
  getSuperAdminActivities: () => apiFetch<DashboardActivity[]>('/api/superadmin/dashboard/activities'),
  getSuperAdminApprovals: () => apiFetch<ApprovalSummary>('/api/superadmin/dashboard/approvals'),
  getSuperAdminNotifications: (unreadOnly?: boolean) =>
    apiFetch<NotificationResponse>(`/api/superadmin/dashboard/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markNotificationRead: (id: string) =>
    apiFetch<Notification>(`/api/superadmin/dashboard/notifications/${id}/read`, { method: 'PATCH' }),
  getTopCompanies: () => apiFetch<TopCompany[]>('/api/superadmin/dashboard/top-companies'),
  getPopularVehicles: () => apiFetch<PopularVehicle[]>('/api/superadmin/dashboard/popular-vehicles'),
  getCommissionStats: () => apiFetch<CommissionStats>('/api/superadmin/dashboard/commission'),
  getSystemHealth: () => apiFetch<SystemHealth>('/api/superadmin/dashboard/system-health'),
  getPlatformSummary: () => apiFetch<PlatformSummary>('/api/superadmin/dashboard/platform-summary'),
  getTodayBookings: () => apiFetch<TodayBookings>('/api/superadmin/dashboard/today-bookings'),

  // Instansi Management
  listInstansi: (params: { status?: StatusInstansi; cari?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.cari) qs.set('cari', params.cari);
    const query = qs.toString();
    return apiFetch<Instansi[]>(`/api/superadmin/instansi${query ? `?${query}` : ''}`);
  },
  getInstansi: (id: string) => apiFetch<Instansi>(`/api/superadmin/instansi/${id}`),
  verifyInstansi: (id: string, action: 'approve' | 'reject', alasan?: string) =>
    apiFetch<Instansi>(`/api/superadmin/instansi/${id}/verifikasi`, {
      method: 'PATCH',
      body: JSON.stringify({ action, alasan }),
    }),
  updateInstansiStatus: (id: string, aktif: boolean) =>
    apiFetch<Instansi>(`/api/superadmin/instansi/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ aktif }),
    }),
  createInstansi: (input: {
    namaInstansi: string;
    alamat: string;
    noHpPic: string;
    emailPic: string;
    rekeningBank?: string;
    komisiPlatformPersen?: number;
  }) =>
    apiFetch<Instansi>('/api/superadmin/instansi', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateInstansi: (id: string, input: Partial<{
    namaInstansi: string;
    alamat: string;
    noHpPic: string;
    emailPic: string;
    rekeningBank: string | null;
    komisiPlatformPersen: number;
  }>) =>
    apiFetch<Instansi>(`/api/superadmin/instansi/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteInstansi: (id: string) =>
    apiFetch<{ message: string }>(`/api/superadmin/instansi/${id}`, {
      method: 'DELETE',
    }),

  // User Management
  listSuperAdminUsers: (params: { role?: Role | 'all'; cari?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.role && params.role !== 'all') qs.set('role', params.role);
    if (params.cari) qs.set('cari', params.cari);
    const query = qs.toString();
    return apiFetch<SuperAdminUser[]>(`/api/superadmin/pengguna${query ? `?${query}` : ''}`);
  },
  toggleUserStatus: (id: string, aktif: boolean) =>
    apiFetch<SuperAdminUser>(`/api/superadmin/pengguna/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ aktif }),
    }),
  createAdmin: (input: {
    email: string;
    password: string;
    nama: string;
    noHp: string;
    instansiId: string;
  }) =>
    apiFetch<SuperAdminUser>('/api/superadmin/admin', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Armada Approval
  listApprovalCars: (params: { instansiId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.instansiId) qs.set('instansiId', params.instansiId);
    const query = qs.toString();
    return apiFetch<SuperAdminCar[]>(`/api/superadmin/armada/approval${query ? `?${query}` : ''}`);
  },
  approveCar: (id: string, action: 'approve' | 'reject', alasan?: string) =>
    apiFetch<SuperAdminCar>(`/api/superadmin/armada/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ action, alasan }),
    }),

  // Disbursement Monitoring
  listSuperAdminDisbursements: (params: { instansiId?: string; status?: StatusDisbursement; dari?: string; sampai?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.instansiId) qs.set('instansiId', params.instansiId);
    if (params.status) qs.set('status', params.status);
    if (params.dari) qs.set('dari', params.dari);
    if (params.sampai) qs.set('sampai', params.sampai);
    const query = qs.toString();
    return apiFetch<Disbursement[]>(`/api/superadmin/disbursements${query ? `?${query}` : ''}`);
  },

  // Checkout (Customer)
  checkoutBooking: (bookingId: string) =>
    apiFetch<{ bookingId: string; invoiceUrl: string; invoiceId: string; amount: number; expiresAt: string }>(
      `/api/bookings/${bookingId}/checkout`,
      { method: 'POST' }
    ),
  getBookingPaymentStatus: (bookingId: string) =>
    apiFetch<{ bookingId: string; bookingStatus: StatusBooking; paymentStatus: string | null }>(
      `/api/bookings/${bookingId}/payment-status`
    ),
};

export { ApiError };
