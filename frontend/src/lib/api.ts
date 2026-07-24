import { supabase } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export type Kategori = 'city_car' | 'suv' | 'mpv' | 'mewah';
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
  deskripsi: string | null;
  images: CarImage[];
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
export type StatusBooking = 'pending' | 'dikonfirmasi' | 'berjalan' | 'selesai' | 'dibatalkan';

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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

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
};

export { ApiError };
