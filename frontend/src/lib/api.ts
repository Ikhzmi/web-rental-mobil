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
}

export interface CreateBookingInput {
  carId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasiAmbil: string;
  lokasiKembali: string;
  addons: { jenis: JenisAddon; harga?: number }[];
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
};

export { ApiError };
