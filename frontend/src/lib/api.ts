import { supabase } from './supabase';

// Jika VITE_API_URL tidak diset, gunakan string kosong (path relatif) agar request otomatis melewati reverse proxy (Vite / ngrok) tanpa hardcode localhost:3001
const API_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : '';

// Kategori diperluas dari 4 ke 8 di v1.3
export type Kategori = 'city_car' | 'hatchback' | 'suv' | 'mpv' | 'minibus' | 'pickup' | 'mewah' | 'electric';
export type Transmisi = 'manual' | 'matic';
export type BahanBakar = 'bensin' | 'diesel' | 'hybrid' | 'electric';
export type TipeSewa = 'lepas_kunci' | 'dengan_sopir' | 'keduanya';
export type StatusMobil = 'tersedia' | 'maintenance' | 'nonaktif';

export interface CarImage {
  id: string;
  url: string;
  urutan: number;
}

export interface CarBlockedDate {
  id: string;
  carId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan?: string | null;
  createdAt: string;
}

export interface Car {
  id: string;
  nama: string;
  nomorPlat?: string | null;
  kategori: Kategori;
  transmisi: Transmisi;
  bahanBakar?: BahanBakar;
  tipeSewa: TipeSewa;
  hargaSopirPerHari: string | null;
  hargaAntarJemput?: string | null;
  kapasitasKursi: number;
  hargaPerHari: string;
  status: StatusMobil;
  statusApproval?: 'menunggu_persetujuan' | 'disetujui' | 'ditolak';
  deskripsi: string | null;
  images: CarImage[];
  instansi?: {
    id: string;
    namaInstansi: string;
    status: 'aktif' | 'nonaktif';
    alamat?: string;
    noHpPic?: string;
  };
}

/** Pagination metadata returned by paginated endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response wrapper for paginated endpoints */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
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
  role: 'customer' | 'admin' | 'super_admin';
  noKtp: string | null;
  noSim: string | null;
  alamat: string | null;
  dokumenKtpUrl: string | null;
  dokumenSimUrl: string | null;
  dokumenVerified: boolean;
  aktif: boolean;
  namaBank?: string | null;
  nomorRekening?: string | null;
  namaPemilikRekening?: string | null;
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
  profile?: { nama: string; email: string; noHp: string; dokumenVerified?: boolean };
  // expiresAt from checkout API response
  expiresAt?: string;
  rekeningRefund?: string | null;
  alasanPembatalan?: string | null;
  refund?: RefundData;
  payment?: {
    id: string;
    jumlah: string | number;
    status: string;
    metodeBayar: string;
    paidAt?: string | null;
  };
}

export type StatusRefund = 'menunggu_persetujuan' | 'disetujui' | 'diproses' | 'berhasil' | 'ditolak';

export interface RefundData {
  id: string;
  bookingId: string;
  paymentId?: string | null;
  jumlahAsli: number | string;
  potonganAdmin: number | string;
  jumlahRefund: number | string;
  rekeningTujuan?: string | null;
  alasan?: string | null;
  status: StatusRefund;
  disetujuiOleh?: string | null;
  disetujuiPada?: string | null;
  diprosesOleh?: string | null;
  selesaiPada?: string | null;
  catatan?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
}

export interface RefundStats {
  menunggu_persetujuan: number;
  disetujui: number;
  diproses: number;
  berhasil: number;
  ditolak: number;
  totalNilaiRefund?: number;
  totalNilaiRefundBerhasil?: number;
  totalNilaiRefundPending?: number;
}


export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  carId: string;
  rating: number;
  komentar: string | null;
  createdAt: string;
  profile?: { nama: string };
  car?: {
    nama: string;
    images?: { url: string; isPrimary?: boolean }[];
    instansi?: { id: string; namaInstansi: string };
  };
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
  saldoTertundaKotor?: number;
  komisiPlatformPersen?: number;
  totalSudahDicairkan: number;
  recentBookings: Array<{
    id: string;
    car: { nama: string };
    profile: { nama: string };
    totalHarga: string;
    status: string;
    createdAt: string;
  }>;
  recentDisbursements: Array<{
    id: string;
    jumlahBersih: string;
    status: string;
    dicairkanPada: string | null;
  }>;
  refundStats?: {
    pending: number;
    diproses: number;
    totalBerhasil: number;
  };
}

