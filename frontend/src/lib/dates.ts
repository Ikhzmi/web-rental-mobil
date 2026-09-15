/**
 * Helper tanggal WIB (UTC+7) terpusat.
 *
 * Backend menyimpan jadwal booking sebagai timestamp 01:00–23:00 WIB.
 * Dalam ISO UTC, 01:00 WIB = 18:00 UTC di hari kalender SEBELUMNYA
 * (mis. 15 Sep 01:00 WIB = 14 Sep 18:00 UTC). Kalau kalender hanya
 * mengambil bagian `YYYY-MM-DD` dari string ISO (tanggal UTC), blokir
 * merah akan mulai sehari LEBIH AWAL dari hari booking yang sebenarnya —
 * tanggal yang sudah terbooking terlihat hitam (tersedia) padahal backend
 * menolaknya sebagai bentrok, dan sebaliknya hari tetangga ikut merah.
 *
 * Semua parsing tanggal booking untuk KALENDER harus lewat helper ini
 * supaya hari yang ditandai merah = hari WIB yang sebenarnya dibooking
 * (tanggal ambil = hari pertama booking).
 */

/** Key UTC-midnight dari tanggal kalender WIB sebuah timestamp. */
export function toWibDayKey(d: Date): number {
  const wibMs = d.getTime() + 7 * 3600 * 1000;
  const w = new Date(wibMs);
  return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
}

/**
 * Parse ISO string dari backend menjadi Date local-midnight pada tanggal
 * kalender WIB yang benar. Contoh: "2026-09-14T18:00:00.000Z" (15 Sep
 * 01:00 WIB) → Date(2026, 8, 15) bukan Date(2026, 8, 14).
 */
export function parseWibDate(dateStr: string): Date {
  const wibMs = new Date(dateStr).getTime() + 7 * 3600 * 1000;
  const w = new Date(wibMs);
  return new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
}
