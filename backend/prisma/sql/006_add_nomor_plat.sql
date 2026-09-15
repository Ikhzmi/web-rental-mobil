-- ============================================================
-- 006_add_nomor_plat.sql
-- Menambahkan kolom nomor_plat ke tabel cars
-- Kolom bersifat nullable agar data lama tidak rusak
-- ============================================================

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS nomor_plat TEXT;

COMMENT ON COLUMN cars.nomor_plat IS 'Nomor polisi kendaraan, e.g. BK 1234 XYZ. Nullable untuk kompatibilitas data lama.';
