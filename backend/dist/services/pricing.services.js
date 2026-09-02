"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hitungRincianHarga = hitungRincianHarga;
// Harga resmi addon non-sopir (asuransi, antar_jemput) — flat per
// pemesanan, BUKAN per hari. HARUS sama persis dengan ADDON_HARGA_DEFAULT
// di frontend/src/pages/BookingPage.tsx (itu cuma untuk tampilan estimasi
// sebelum submit; sumber kebenaran harga yang sesungguhnya ada di sini).
//
// PENTING: sebelumnya harga addon ini diambil MENTAH dari request client
// (cuma divalidasi nonnegative() di Zod) — siapa pun yang panggil API
// langsung (skip UI) bisa kirim harga: 0 dan dapat asuransi/antar-jemput
// gratis. Beda dari addon 'sopir' yang sudah benar sejak awal (diambil
// dari car.hargaSopirPerHari di database, bukan dari client).
const ADDON_HARGA_RESMI = {
    asuransi: 75_000,
    antar_jemput: 50_000,
};
function hitungDurasiHari(tanggalMulai, tanggalSelesai) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const durasi = Math.round((tanggalSelesai.getTime() - tanggalMulai.getTime()) / msPerDay);
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
function hitungRincianHarga(car, tanggalMulai, tanggalSelesai, requestedAddons) {
    const durasiHari = hitungDurasiHari(tanggalMulai, tanggalSelesai);
    const hargaPerHari = Number(car.hargaPerHari);
    const hargaDasar = hargaPerHari * durasiHari;
    const addons = [];
    // Aturan tipe_sewa (§6.2 F6 / §11.3):
    //  - lepas_kunci    -> sopir tidak ditawarkan sama sekali
    //  - dengan_sopir   -> sopir wajib, dipaksa masuk di sini
    //  - keduanya       -> sopir opsional, ikuti pilihan requestedAddons
    const sopirDiminta = requestedAddons.some((a) => a.jenis === 'sopir');
    if (car.tipeSewa === 'dengan_sopir') {
        if (car.hargaSopirPerHari === null) {
            throw new Error('Data mobil tidak konsisten: tipe_sewa dengan_sopir tapi harga_sopir_per_hari kosong');
        }
        addons.push({
            jenis: 'sopir',
            harga: Number(car.hargaSopirPerHari) * durasiHari,
        });
    }
    else if (car.tipeSewa === 'keduanya' && sopirDiminta) {
        if (car.hargaSopirPerHari === null) {
            throw new Error('Data mobil tidak konsisten: menawarkan sopir tapi harga_sopir_per_hari kosong');
        }
        addons.push({
            jenis: 'sopir',
            harga: Number(car.hargaSopirPerHari) * durasiHari,
        });
    }
    else if (car.tipeSewa === 'lepas_kunci' && sopirDiminta) {
        // Klien mencoba minta sopir pada unit yang memang tidak menawarkannya.
        throw new Error('Mobil ini hanya tersedia lepas kunci (tanpa sopir)');
    }
    // Add-on lain (asuransi, antar_jemput) — flat, harga SELALU diambil dari
    // ADDON_HARGA_RESMI di atas (sumber kebenaran server), mengabaikan `harga`
    // apa pun yang dikirim client — sama seperti perlakuan addon 'sopir' di
    // atas. `requestedAddons` cuma dipakai untuk tahu addon MANA yang dipilih
    // (jenisnya), bukan berapa harganya.
    for (const addon of requestedAddons) {
        if (addon.jenis === 'sopir')
            continue; // sudah ditangani di atas
        addons.push({ jenis: addon.jenis, harga: ADDON_HARGA_RESMI[addon.jenis] });
    }
    const totalAddon = addons.reduce((sum, a) => sum + a.harga, 0);
    const totalHarga = hargaDasar + totalAddon;
    return { durasiHari, hargaDasar, addons, totalAddon, totalHarga };
}
//# sourceMappingURL=pricing.services.js.map