import { Car, JenisAddon } from '@prisma/client';

export interface AddonSelection {
  jenis: JenisAddon;
  /** Dipakai untuk asuransi/antar_jemput, harga flat per pemesanan (bukan per hari). */
  harga?: number;
}

export interface PriceBreakdown {
  durasiHari: number;
  hargaDasar: number;
  addons: { jenis: JenisAddon; harga: number }[];
  totalAddon: number;
  totalHarga: number;
}

function hitungDurasiHari(tanggalMulai: Date, tanggalSelesai: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const durasi = Math.round(
    (tanggalSelesai.getTime() - tanggalMulai.getTime()) / msPerDay
  );
  if (durasi <= 0) {
    throw new Error('tanggal_selesai harus setelah tanggal_mulai');
  }
  return durasi;
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
  car: Pick<Car, 'hargaPerHari' | 'tipeSewa' | 'hargaSopirPerHari'>,
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

  // Add-on lain (asuransi, antar_jemput) — flat, ambil harga apa adanya
  // dari request untuk skeleton ini; di implementasi penuh sebaiknya
  // harga add-on non-sopir juga divalidasi dari tabel referensi harga
  // resmi (bukan dipercaya mentah dari klien), bukan cuma dari `harga`
  // yang dikirim frontend.
  for (const addon of requestedAddons) {
    if (addon.jenis === 'sopir') continue; // sudah ditangani di atas
    addons.push({ jenis: addon.jenis, harga: addon.harga ?? 0 });
  }

  const totalAddon = addons.reduce((sum, a) => sum + a.harga, 0);
  const totalHarga = hargaDasar + totalAddon;

  return { durasiHari, hargaDasar, addons, totalAddon, totalHarga };
}
