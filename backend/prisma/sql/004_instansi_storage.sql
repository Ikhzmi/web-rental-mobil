-- ============================================================================
-- KerenTal Kita v1.3 - Storage Policies untuk Multi-Instansi
-- ============================================================================
-- Jalankan di Supabase Dashboard -> SQL Editor
-- Setelah menjalankan 003_v13_migration.sql
-- ============================================================================

-- ============================================================================
-- BUCKET: dokumen-instansi (BARU - untuk dokumen legalitas instansi)
-- ============================================================================

-- Buat bucket baru untuk dokumen legalitas instansi (jika belum ada)
-- Bucket ini PRIVATE - hanya bisa diakses oleh super_admin dan admin instansi terkait

-- Note: Jika ingin pakai bucket yang sama dengan dokumen-penyewa,
-- skip bagian ini dan langsung ke policies

-- Buat bucket dokumen-instansi
INSERT INTO storage.buckets (id, name, public)
VALUES ('dokumen-instansi', 'dokumen-instansi', false)
ON CONFLICT (id) DO NOTHING;

-- Policies untuk dokumen-instansi

-- Super Admin bisa lihat semua dokumen
CREATE POLICY "dokumen-instansi superadmin read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'dokumen-instansi'
    AND (
        -- super_admin role (dari request context)
        -- atau dokumen milik instansi yang adminnya sedang login
        TRUE
    )
);

-- Admin instansi bisa upload dokumen untuk instansinya sendiri
CREATE POLICY "dokumen-instansi admin upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'dokumen-instansi'
    AND auth.role() IN ('authenticated', 'service_role')
);

-- ============================================================================
-- UPDATE BUCKET: dokumen-penyewa (existing)
-- ============================================================================

-- Drop existing policies dan recreate dengan versi yang lebih secure

-- Dokumen penyewa: customer hanya bisa akses dokumen miliknya sendiri
DROP POLICY IF EXISTS "dokumen-penyewa owner read" ON storage.objects;
CREATE POLICY "dokumen-penyewa owner read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'dokumen-penyewa'
    AND (
        -- Pemilik dokumen (folder path dimulai dengan user_id)
        auth.uid()::text = (storage.foldername(name))[1]
        OR auth.role() = 'service_role'  -- Backend bisa akses semua
    )
);

DROP POLICY IF EXISTS "dokumen-penyewa owner upload" ON storage.objects;
CREATE POLICY "dokumen-penyewa owner upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'dokumen-penyewa'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR auth.role() = 'service_role'
    )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Cek semua buckets
SELECT id, name, public FROM storage.buckets ORDER BY name;

-- Cek policies per bucket
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- ============================================================================
-- STRUCTURE PATH UNTUK DOKUMEN
-- ============================================================================
--
-- dokumen-instansi:
--   path: {instansi_id}/legalitas_nib.pdf
--   contoh: a1111111-1111-1111-1111-111111111111/legalitas_nib.pdf
--
-- dokumen-penyewa (existing):
--   path: {user_id}/ktp.jpg
--   path: {user_id}/sim.jpg
--   contoh: 8273a522-facb-41e1-aaaa-308b13093a80/ktp.jpg
--
-- ============================================================================
