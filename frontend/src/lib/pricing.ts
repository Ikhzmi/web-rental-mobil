import type { Car, JenisAddon } from './api';

export interface AddonEstimate {
  jenis: JenisAddon;
  label: string;
  harga: number;
}

export interface PriceEstimate {
  durasiHari: number;
  hargaDasar: number;
  addons: AddonEstimate[];
  totalAddon: number;
  totalHarga: number;
}

const ADDON_LABEL: Record<JenisAddon, string> = {
  sopir: 'Sopir',
  asuransi: 'Asuransi Tambahan',
  antar_jemput: 'Antar-Jemput',
};

/**
 * Estimasi harga untuk ditampilkan real-time di form booking SAJA.
 * Mengikuti rumus §11.3 PRD persis, tapi ini BUKAN sumber kebenaran —
 * `POST /api/bookings` di backend menghitung ulang dari nol dan
 * mengabaikan angka apa pun yang dikirim dari sini (lihat
 * kerental-backend/src/services/pricing.service.ts). Kalau backend dan
 * estimasi ini beda hasil, backend yang menang — pengguna akan lihat
 * halaman konfirmasi dengan angka final dari server, bukan dari sini.
 */
export function estimasiHarga(
  car: Pick<Car, 'hargaPerHari' | 'tipeSewa' | 'hargaSopirPerHari'>,
  tanggalMulai: Date | undefined,
  tanggalSelesai: Date | undefined,
  sopirDipilih: boolean,
  addonLain: { jenis: JenisAddon; harga: number }[] = [],
): PriceEstimate | null {
  if (!tanggalMulai || !tanggalSelesai) return null;

  const start = new Date(tanggalMulai);
  start.setHours(0, 0, 0, 0);
  const end = new Date(tanggalSelesai);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  const durasiHari = Math.max(1, diffDays);

  const hargaPerHari = Number(car.hargaPerHari);
  const hargaDasar = hargaPerHari * durasiHari;

  const addons: AddonEstimate[] = [];

  const butuhSopir = car.tipeSewa === 'dengan_sopir' || (car.tipeSewa === 'keduanya' && sopirDipilih);
  if (butuhSopir && car.hargaSopirPerHari) {
    addons.push({
      jenis: 'sopir',
      label: ADDON_LABEL.sopir,
      harga: Number(car.hargaSopirPerHari) * durasiHari,
    });
  }

  for (const addon of addonLain) {
    addons.push({ jenis: addon.jenis, label: ADDON_LABEL[addon.jenis], harga: addon.harga });
  }

  const totalAddon = addons.reduce((sum, a) => sum + a.harga, 0);
  const totalHarga = hargaDasar + totalAddon;

  return { durasiHari, hargaDasar, addons, totalAddon, totalHarga };
}

export function formatRupiah(value: number): string {
  return `Rp${value.toLocaleString('id-ID')}`;
}

export function formatCompactRupiah(value: number): string {
  if (!value || isNaN(value)) return 'Rp0';
  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    return `Rp${jt % 1 === 0 ? jt : jt.toFixed(1)}jt`;
  }
  if (value >= 1_000) {
    const rb = value / 1_000;
    return `Rp${rb % 1 === 0 ? rb : rb.toFixed(0)}rb`;
  }
  return `Rp${value}`;
}