// Data tren nyata (bulan ini vs bulan lalu) + 7-day sparklines untuk StatCard di Admin Dashboard
export interface InstansiDashboardTrends {
  pendapatanBulanIni: number;
  bookingAktifBulanIni: number;
  armadaTersediaBulanIni: number;
  saldoTertundaBulanIni: number;
  trendPendapatan: number;
  trendBookingAktif: number;
  trendArmadaTersedia: number;
  trendSaldoTertunda: number;
  sparklinePendapatan: number[];
  sparklineBookingAktif: number[];
  sparklineArmadaTersedia: number[];
  sparklineSaldoTertunda: number[];
}

// Data grafik pendapatan per bucket waktu, dihitung dari booking asli.
export interface InstansiRevenueSeries {
  labels: string[];
  values: number[];
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

export interface PaginatedAdminBookings {
  data: AdminBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  npwp?: string | null;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SuperAdminCar {
  id: string;
  nama: string;
  nomorPlat?: string | null;
  kategori: KategoriMobil;
  transmisi: Transmisi;
  tipeSewa: TipeSewa;
  kapasitasKursi: number;
  hargaPerHari: string;
  status: StatusMobil;
  statusApproval: StatusApproval;
  alasanPenolakan: string | null;
  deskripsi?: string | null;
  createdAt: string;
  images: CarImage[];
  instansi: { id: string; namaInstansi: string };
  _count?: { bookings: number };
}

export interface Disbursement {
  id: string;
  instansiId: string;
  jumlahKotor: string;
  komisiPlatform: string;
  jumlahBersih: string;
  status: StatusDisbursement;
  bankTransferId: string | null;
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

// Saldo tertunda per instansi (dari sudut pandang SuperAdmin, lintas
// seluruh instansi) — dipakai saat membuat pencairan dana baru secara
// manual. Beda dengan `InstansiSaldo` di bawah yang khusus untuk halaman
// saldo instansi itu sendiri.
export interface SaldoTertundaInstansi {
  id: string;
  namaInstansi: string;
  rekeningBank: string | null;
  komisiPlatformPersen: number;
  saldoTertunda: number;
  saldoTertundaKotor: number;
  jumlahBookingTertunda: number;
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
  instansiNama?: string | null;
}

export interface InstansiActivity {
  id: string;
  tipe: 'pesanan' | 'armada' | 'admin_activity' | string;
  judul: string;
  deskripsi: string;
  status: string;
  waktu: string;
  detailUrl?: string;
  instansiNama?: string;
}

export interface InstansiFinancialItemRefund {
  id: string;
  bookingId: string;
  carNama: string;
  carPlat: string;
  customerNama: string;
  jumlahRefund: number;
  rekeningTujuan: string;
  alasan: string;
  status: string;
  createdAt: string;
}

export interface InstansiFinancialData {
  instansi: {
    namaInstansi: string;
    komisiPlatformPersen: number;
    rekeningBank: string;
  };
  summary: {
    totalGrossRevenue: number;
    totalPlatformCommission: number;
    totalNetRevenue: number;
    saldoSiapDicairkanGross: number;
    saldoSiapDicairkanNett: number;
    saldoSudahDicairkanNett: number;
    saldoDalamProsesNett: number;
    totalRefundAmount?: number;
    countRefundPending?: number;
  };
  disbursements: {
    id: string;
    status: string;
    jumlahKotor: number;
    komisiPlatform: number;
    jumlahBersih: number;
    rekeningTujuan: string;
    catatan?: string | null;
    createdAt: string;
    dicairkanPada?: string | null;
    itemCount: number;
  }[];
  bookings: {
    id: string;
    createdAt: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    statusBooking: string;
    carNama: string;
    carPlat: string;
    customerNama: string;
    gross: number;
    komisiPlatform: number;
    nett: number;
    disbursementStatus: string;
    disbursementId?: string | null;
    refundStatus?: string | null;
    refundJumlah?: number | null;
  }[];
  refunds?: InstansiFinancialItemRefund[];
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
  userId?: string | null;
  instansiId?: string | null;
  targetRole?: string | null;
  type: string;
  title: string;
  message: string;
  data: {
    actionUrl?: string;
    bookingId?: string;
    carId?: string;
    instansiId?: string;
    disbursementId?: string;
    [key: string]: unknown;
  } | null;
  isRead: boolean;
  readAt?: string | null;
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
  percentageShare?: number;
}

export interface PopularVehicle {
  id: string;
  nama: string;
  kategori: KategoriMobil;
  thumbnail: string | null;
  bookingCount: number;
  available: boolean;
  namaInstansi?: string | null;
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
  server: { status: string; uptime: string; memory: string };
  database: { status: string; latency: string };
  storage: { status: string; latency: string };
  pakasir?: { status: string; latency: string };
  midtrans?: { status: string; latency: string };
  system: { status: string; detail: string };
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
  menungguPembayaran: number;
  dikonfirmasi: number;
  cancelled: number;
}

// ── SuperAdmin Bookings & Transactions & Reports Types ──

export interface SuperAdminBookingItem {
  id: string;
  status: StatusBooking;
  tanggalMulai: string;
  tanggalSelesai: string;
  totalHarga: number;
  createdAt: string;
  car: {
    id: string;
    nama: string;
    nomorPlat?: string | null;
    images: { url: string }[];
  };
  profile: { id: string; nama: string };
  instansi: { id: string; nama: string };
}

export interface SuperAdminTransactionItem {
  id: string;
  type: 'payment' | 'refund' | 'commission' | 'disbursement';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  description: string;
  createdAt: string;
  instansi?: string;
  customer?: string;
  bookingId?: string;
}

export interface TransactionSummary {
  totalMasuk: number;
  totalRefund: number;
  totalKomisi?: number;
}

export interface SuperAdminReportsData {
  revenue: {
    total: number;
    thisMonth: number;
    daily: number;
  };
  booking: {
    total: number;
    active: number;
    completed: number;
    completionRate: number;
  };
  customer: {
    total: number;
    newThisPeriod: number;
    retentionRate: number;
  };
  fleet: {
    total: number;
    available: number;
    utilization: number;
  };
  rental: {
    total: number;
    active: number;
    avgRevenue: number;
  };
  commission: {
    total: number;
    disbursed?: number;
    pending: number;
    rate: number;
  };
  // Tren periode-vs-periode asli (dihitung dari data booking/pembayaran
  // sungguhan) — sebelumnya SEMUA badge tren di halaman Laporan
  // hardcode `change: 0` di frontend, tidak pernah dihitung sama sekali.
  trends: {
    revenue: number;
    booking: number;
  };
  period: string;
  dari: string;
  sampai: string;
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
  nomorPlat?: string | null;
  kategori: Kategori;
  transmisi: Transmisi;
  bahanBakar?: BahanBakar;
  tipeSewa: TipeSewa;
  hargaSopirPerHari?: number | null;
  hargaAntarJemput?: number | null;
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
  sort?: 'harga_asc' | 'harga_desc' | 'top_booked';
  limit?: number;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Custom event types for session management
const SESSION_EXPIRED_EVENT = 'session:expired';
let lastSessionExpiredDispatch = 0;

export function dispatchSessionExpired() {
  const now = Date.now();
  if (now - lastSessionExpiredDispatch < 10_000) {
    return;
  }
  lastSessionExpiredDispatch = now;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(callback: () => void) {
  const handler = () => callback();
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

// Mutex / promise share untuk token refresh agar tidak terjadi duplicate refresh request secara bersamaan
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshSuccess = 0;

async function refreshSessionToken(): Promise<string | null> {
  // Jika baru saja sukses di-refresh dalam 5 detik terakhir, gunakan token sesi terbaru untuk menghindari race condition Supabase
  if (Date.now() - lastRefreshSuccess < 5000) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  // Retry hingga 3x dengan backoff: gangguan jaringan sesaat TIDAK BOLEH
  // langsung dianggap sesi berakhir (penyebab popup "sesi berakhir" palsu).
  refreshPromise = (async () => {
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (!error && data.session) {
            lastRefreshSuccess = Date.now();
            return data.session.access_token;
          }
        } catch {
          // Gangguan jaringan — coba lagi di bawah
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Verifikasi akhir sebelum menyatakan sesi berakhir: kembalikan token dari
 * sesi yang masih tersimpan bila ada. Dipakai setelah refresh gagal agar
 * false-positive 401 (race propagasi token Supabase) tidak memaksa logout.
 */
async function getStoredToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

// Proactive refresh: cek expiry sebelum request agar user aktif tidak kena 401 dadakan
export async function ensureFreshToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s) return null;
    const expMs = s.expires_at ? s.expires_at * 1000 : 0;
    // Jika token sudah kedaluwarsa atau tersisa kurang dari 10 menit, refresh secara proaktif
    if (!expMs || expMs - Date.now() < 10 * 60 * 1000) {
      const refreshed = await refreshSessionToken();
      if (refreshed) return refreshed;
    }
    return s.access_token;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper ke Express API. Menyisipkan Bearer token dari sesi
 * Supabase yang sedang aktif (kalau ada) — dibutuhkan endpoint
 * Customer/Admin sesuai §10 PRD. Endpoint publik tetap jalan tanpa token.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let token = await ensureFreshToken();

  if (import.meta.env.DEV) {
    console.log(`[API] ${init?.method ?? 'GET'} ${path}`);
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // Jika dapat 401 dan sebelumnya memiliki token (pengguna login), coba silent refresh token & retry.
  // Bila refresh gagal, JANGAN langsung vonis expired: cek sesi tersimpan
  // dulu — token hasil refresh paralel/tab lain sering kali sudah ada.
  if (res.status === 401 && token) {
    const newToken = (await refreshSessionToken()) ?? (await getStoredToken());
    if (newToken) {
      token = newToken;
      res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${newToken}`,
          ...init?.headers,
        },
      });
    }
  }

  const body = await res.json().catch(() => null);

  if (import.meta.env.DEV) {
    console.log(`[API] Response ${path}:`, res.status, body);
  }

  if (!res.ok) {
    // Handle 401 — nyatakan sesi berakhir HANYA bila tidak ada sesi sama
    // sekali di storage. Selama sesi masih ada, ini gangguan sesaat:
    // lempar error biasa (bisa retry) tanpa popup/logout paksa.
    if (res.status === 401) {
      const stillHasSession = (await getStoredToken()) !== null;
      if (!stillHasSession) {
        dispatchSessionExpired();
        throw new ApiError('Sesi berakhir. Silakan login kembali.', 401);
      }
      throw new ApiError('Koneksi sesi terganggu. Silakan coba lagi.', 401);
    }
    throw new ApiError(body?.error ?? `Request gagal (${res.status})`, res.status);
  }

  return body.data as T;
}

// Wrapper for endpoints that return additional metadata (pagination, summary, etc.)
async function apiFetchFull<T>(path: string, init?: RequestInit): Promise<T> {
  let token = await ensureFreshToken();

  let res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // Jika dapat 401 dan sebelumnya memiliki token (pengguna login), coba silent refresh token & retry
  if (res.status === 401 && token) {
    const newToken = (await refreshSessionToken()) ?? (await getStoredToken());
    if (newToken) {
      token = newToken;
      res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${newToken}`,
          ...init?.headers,
        },
      });
    }
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      const stillHasSession = (await getStoredToken()) !== null;
      if (!stillHasSession) {
        dispatchSessionExpired();
        throw new ApiError('Sesi berakhir. Silakan login kembali.', 401);
      }
      throw new ApiError('Koneksi sesi terganggu. Silakan coba lagi.', 401);
    }
    throw new ApiError(body?.error ?? `Request gagal (${res.status})`, res.status);
  }

  return body as T;
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

  getPublicStats: () =>
    apiFetch<{
      totalArmada: number;
      totalLokasi: number;
      totalBookingSelesai: number;
      totalReview: number;
      avgRating?: number;
      kepuasanPersen: number;
    }>('/api/public/stats'),

  getMyProfile: () => apiFetch<Profile>('/api/profiles/me'),

  createBooking: (input: CreateBookingInput) =>
    apiFetch<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getBooking: (id: string) => apiFetch<Booking>(`/api/bookings/${id}`),

  // ── Admin: Dashboard (F9) ──
  getDashboardSummary: () => apiFetch<DashboardSummary>('/api/admin/dashboard/summary'),
  getInstansiProfile: () =>
    apiFetch<{ id: string; namaInstansi: string; status: string; komisiPlatformPersen: string; rekeningBank: string | null }>(
      '/api/instansi/profile'
    ),
  getInstansiDashboard: () => apiFetch<InstansiDashboardData>('/api/instansi/dashboard'),
  getInstansiDashboardTrends: () =>
    apiFetch<InstansiDashboardTrends>('/api/instansi/dashboard/trends'),
  getInstansiRevenueSeries: (period: 'today' | '7days' | 'month' | 'year') =>
    apiFetch<InstansiRevenueSeries>(
      `/api/instansi/dashboard/revenue-series?period=${period}`
    ),
  getInstansiActivities: () =>
    apiFetch<InstansiActivity[]>('/api/instansi/activities'),
  getInstansiFinancials: () =>
    apiFetch<InstansiFinancialData>('/api/instansi/financials'),

  // ── Unified Notifications (All Roles: Customer, Admin, SuperAdmin) ──
  getNotifications: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unreadOnly) qs.set('unreadOnly', 'true');
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetchFull<NotificationResponse>(`/api/notifications${query ? `?${query}` : ''}`);
  },
  getNotificationUnreadCount: () =>
    apiFetch<{ unreadCount: number }>('/api/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    apiFetch<Notification>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiFetchFull<{ success: boolean; count: number }>('/api/notifications/mark-all-read', { method: 'POST' }),
  deleteNotification: (id: string) =>
    apiFetchFull<{ success: boolean }>(`/api/notifications/${id}`, { method: 'DELETE' }),

  // ── Admin: Notifications (Kompatibilitas) ──
  getAdminNotifications: (unreadOnly?: boolean) =>
    apiFetchFull<NotificationResponse>(`/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markAdminNotificationRead: (id: string) =>
    apiFetch<Notification>(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  // ── Admin: Armada (F10) ──
  listAdminCars: (params: { page?: number; limit?: number; cari?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.cari) qs.set('cari', params.cari);
    const query = qs.toString();
    return apiFetchFull<PaginatedResponse<Car>>(`/api/admin/cars${query ? `?${query}` : ''}`);
  },
  getAdminCar: (id: string) => apiFetch<Car>(`/api/admin/cars/${id}`),
  createAdminCar: (input: CarInput) =>
    apiFetch<Car>('/api/admin/cars', { method: 'POST', body: JSON.stringify(input) }),
  updateAdminCar: (id: string, input: Partial<CarInput>) =>
    apiFetch<Car>(`/api/admin/cars/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAdminCar: (id: string) =>
    apiFetch<{ message: string; deletedPermanently?: boolean }>(`/api/admin/cars/${id}`, { method: 'DELETE' }),
  addCarImage: (carId: string, input: { url: string; urutan?: number }) =>
    apiFetch<CarImage>(`/api/admin/cars/${carId}/images`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteCarImage: (carId: string, imageId: string) =>
    apiFetch<CarImage>(`/api/admin/cars/${carId}/images/${imageId}`, { method: 'DELETE' }),

  // ── Admin: Tanggal Ketersediaan Armada ──
  listCarBlockedDates: (carId: string) =>
    apiFetch<CarBlockedDate[]>(`/api/admin/cars/${carId}/blocked-dates`),
  addCarBlockedDate: (carId: string, input: { tanggalMulai: string; tanggalSelesai: string; alasan?: string }) =>
    apiFetch<CarBlockedDate>(`/api/admin/cars/${carId}/blocked-dates`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteCarBlockedDate: (carId: string, blockedId: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/cars/${carId}/blocked-dates/${blockedId}`, {
      method: 'DELETE',
    }),

  // ── Admin: Pesanan (F11) ──
  listAdminBookings: (params: { status?: StatusBooking; dari?: string; sampai?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.dari) qs.set('dari', params.dari);
    if (params.sampai) qs.set('sampai', params.sampai);
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetchFull<PaginatedAdminBookings>(`/api/admin/bookings${query ? `?${query}` : ''}`);
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
  setDokumenVerified: (userId: string, verified: boolean) =>
    apiFetch<{ id: string; dokumenVerified: boolean }>(
      `/api/admin/dokumen/${userId}/verify`,
      { method: 'PATCH', body: JSON.stringify({ verified }) }
    ),

    // ── Customer: Riwayat Pesanan (F7) ──
  listMyBookings: () => apiFetch<Booking[]>('/api/bookings/mine'),
  cancelBooking: (id: string, data?: { alasanPembatalan?: string; rekeningRefund?: string }) =>
    apiFetch<Booking>(`/api/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(data ?? {}),
    }),
  rescheduleBooking: (id: string, tanggalMulai: string, tanggalSelesai: string) =>
    apiFetch<Booking>(`/api/bookings/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ tanggalMulai, tanggalSelesai }),
    }),

  // ── Ulasan (Review) ──
  listReviews: (carId?: string) =>
    apiFetch<Review[]>(`/api/reviews${carId ? `?carId=${carId}` : ''}`),
  listFeaturedReviews: () => apiFetch<Review[]>('/api/reviews/featured'),
  getBookingReviewStatus: (bookingId: string) =>
    apiFetch<{ canReview: boolean; alreadyReviewed: boolean; review: Review | null }>(
      `/api/reviews/booking/${bookingId}`
    ),
  createReview: (input: { bookingId: string; rating: number; komentar?: string }) =>
    apiFetch<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(input) }),

  // ── Customer: Profil (F8) ──
  updateMyProfile: (input: Partial<Pick<Profile, 'nama' | 'noHp' | 'noKtp' | 'noSim' | 'alamat'>> & {
    namaBank?: string;
    nomorRekening?: string;
    namaPemilikRekening?: string;
  }) =>
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
    apiFetchFull<NotificationResponse>(`/api/superadmin/dashboard/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
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
    npwp?: string;
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
    npwp: string | null;
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
  listSuperAdminUsers: (params: { role?: Role | 'all'; cari?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.role && params.role !== 'all') qs.set('role', params.role);
    if (params.cari) qs.set('cari', params.cari);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetchFull<PaginatedResponse<SuperAdminUser>>(`/api/superadmin/pengguna${query ? `?${query}` : ''}`);
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
  createAdminUser: (input: {
    email: string;
    password: string;
    nama: string;
    noHp: string;
  }) =>
    apiFetch<Profile>('/api/admin/users/create-admin', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Armada Approval & Moderasi
  listApprovalCars: (params: { instansiId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.instansiId) qs.set('instansiId', params.instansiId);
    const query = qs.toString();
    return apiFetch<SuperAdminCar[]>(`/api/superadmin/armada/approval${query ? `?${query}` : ''}`);
  },
  listPublishedCars: (params: { instansiId?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.instansiId) qs.set('instansiId', params.instansiId);
    if (params.search) qs.set('search', params.search);
    const query = qs.toString();
    return apiFetch<SuperAdminCar[]>(`/api/superadmin/armada/published${query ? `?${query}` : ''}`);
  },
  listTakedownCars: (params: { instansiId?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.instansiId) qs.set('instansiId', params.instansiId);
    if (params.search) qs.set('search', params.search);
    const query = qs.toString();
    return apiFetch<SuperAdminCar[]>(`/api/superadmin/armada/takedown${query ? `?${query}` : ''}`);
  },
  approveCar: (id: string, action: 'approve' | 'reject', alasan?: string) =>
    apiFetch<SuperAdminCar>(`/api/superadmin/armada/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ action, alasan }),
    }),
  takedownCar: (id: string, alasan: string) =>
    apiFetch<{ data: SuperAdminCar; message: string }>(`/api/superadmin/armada/${id}/takedown`, {
      method: 'PATCH',
      body: JSON.stringify({ alasan }),
    }),
  restoreCar: (id: string) =>
    apiFetch<{ data: SuperAdminCar; message: string }>(`/api/superadmin/armada/${id}/restore`, {
      method: 'PATCH',
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
  // Saldo tertunda per instansi — untuk memilih instansi saat membuat
  // pencairan dana manual baru.
  listInstansiSaldo: () => apiFetch<SaldoTertundaInstansi[]>('/api/superadmin/instansi-saldo'),
  // Membuat batch pencairan dana manual untuk satu instansi (semua booking
  // 'selesai' yang belum pernah dicairkan akan dibungkus jadi satu batch).
  createDisbursement: (input: { instansiId: string; bankTransferId?: string }) =>
    apiFetch<Disbursement>('/api/superadmin/disbursements', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  // Menandai hasil transfer manual (berhasil/gagal) untuk batch yang masih
  // berstatus 'diproses'.
  updateDisbursementStatus: (id: string, input: { status: 'berhasil' | 'gagal'; bankTransferId?: string }) =>
    apiFetch<Disbursement>(`/api/superadmin/disbursements/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  // Bookings Management
  listSuperAdminBookings: (params?: {
    status?: StatusBooking;
    cari?: string;
    page?: number;
    limit?: number;
    dari?: string;
    sampai?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.cari) qs.set('cari', params.cari);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.dari) qs.set('dari', params.dari);
    if (params?.sampai) qs.set('sampai', params.sampai);
    const query = qs.toString();
    return apiFetchFull<{
      data: SuperAdminBookingItem[];
      pagination: PaginationMeta;
    }>(`/api/superadmin/bookings${query ? `?${query}` : ''}`);
  },
  getSuperAdminBookingDetail: (id: string) =>
    apiFetch<Booking & {
      car: Car & { instansi: { id: string; namaInstansi: string } };
      profile: { id: string; nama: string; email: string; noHp: string };
      payment: { status: string; metodeBayar: string; jumlah: string; paidAt: string | null } | null;
    }>(`/api/superadmin/bookings/${id}`),

  // Transactions
  listSuperAdminTransactions: (params?: {
    type?: 'payment' | 'refund' | 'commission' | 'disbursement';
    status?: 'pending' | 'success' | 'failed';
    cari?: string;
    page?: number;
    limit?: number;
    dari?: string;
    sampai?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.cari) qs.set('cari', params.cari);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.dari) qs.set('dari', params.dari);
    if (params?.sampai) qs.set('sampai', params.sampai);
    const query = qs.toString();
    return apiFetchFull<{
      data: SuperAdminTransactionItem[];
      pagination: PaginationMeta;
      summary: TransactionSummary;
    }>(`/api/superadmin/transactions${query ? `?${query}` : ''}`);
  },

  // Reports
  getSuperAdminReports: (period?: string) => {
    const query = period ? `?period=${period}` : '';
    return apiFetchFull<SuperAdminReportsData>(`/api/superadmin/reports${query}`);
  },

  // Checkout (Customer) — via Pakasir
  checkoutBooking: (bookingId: string) =>
    apiFetch<{
      bookingId: string;
      invoiceUrl: string;
      invoiceId: string;
      orderId?: string;
      amount: number;
      expiresAt: string;
      gateway: 'pakasir';
    }>(
      `/api/bookings/${bookingId}/checkout`,
      { method: 'POST' }
    ),

  // Create Payment — via Pakasir
  createPayment: (bookingId: string, data: { paymentMethod: string }) =>
    apiFetch<{
      bookingId: string;
      gatewayInvoiceId: string;
      paymentUrl: string;
      paymentNumber?: string;
      qrisString?: string;
      expiresAt: string;
      paymentMethod: string;
      amount: number;
      fee?: number;
      totalPayment?: number;
      gateway: 'pakasir';
    }>(
      `/api/bookings/${bookingId}/payment`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }
    ),

  getBookingPaymentStatus: (bookingId: string) =>
    apiFetch<{
      bookingId: string;
      bookingStatus: StatusBooking;
      paymentStatus: string | null;
      paymentId?: string | null;
      gatewayInvoiceId?: string | null;
      paymentUrl?: string | null;
      paymentNumber?: string | null;
      totalPayment?: number;
      gateway: 'pakasir';
    }>(
      `/api/bookings/${bookingId}/payment-status`
    ),

  simulateBookingPayment: (bookingId: string) =>
    apiFetch<{
      success: boolean;
      message: string;
    }>(
      `/api/bookings/${bookingId}/simulate-payment`,
      {
        method: 'POST',
      }
    ),

  // ==========================================
  // Customer Messages API
  // ==========================================
  listCustomerConversations: () =>
    apiFetch<Conversation[]>('/api/messages/conversations'),

  getCustomerUnreadCount: () =>
    apiFetch<{ unreadCount: number }>('/api/messages/unread-count'),

  createCustomerConversation: (data: { instansiId: string; carId?: string }) =>
    apiFetch<Conversation>('/api/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),

  getCustomerConversation: (id: string) =>
    apiFetch<Conversation>(`/api/messages/conversations/${id}`),

  sendCustomerMessage: (id: string, data: { pesan: string; carId?: string }) =>
    apiFetch<ChatMessage>(`/api/messages/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),

  // ==========================================
  // Admin Messages API
  // ==========================================
  listAdminConversations: () =>
    apiFetch<Conversation[]>('/api/admin/messages/conversations'),

  getAdminUnreadCount: () =>
    apiFetch<{ unreadCount: number }>('/api/admin/messages/unread-count'),

  getAdminConversation: (id: string) =>
    apiFetch<Conversation>(`/api/admin/messages/conversations/${id}`),

  sendAdminMessage: (id: string, data: { pesan: string }) =>
    apiFetch<ChatMessage>(`/api/admin/messages/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),

  // ==========================================
  // Refunds API
  // ==========================================
  getRefundByBooking: (bookingId: string) =>
    apiFetch<{ refund: RefundData | null; booking: any }>(`/api/refunds/booking/${bookingId}`),

  createRefund: (data: { bookingId: string; rekeningTujuan: string; alasan?: string }) =>
    apiFetch<RefundData>('/api/refunds', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),

  updateRefundRekening: (refundId: string, rekeningTujuan: string) =>
    apiFetch<RefundData>(`/api/refunds/${refundId}/rekening`, {
      method: 'PATCH',
      body: JSON.stringify({ rekeningTujuan }),
      headers: { 'Content-Type': 'application/json' },
    }),

  listAdminRefunds: (params?: { page?: number; limit?: number; status?: StatusRefund; cari?: string; dari?: string; sampai?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.cari) searchParams.set('cari', params.cari);
    if (params?.dari) searchParams.set('dari', params.dari);
    if (params?.sampai) searchParams.set('sampai', params.sampai);
    const qs = searchParams.toString();
    // WAJIB apiFetchFull: backend mengembalikan { data, stats, meta }.
    // Dengan apiFetch, body.data (array refund) disalahartikan sebagai
    // seluruh respons sehingga data?.data/stats/meta selalu undefined
    // dan daftar refund selalu terlihat kosong.
    return apiFetchFull<{ data: RefundData[]; stats: RefundStats; meta: { page: number; limit: number; total: number; totalPages: number } }>(
      `/api/refunds/admin${qs ? `?${qs}` : ''}`
    );
  },

  approveAdminRefund: (id: string, catatan?: string) =>
    apiFetch<RefundData>(`/api/refunds/admin/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ catatan }),
      headers: { 'Content-Type': 'application/json' },
    }),

  processAdminRefund: (id: string, catatan?: string) =>
    apiFetch<RefundData>(`/api/refunds/admin/${id}/process`, {
      method: 'PATCH',
      body: JSON.stringify({ catatan }),
      headers: { 'Content-Type': 'application/json' },
    }),

  completeAdminRefund: (id: string, catatan?: string) =>
    apiFetch<RefundData>(`/api/refunds/admin/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ catatan }),
      headers: { 'Content-Type': 'application/json' },
    }),

  rejectAdminRefund: (id: string, alasan: string) =>
    apiFetch<RefundData>(`/api/refunds/admin/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ alasan }),
      headers: { 'Content-Type': 'application/json' },
    }),

  listSuperAdminRefunds: (params?: { page?: number; limit?: number; instansiId?: string; status?: StatusRefund; cari?: string; dari?: string; sampai?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.instansiId) searchParams.set('instansiId', params.instansiId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.cari) searchParams.set('cari', params.cari);
    if (params?.dari) searchParams.set('dari', params.dari);
    if (params?.sampai) searchParams.set('sampai', params.sampai);
    const qs = searchParams.toString();
    // WAJIB apiFetchFull (lihat komentar di listAdminRefunds).
    return apiFetchFull<{ data: RefundData[]; stats: RefundStats; meta: { page: number; limit: number; total: number; totalPages: number } }>(
      `/api/refunds/superadmin${qs ? `?${qs}` : ''}`
    );
  },

  actionSuperAdminRefund: (id: string, data: { status: StatusRefund; catatan?: string }) =>
    apiFetch<RefundData>(`/api/refunds/superadmin/${id}/action`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),
};

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'customer' | 'admin' | 'super_admin';
  pesan: string;
  carId?: string | null;
  isRead: boolean;
  createdAt: string;
  car?: {
    id: string;
    nama: string;
    hargaPerHari: string;
    images?: { url: string }[];
  } | null;
}

export interface Conversation {
  id: string;
  customerId: string;
  instansiId: string;
  carId?: string | null;
  lastMessageAt: string;
  lastMessageText?: string | null;
  unreadCustomerCount: number;
  unreadAdminCount: number;
  createdAt: string;
  updatedAt: string;
  instansi?: {
    id: string;
    namaInstansi: string;
    noHpPic?: string;
    alamat?: string;
  };
  customer?: {
    id: string;
    nama: string;
    email: string;
    noHp?: string;
  };
  car?: {
    id: string;
    nama: string;
    hargaPerHari: string;
    images?: { url: string }[];
  } | null;
  messages?: ChatMessage[];
}

export { ApiError };