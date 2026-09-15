-- ============================================================
-- 007_komisi_snapshot.sql
-- Snapshot % komisi platform per booking & per item disbursement.
--
-- Masalah: semua agregat historis (dashboard, laporan, tren, pencairan)
-- memakai rate komisi LIVE milik instansi, sehingga mengubah
-- komisi_platform_persen hari ini ikut mengubah seluruh histori secara
-- retroaktif. Kolom snapshot menyimpan rate yang berlaku saat transaksi
-- dibuat; agregat wajib memakai snapshot dengan fallback ke rate live
-- untuk baris yang snapshot-nya NULL.
--
-- Aman dijalankan ulang (idempotent): ADD COLUMN IF NOT EXISTS +
-- UPDATE ... WHERE ... IS NULL.
-- Terapkan via Supabase Dashboard > SQL Editor jika akses DB langsung
-- tidak tersedia.
-- ============================================================

-- 1. Kolom snapshot di bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS komisi_persen_snapshot DECIMAL(5, 2);

COMMENT ON COLUMN bookings.komisi_persen_snapshot IS
  'Snapshot % komisi platform saat booking dibuat. Agregat historis wajib pakai ini, bukan rate live instansi.';

-- 2. Kolom snapshot di disbursement_items
ALTER TABLE disbursement_items
  ADD COLUMN IF NOT EXISTS komisi_persen_snapshot DECIMAL(5, 2);

COMMENT ON COLUMN disbursement_items.komisi_persen_snapshot IS
  'Snapshot % komisi saat batch disbursement dibuat (audit trail).';

-- 3. Backfill bookings lama dari rate instansi pemilik mobil saat ini
UPDATE bookings b
SET komisi_persen_snapshot = i.komisi_platform_persen
FROM cars c
JOIN instansi i ON i.id = c.instansi_id
WHERE b.car_id = c.id
  AND b.komisi_persen_snapshot IS NULL;

-- 4. Backfill item disbursement lama dari rate instansi batch saat ini
UPDATE disbursement_items di
SET komisi_persen_snapshot = i.komisi_platform_persen
FROM disbursements d
JOIN instansi i ON i.id = d.instansi_id
WHERE di.disbursement_id = d.id
  AND di.komisi_persen_snapshot IS NULL;
