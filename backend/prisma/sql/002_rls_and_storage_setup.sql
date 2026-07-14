-- KerenTal Kita — RLS + Storage bucket setup
-- Jalankan di Supabase Dashboard -> SQL Editor, SETELAH schema.prisma
-- di-migrate (tabel-tabel sudah ada) dan SETELAH 001_on_auth_user_created_trigger.sql.
--
-- Ini adalah catatan tertulis dari konfigurasi yang sudah diterapkan
-- langsung ke project Supabase lewat MCP tools saat provisioning
-- pertama kali (13 Juli 2026). File ini memastikan repo tetap jadi
-- sumber kebenaran yang akurat kalau project perlu dibuat ulang dari
-- nol di kemudian hari.

-- ---------------------------------------------------------------------
-- 1. Aktifkan RLS TANPA policy di semua tabel bisnis.
--
-- PENTING — ini BUKAN "RLS tidak diandalkan" seperti draft awal §8 PRD
-- (v1.1) menyebutnya. Setelah provisioning nyata, ketahuan ada nuansa
-- yang terlewat: Supabase punya DUA jalur akses ke tabel yang sama —
--   1) PostgREST (REST API otomatis) — dipakai kalau ada yang query
--      lewat supabase-js `.from('cars').select()` pakai anon key. RLS
--      OFF di jalur ini = anon key (publik, ada di bundle JS frontend)
--      bisa baca/tulis tabel LANGSUNG, melewati Express sepenuhnya.
--   2) Prisma (koneksi Postgres langsung via DATABASE_URL) — dipakai
--      Express. SELALU bypass RLS baik ON maupun OFF, karena connect
--      sebagai role database biasa, bukan lewat PostgREST.
--
-- Jadi RLS ON tanpa policy = "mengunci pintu depan" (PostgREST/anon key)
-- sementara "pintu belakang" (Prisma) tetap jalan seperti didesain.
-- Express + verifySupabaseToken tetap satu-satunya gatekeeper efektif,
-- tapi sekarang PostgREST tidak lagi jadi celah tak sengaja.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.car_images enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_addons enable row level security;
alter table public.booking_status_log enable row level security;

-- ---------------------------------------------------------------------
-- 2. Storage buckets
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('car-photos', 'car-photos', true),
  ('dokumen-penyewa', 'dokumen-penyewa', false)
on conflict (id) do nothing;

-- car-photos: publik. TIDAK perlu policy SELECT — bucket publik sudah
-- otomatis bisa diakses lewat public URL
-- (/storage/v1/object/public/car-photos/...) tanpa RLS sama sekali.
-- (Sempat ditambahkan lalu DIHAPUS lagi setelah Supabase:get_advisors
-- menandai WARN "public_bucket_allows_listing" — policy SELECT di
-- bucket publik cuma menambah kemampuan me-list seluruh isi bucket,
-- bukan dibutuhkan untuk akses baca normal.)
create policy "car-photos authenticated write"
  on storage.objects for insert
  with check (bucket_id = 'car-photos' and auth.role() = 'authenticated');

create policy "car-photos authenticated update"
  on storage.objects for update
  using (bucket_id = 'car-photos' and auth.role() = 'authenticated');

create policy "car-photos authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'car-photos' and auth.role() = 'authenticated');

-- dokumen-penyewa: PRIVAT. Pemilik file (folder path diawali user_id-nya
-- sendiri, mis. `<user_id>/ktp.jpg`) boleh upload/baca miliknya sendiri.
-- Admin melihat lewat signed URL yang dibuat backend pakai service-role
-- key (bypass RLS ini sepenuhnya), bukan lewat policy di bawah.
create policy "dokumen-penyewa owner read"
  on storage.objects for select
  using (bucket_id = 'dokumen-penyewa' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "dokumen-penyewa owner upload"
  on storage.objects for insert
  with check (bucket_id = 'dokumen-penyewa' and auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------
-- 3. Index yang kelewat di migration awal
-- ---------------------------------------------------------------------
create index if not exists booking_status_log_diubah_oleh_idx
  on public.booking_status_log(diubah_oleh);
