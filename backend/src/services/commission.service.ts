/**
 * Helper komisi platform terpusat.
 *
 * Aturan: agregat HISTORIS (dashboard, tren, laporan, saldo, pencairan)
 * memakai snapshot % komisi yang tersimpan di booking
 * (`komisiPersenSnapshot`, diisi saat booking dibuat). Rate LIVE milik
 * instansi hanya dipakai sebagai fallback (data lama sebelum backfill)
 * dan untuk PROYEKSI ke depan (estimasi, preview batch baru).
 *
 * Tanpa ini, mengubah komisi_platform_persen sebuah instansi akan
 * mengubah seluruh histori laporannya secara retroaktif.
 */

type SnapshotValue = number | string | { toString(): string } | null | undefined;

/** Rate % komisi yang berlaku untuk sebuah booking. */
export function rateUntukBooking(
  snapshot: SnapshotValue,
  instansiId: string,
  rateMap: Map<string, number>,
): number {
  if (snapshot !== null && snapshot !== undefined) {
    const parsed = Number(snapshot);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return rateMap.get(instansiId) ?? 10;
}

/** Nominal komisi (dibulatkan) untuk sebuah booking. */
export function komisiUntukBooking(
  totalHarga: number | string | { toString(): string },
  snapshot: SnapshotValue,
  instansiId: string,
  rateMap: Map<string, number>,
): number {
  const rate = rateUntukBooking(snapshot, instansiId, rateMap);
  return Math.round((Number(totalHarga) * rate) / 100);
}

/** Nominal bersih (dibulatkan) untuk sebuah booking. */
export function nettUntukBooking(
  totalHarga: number | string | { toString(): string },
  snapshot: SnapshotValue,
  instansiId: string,
  rateMap: Map<string, number>,
): number {
  return Math.round(Number(totalHarga)) - komisiUntukBooking(totalHarga, snapshot, instansiId, rateMap);
}
