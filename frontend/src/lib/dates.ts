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
 * 01.00 WIB) → Date(2026, 8, 15) bukan Date(2026, 8, 14).
 */
export function parseWibDate(dateStr: string): Date {
  const wibMs = new Date(dateStr).getTime() + 7 * 3600 * 1000;
  const w = new Date(wibMs);
  return new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
}

/** True bila dua tanggal jatuh di hari kalender WIB yang sama. */
export function isSameWibDay(a: Date | string, b: Date | string): boolean {
  return toWibDayKey(new Date(a)) === toWibDayKey(new Date(b));
}

/**
 * Format rentang sewa: SATU tanggal bila dari & sampai hari yang sama
 * (mis. "23 Sep 2026"), bukan "23 Sep — 23 Sep 2026" yang redundan.
 * Perbandingan & format memakai tanggal kalender WIB (bukan UTC mentah
 * maupun zona lokal) agar selaras dengan hari yang ditagih backend.
 * `fmt` menentukan format tanggal tiap sisi (mis. short/long).
 */
export function formatRentangTanggal(
  from: Date | string,
  to: Date | string | undefined | null,
  fmt: (d: Date) => string,
): string {
  const f = parseWibDate(new Date(from).toISOString());
  if (!to) return fmt(f);
  const t = parseWibDate(new Date(to).toISOString());
  if (f.getTime() === t.getTime()) return fmt(f);
  return `${fmt(f)} — ${fmt(t)}`;
}

/**
 * Format ISO timestamp dari backend menjadi tanggal WIB yang benar.
 * Contoh: "2026-09-14T18:00:00.000Z" → "15 September 2026"
 */
export function formatWibTanggal(iso: string): string {
  return parseWibDate(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format pendek: "15 Sep 2026"
 */
export function formatWibTanggalShort(iso: string): string {
  return parseWibDate(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format dengan waktu jam (untuk log/admin): "15 Sep 2026, 01.00"
 */
export function formatWibTanggalJam(iso: string): string {
  const d = parseWibDate(iso);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
