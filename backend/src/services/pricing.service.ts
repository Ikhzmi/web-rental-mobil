import { Car, JenisAddon } from '@prisma/client';

export interface AddonSelection {
  jenis: JenisAddon;
  /** Diabaikan untuk antar_jemput (gratis) dan asuransi (tanpa tarif).
   *  Hanya sopir yang relevan, itupun dihitung server-side. Field ini
   *  dipertahankan demi kompatibilitas. */
  harga?: number;
}

export interface PriceBreakdown {
  durasiHari: number;
  hargaDasar: number;
  addons: { jenis: JenisAddon; harga: number }[];
  totalAddon: number;
  totalHarga: number;
}

/**
 * Konversi ke tanggal kalender WIB (UTC+7) dalam bentuk UTC-midnight key.
 * Frontend mengirim jadwal 01:00–23:00 WIB untuk sewa 1 hari pada tanggal
 * yang sama. Durasi WAJIB dihitung dari kalender WIB, bukan `setHours`
 * timezone server (UTC di production) — kalau tidak, sewa 1 hari bisa
 * terhitung 2 hari (harga ×2).
 * Dengan patokan kalender WIB, tanggal yang sama di WIB selalu = 1 hari.
 */
function toWibDayKey(d: Date): number {
  const wibMs = d.getTime() + 7 * 3600 * 1000;
  const w = new Date(wibMs);
  return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
}

function hitungDurasiHari(tanggalMulai: Date, tanggalSelesai: Date): number {
  const startKey = toWibDayKey(new Date(tanggalMulai));
  const endKey = toWibDayKey(new Date(tanggalSelesai));

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((endKey - startKey) / msPerDay) + 1;
  return Math.max(1, diffDays);
}

/**
 * Satu-satunya sumber kebenaran untuk kalkulasi harga (§11.3 PRD).
 * Frontend BOLEH menghitung estimasi untuk ditampilkan, tapi endpoint
 * `POST /api/bookings` WAJIB memanggil fungsi ini sendiri di backend dan
 * mengabaikan angka apa pun yang dikirim dari klien — mencegah manipulasi
 * harga sisi klien (lihat §14 Risiko).
 *
 * Aturan bisnis penting: untuk mobil dengan tipeSewa === 'dengan_sopir',
 * biaya sopir DIPAKSA masuk sebagai addon di sini, terlepas dari apa yang
 * dikirim frontend di `requestedAddons` — jadi tidak bisa dihilangkan
 * lewat request yang mencoba melewatinya.
 */
export function hitungRincianHarga(
  car: Pick<Car, 'hargaPerHari' | 'tipeSewa' | 'hargaSopirPerHari' | 'hargaAntarJemput'>,
  tanggalMulai: Date,
  tanggalSelesai: Date,
  requestedAddons: AddonSelection[]
): PriceBreakdown {
  const durasiHari = hitungDurasiHari(tanggalMulai, tanggalSelesai);
  const hargaPerHari = Number(car.hargaPerHari);
  const hargaDasar = hargaPerHari * durasiHari;

  const addons: { jenis: JenisAddon; harga: number }[] = [];

  // Aturan tipe_sewa (§6.2 F6 / §11.3):
  //  - lepas_kunci    -> sopir tidak ditawarkan sama sekali
  //  - dengan_sopir   -> sopir wajib, dipaksa masuk di sini
  //  - keduanya       -> sopir opsional, ikuti pilihan requestedAddons
  const sopirDiminta = requestedAddons.some((a) => a.jenis === 'sopir');

  if (car.tipeSewa === 'dengan_sopir') {
    if (car.hargaSopirPerHari === null) {
      throw new Error(
        'Data mobil tidak konsisten: tipe_sewa dengan_sopir tapi harga_sopir_per_hari kosong'
      );
    }
    addons.push({
      jenis: 'sopir',
      harga: Number(car.hargaSopirPerHari) * durasiHari,
    });
  } else if (car.tipeSewa === 'keduanya' && sopirDiminta) {
    if (car.hargaSopirPerHari === null) {
      throw new Error(
        'Data mobil tidak konsisten: menawarkan sopir tapi harga_sopir_per_hari kosong'
      );
    }
    addons.push({
      jenis: 'sopir',
      harga: Number(car.hargaSopirPerHari) * durasiHari,
    });
  } else if (car.tipeSewa === 'lepas_kunci' && sopirDiminta) {
    // Klien mencoba minta sopir pada unit yang memang tidak menawarkannya.
    throw new Error('Mobil ini hanya tersedia lepas kunci (tanpa sopir)');
  }

  // Add-on lain — harga RESMI dihitung server-side, angka `harga` dari
  // klien DIABAIKAN agar total tidak bisa dimanipulasi dari request:
  //  - antar_jemput (jemput ke rumah): GRATIS, tidak dihitung & tidak
  //    masuk ringkasan biaya (kebijakan bisnis)
  //  - asuransi: tidak ada tarif resmi di data mobil → 0 (tidak ditagih)
  for (const addon of requestedAddons) {
    if (addon.jenis === 'sopir') continue; // sudah ditangani di atas
    if (addon.jenis === 'antar_jemput') {
      addons.push({ jenis: addon.jenis, harga: 0 });
    } else if (addon.jenis === 'asuransi') {
      addons.push({ jenis: addon.jenis, harga: 0 });
    }
  }

  const totalAddon = addons.reduce((sum, a) => sum + a.harga, 0);
  const totalHarga = hargaDasar + totalAddon;

  return { durasiHari, hargaDasar, addons, totalAddon, totalHarga };
}
