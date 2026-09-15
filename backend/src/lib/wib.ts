/**
 * Helper batas waktu & kunci hari berbasis kalender WIB (UTC+7, tanpa DST).
 *
 * Masalah: `new Date(y, m, d)` memakai timezone SERVER (UTC di production),
 * sehingga batas bulan/hari dan kunci `toISOString().split('T')[0]` (tanggal
 * UTC) meleset ±7 jam dari WIB — booking 00:00–06:59 WIB di tanggal 1
 * masuk ke bulan kemarin, dan sparkline harian geser sehari. Semua agregat
 * waktu (tren, sparkline, revenue-series) WAJIB memakai helper ini.
 */

export const WIB_OFFSET_MS = 7 * 3600 * 1000;

function wibShifted(d: Date): Date {
  return new Date(d.getTime() + WIB_OFFSET_MS);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Kunci hari 'YYYY-MM-DD' menurut kalender WIB. */
export function wibDayKey(d: Date): string {
  const w = wibShifted(d);
  return `${w.getUTCFullYear()}-${pad2(w.getUTCMonth() + 1)}-${pad2(w.getUTCDate())}`;
}

/** Kunci bulan 'YYYY-MM' menurut kalender WIB. */
export function wibMonthKey(d: Date): string {
  const w = wibShifted(d);
  return `${w.getUTCFullYear()}-${pad2(w.getUTCMonth() + 1)}`;
}

/** Awal hari (00:00 WIB) untuk tanggal yang memuat `ref`. */
export function startOfWibDay(ref: Date): Date {
  const w = wibShifted(ref);
  return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) - WIB_OFFSET_MS);
}

/** Awal bulan WIB; `deltaMonths` menggeser (mis. -1 = bulan lalu). */
export function startOfWibMonth(ref: Date, deltaMonths = 0): Date {
  const w = wibShifted(ref);
  return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + deltaMonths, 1) - WIB_OFFSET_MS);
}

/** Akhir bulan WIB (momen terakhir, presisi ms). */
export function endOfWibMonth(ref: Date, deltaMonths = 0): Date {
  return new Date(startOfWibMonth(ref, deltaMonths + 1).getTime() - 1);
}

/** Jam (0–23) menurut WIB — untuk bucket per jam. */
export function wibHour(d: Date): number {
  return wibShifted(d).getUTCHours();
}

/** Tanggal (1–31) menurut WIB. */
export function wibDate(d: Date): number {
  return wibShifted(d).getUTCDate();
}

/** Hari dalam minggu (0=Min..6=Sab) menurut WIB. */
export function wibDay(d: Date): number {
  return wibShifted(d).getUTCDay();
}

/** Bulan (0–11) menurut WIB. */
export function wibMonth(d: Date): number {
  return wibShifted(d).getUTCMonth();
}

/** Tahun menurut WIB. */
export function wibYear(d: Date): number {
  return wibShifted(d).getUTCFullYear();
}
