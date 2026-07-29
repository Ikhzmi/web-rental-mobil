-- ============================================================================
-- KerenTal Kita v1.3 - Migration Script
-- Marketplace Multi-Instansi dengan Xendit Payment Gateway
-- ============================================================================
-- Jalankan di Supabase Dashboard -> SQL Editor
-- SEBELUM RUN: Backup database terlebih dahulu!
-- ============================================================================

-- ============================================================================
-- 1. ENUM BARU (v1.3)
-- ============================================================================

-- Create enum baru (jika belum ada)
DO $$ BEGIN
    CREATE TYPE status_approval AS ENUM ('menunggu_persetujuan', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_instansi AS ENUM ('menunggu_verifikasi', 'aktif', 'nonaktif');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metode_bayar AS ENUM ('virtual_account', 'qris', 'ewallet', 'kartu_kredit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_payment AS ENUM ('pending', 'paid', 'expired', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_disbursement AS ENUM ('diproses', 'berhasil', 'gagal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tambah value ke enum existing
-- Role: tambah 'super_admin'
DO $$ BEGIN
    ALTER TYPE role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- KategoriMobil: tambah hatchback, minibus, pickup, electric
DO $$ BEGIN
    ALTER TYPE kategori_mobil ADD VALUE IF NOT EXISTS 'hatchback';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TYPE kategori_mobil ADD VALUE IF NOT EXISTS 'minibus';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TYPE kategori_mobil ADD VALUE IF NOT EXISTS 'pickup';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TYPE kategori_mobil ADD VALUE IF NOT EXISTS 'electric';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- StatusBooking: ubah 'pending' -> 'menunggu_pembayaran'
DO $$ BEGIN
    ALTER TYPE status_booking ADD VALUE IF NOT EXISTS 'menunggu_pembayaran';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. ALTER TABLE - TAMBAH KOLOM BARU
-- ============================================================================

-- Profiles: tambah kolom instansi_id (FK ke instansi)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instansi_id UUID;
-- Index untuk query by instansi
CREATE INDEX IF NOT EXISTS profiles_instansi_id_idx ON profiles(instansi_id);

-- Cars: tambah kolom instansi_id, status_approval, alasan_penolakan
ALTER TABLE cars ADD COLUMN IF NOT EXISTS instansi_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS status_approval status_approval NOT NULL DEFAULT 'menunggu_persetujuan';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT;

-- ============================================================================
-- 3. CREATE TABLE BARU
-- ============================================================================

-- Tabel Instansi
CREATE TABLE IF NOT EXISTS instansi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_instansi VARCHAR(255) NOT NULL,
    alamat TEXT NOT NULL,
    no_hp_pic VARCHAR(20) NOT NULL,
    email_pic VARCHAR(255) NOT NULL,
    dokumen_legalitas_url TEXT,
    status status_instansi NOT NULL DEFAULT 'menunggu_verifikasi',
    komisi_platform_persen DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    rekening_bank VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE,
    xendit_invoice_id VARCHAR(255),
    metode_bayar metode_bayar NOT NULL,
    jumlah DECIMAL(12,2) NOT NULL,
    status status_payment NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Tabel Disbursements
CREATE TABLE IF NOT EXISTS disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instansi_id UUID NOT NULL,
    jumlah_kotor DECIMAL(12,2) NOT NULL,
    komisi_platform DECIMAL(12,2) NOT NULL,
    jumlah_bersih DECIMAL(12,2) NOT NULL,
    status status_disbursement NOT NULL DEFAULT 'diproses',
    xendit_disbursement_id VARCHAR(255),
    dicairkan_pada TIMESTAMPTZ,
    CONSTRAINT fk_disbursements_instansi FOREIGN KEY (instansi_id) REFERENCES instansi(id) ON DELETE CASCADE
);

-- Tabel Disbursement Items
CREATE TABLE IF NOT EXISTS disbursement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_id UUID NOT NULL,
    booking_id UUID NOT NULL,
    jumlah_kotor DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_items_disbursement FOREIGN KEY (disbursement_id) REFERENCES disbursements(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS disbursements_instansi_id_idx ON disbursements(instansi_id);
CREATE INDEX IF NOT EXISTS disbursement_items_disbursement_id_idx ON disbursement_items(disbursement_id);
CREATE INDEX IF NOT EXISTS disbursement_items_booking_id_idx ON disbursement_items(booking_id);

-- ============================================================================
-- 4. FK CONSTRAINTS (setelah tabel dibuat)
-- ============================================================================

-- Add FK constraint ke profiles (setelah instansi_id ada dan таблице instansi dibuat)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_instansi;
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_instansi
    FOREIGN KEY (instansi_id) REFERENCES instansi(id) ON DELETE SET NULL;

-- Add FK constraint ke cars
ALTER TABLE cars DROP CONSTRAINT IF EXISTS fk_cars_instansi;
ALTER TABLE cars ADD CONSTRAINT fk_cars_instansi
    FOREIGN KEY (instansi_id) REFERENCES instansi(id) ON DELETE RESTRICT;

-- ============================================================================
-- 5. SAMPLE DATA - 3 INSTANSI
-- ============================================================================

-- Hapus data existing (opsional - hanya untuk development)
-- DELETE FROM disbursement_items;
-- DELETE FROM disbursements;
-- DELETE FROM payments;
-- DELETE FROM bookings;
-- DELETE FROM car_images;
-- DELETE FROM cars;
-- DELETE FROM profiles WHERE role IN ('admin', 'super_admin');
-- DELETE FROM instansi;

-- Insert 3 Sample Instansi
INSERT INTO instansi (id, nama_instansi, alamat, no_hp_pic, email_pic, status, komisi_platform_persen, rekening_bank)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Rental Berkah Motor', 'Jl. Sudirman No. 123, Jakarta Selatan', '081234567890', 'info@berkahmotor.co.id', 'aktif', 10.00, 'BCA-1234567890'),
    ('a2222222-2222-2222-2222-222222222222', 'Mobil Jaya Bersama', 'Jl. Braga No. 45, Bandung', '081234567891', 'admin@mobiljaya.co.id', 'aktif', 10.00, 'MANDIRI-0987654321'),
    ('a3333333-3333-3333-3333-333333333333', 'Sewa Mobil Sejahtera', 'Jl. Pemuda No. 78, Surabaya', '081234567892', 'cs@sejahteramobil.id', 'menunggu_verifikasi', 10.00, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. SAMPLE DATA - SUPER ADMIN
-- ============================================================================

-- Create auth user untuk Super Admin (jika belum ada)
-- Email: superadmin@kerentalkita.id
-- Password: SuperAdmin123! (harus diubah setelah pertama login)

DO $$
DECLARE
    super_admin_id UUID := '51111111-1111-1111-1111-111111111111';
    auth_user_id UUID;
BEGIN
    -- Check if auth user already exists
    SELECT id INTO auth_user_id FROM auth.users WHERE email = 'superadmin@kerentalkita.id';

    IF auth_user_id IS NULL THEN
        -- Insert auth user (dengan password hash placeholder)
        -- Note: Ini hanya contoh. Untuk production, gunakan Supabase Auth API
        INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at)
        VALUES (
            super_admin_id,
            'superadmin@kerentalkita.id',
            -- Password hash untuk 'SuperAdmin123!' (bcrypt)
            '$2a$10$rQXVRVXNVNVPVXNVNVNVNO7kMXRqVXNVNVNVNVNVNVNVNVNVNVNVNVNV',
            '{" nama": "Super Admin KerenTal Kita", "no_hp": "081234567899" }'::jsonb,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    ELSE
        super_admin_id := auth_user_id;
    END IF;

    -- Insert profile untuk Super Admin
    INSERT INTO profiles (id, nama, email, no_hp, role, aktif, created_at)
    VALUES (super_admin_id, 'Super Admin KerenTal Kita', 'superadmin@kerentalkita.id', '081234567899', 'super_admin', true, NOW())
    ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================================
-- 7. SAMPLE DATA - 3 ADMIN INSTANSI
-- ============================================================================

DO $$
DECLARE
    admin1_id UUID := 'b1111111-1111-1111-1111-111111111111';
    admin2_id UUID := 'b2222222-2222-2222-2222-222222222222';
    admin3_id UUID := 'b3333333-3333-3333-3333-333333333333';
BEGIN
    -- Admin untuk Instansi 1 (Rental Berkah Motor)
    INSERT INTO profiles (id, nama, email, no_hp, role, instansi_id, aktif, created_at)
    VALUES (admin1_id, 'Admin Berkah Motor', 'admin@berkahmotor.co.id', '081234567895', 'admin', 'a1111111-1111-1111-1111-111111111111', true, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Admin untuk Instansi 2 (Mobil Jaya Bersama)
    INSERT INTO profiles (id, nama, email, no_hp, role, instansi_id, aktif, created_at)
    VALUES (admin2_id, 'Admin Mobil Jaya', 'admin@mobiljaya.co.id', '081234567896', 'admin', 'a2222222-2222-2222-2222-222222222222', true, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Admin untuk Instansi 3 (Sewa Mobil Sejahtera)
    INSERT INTO profiles (id, nama, email, no_hp, role, instansi_id, aktif, created_at)
    VALUES (admin3_id, 'Admin Sejahtera', 'admin@sejahteramobil.id', '081234567897', 'admin', 'a3333333-3333-3333-3333-333333333333', true, NOW())
    ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================================
-- 8. SAMPLE DATA - SAMPLE CARS (UNTUK TESTING)
-- ============================================================================

-- Mobil untuk Instansi 1 (sudah disetujui)
INSERT INTO cars (id, nama, kategori, transmisi, tipe_sewa, harga_sopir_per_hari, kapasitas_kursi, harga_per_hari, status, deskripsi, instansi_id, status_approval, created_at)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Toyota Innova Reborn', 'mpv', 'matic', 'keduanya', 150000, 7, 650000, 'tersedia', 'MVP premium cocok untuk keluarga, AC dingin, audio system', 'a1111111-1111-1111-1111-111111111111', 'disetujui', NOW()),
    ('c1111111-1111-1111-1111-111111111112', 'Honda Civic RS', 'suv', 'matic', 'keduanya', 200000, 5, 850000, 'tersedia', 'SUV sporty dengan fitur lengkap', 'a1111111-1111-1111-1111-111111111111', 'disetujui', NOW()),
    ('c1111111-1111-1111-1111-111111111113', 'Toyota Agya', 'city_car', 'matic', 'lepas_kunci', NULL, 5, 250000, 'tersedia', 'City car hemat BBM, praktis untuk kota', 'a1111111-1111-1111-1111-111111111111', 'disetujui', NOW())
ON CONFLICT (id) DO NOTHING;

-- Mobil untuk Instansi 2 (sudah disetujui)
INSERT INTO cars (id, nama, kategori, transmisi, tipe_sewa, harga_sopir_per_hari, kapasitas_kursi, harga_per_hari, status, deskripsi, instansi_id, status_approval, created_at)
VALUES
    ('c2222222-2222-2222-2222-222222222221', 'Toyota Alphard', 'mpv', 'matic', 'dengan_sopir', 300000, 7, 1500000, 'tersedia', 'Premium MPV dengan kenyamanan maksimal', 'a2222222-2222-2222-2222-222222222222', 'disetujui', NOW()),
    ('c2222222-2222-2222-2222-222222222222', 'Daihatsu Sigra', 'city_car', 'manual', 'lepas_kunci', NULL, 7, 200000, 'tersedia', 'City car 7-seater, irit dan praktis', 'a2222222-2222-2222-2222-222222222222', 'disetujui', NOW())
ON CONFLICT (id) DO NOTHING;

-- Mobil untuk Instansi 3 (menunggu persetujuan)
INSERT INTO cars (id, nama, kategori, transmisi, tipe_sewa, harga_sopir_per_hari, kapasitas_kursi, harga_per_hari, status, deskripsi, instansi_id, status_approval, created_at)
VALUES
    ('c3333333-3333-3333-3333-333333333331', 'Toyota Fortuner', 'suv', 'matic', 'keduanya', 175000, 7, 750000, 'tersedia', 'SUV tangguh untuk segala medan', 'a3333333-3333-3333-3333-333333333333', 'menunggu_persetujuan', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. UPDATE CARS DEFAULT INSTANSI (jika ada mobil lama tanpa instansi)
-- ============================================================================

-- Update cars yang tidak punya instansi_id dengan default ke Instansi 1
UPDATE cars SET instansi_id = 'a1111111-1111-1111-1111-111111111111'
WHERE instansi_id IS NULL OR instansi_id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Cek apakah semua enum ada
SELECT typname, enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE typname IN ('role', 'kategori_mobil', 'status_booking', 'status_approval', 'status_instansi', 'metode_bayar', 'status_payment', 'status_disbursement');

-- Cek apakah semua tabel ada
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Cek sample data
SELECT 'Instansi' as type, COUNT(*) as count FROM instansi
UNION ALL
SELECT 'Profiles (admin)', COUNT(*) FROM profiles WHERE role IN ('admin', 'super_admin')
UNION ALL
SELECT 'Cars', COUNT(*) FROM cars;

-- ============================================================================
-- 11. CREDENTIALS UNTUK TESTING
-- ============================================================================
--
-- SUPER ADMIN:
--   Email: superadmin@kerentalkita.id
--   Password: (hubungi developer untuk reset password via Supabase Dashboard)
--
-- ADMIN INSTANSI 1 (Rental Berkah Motor):
--   Email: admin@berkahmotor.co.id
--   (Password perlu di-set via Supabase Dashboard -> Authentication)
--
-- ADMIN INSTANSI 2 (Mobil Jaya Bersama):
--   Email: admin@mobiljaya.co.id
--
-- ADMIN INSTANSI 3 (Sewa Mobil Sejahtera):
--   Email: admin@sejahteramobil.id
--
-- ============================================================================

-- ============================================================================
-- SELESAI
-- ============================================================================
-- Setelah script ini selesai:
-- 1. Jalankan `npx prisma generate` untuk regenerate Prisma client
-- 2. Test login dengan credentials di atas
-- 3. Verifikasi scopeToInstansi middleware berfungsi dengan benar
-- ============================================================================
