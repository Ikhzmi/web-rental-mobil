-- ============================================================
-- 008_booking_timestamps.sql
-- Mengubah bookings.tanggal_mulai/selesai dari DATE menjadi TIMESTAMPTZ
-- dan mengisi jam operasional 01.00–23.00 WIB.
--
-- Masalah: kolom DATE tidak menyimpan jam, sehingga semua tampilan jam
-- (mis. dashboard "Booking Hari Ini") merender tengah malam UTC sebagai
-- 07.00 WIB — jam fiktif yang tidak sesuai kebijakan 01.00–23.00.
-- Reschedule lama yang mengirim tanggal saja juga membuat jendela overlap
-- sepanjang NOL (risiko double-booking).
--
-- Konversi: DATE '2026-09-22' = sewa tanggal 22 Sep → mulai 22 Sep 01.00
-- WIB (= 21 Sep 18.00 UTC = stored − 6 jam), selesai 22 Sep 23.00 WIB
-- (= 22 Sep 16.00 UTC = stored + 16 jam).
-- Idempotent: guard WHERE hanya menyentuh baris yang masih tepat
-- tengah malam UTC.
-- ============================================================

ALTER TABLE bookings
  ALTER COLUMN tanggal_mulai TYPE TIMESTAMPTZ USING tanggal_mulai::timestamptz,
  ALTER COLUMN tanggal_selesai TYPE TIMESTAMPTZ USING tanggal_selesai::timestamptz;

UPDATE bookings
SET tanggal_mulai = tanggal_mulai - INTERVAL '6 hours',
    tanggal_selesai = tanggal_selesai + INTERVAL '16 hours',
    updated_at = NOW()
WHERE EXTRACT(HOUR FROM tanggal_mulai) = 0
  AND EXTRACT(MINUTE FROM tanggal_mulai) = 0
  AND EXTRACT(SECOND FROM tanggal_mulai) = 0
  AND EXTRACT(HOUR FROM tanggal_selesai) = 0
  AND EXTRACT(MINUTE FROM tanggal_selesai) = 0
  AND EXTRACT(SECOND FROM tanggal_selesai) = 0;
