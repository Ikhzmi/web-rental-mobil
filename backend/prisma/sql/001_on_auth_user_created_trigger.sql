-- KerenTal Kita — trigger on_auth_user_created
-- Jalankan file ini di Supabase Dashboard -> SQL Editor (BUKAN lewat
-- `prisma migrate`, karena trigger ini menempel ke tabel `auth.users`
-- yang berada di luar kendali Prisma/schema public).
--
-- Fungsi: begitu ada baris baru masuk ke auth.users (user baru daftar
-- lewat supabase.auth.signUp()), otomatis buat baris pasangannya di
-- public.profiles dengan id yang SAMA PERSIS. Inilah mekanisme yang
-- menjaga profiles.id tetap konsisten dengan auth.users.id sebagai
-- soft reference (lihat §8 PRD — Prisma tidak bisa membuat hard FK
-- lintas schema public -> auth).
--
-- Data nama & no_hp diambil dari `raw_user_meta_data`, yaitu field
-- `options.data` yang dikirim frontend saat memanggil:
--   supabase.auth.signUp({
--     email, password,
--     options: { data: { nama: '...', no_hp: '...' } }
--   })

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, email, no_hp, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'no_hp', ''),
    'customer'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- Cegah fungsi ini dipanggil langsung lewat REST API
-- (/rest/v1/rpc/handle_new_auth_user) oleh siapa pun. Trigger tetap
-- jalan normal setelah ini -- REVOKE EXECUTE tidak menghalangi Postgres
-- memanggil fungsi trigger saat baris baru masuk ke auth.users, itu
-- mekanisme terpisah dari izin EXECUTE langsung oleh role.
-- (Ditemukan lewat Supabase:get_advisors setelah provisioning pertama —
-- tanpa baris ini, linter security Supabase menandainya WARN:
-- "anon/authenticated_security_definer_function_executable".)
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Catatan RLS (lihat §8 PRD — "Keputusan RLS"):
--
-- Tabel-tabel bisnis (profiles, cars, bookings, dst.) diakses lewat
-- Prisma yang connect langsung ke Postgres, sehingga RLS di-bypass.
-- Express + middleware verifySupabaseToken adalah satu-satunya
-- gatekeeper untuk tabel-tabel ini. Baris di bawah SENGAJA tidak
-- mengaktifkan RLS untuk `profiles` — jangan aktifkan RLS di sini
-- kecuali sudah menulis policy yang sesuai, karena mengaktifkan RLS
-- tanpa policy yang tepat akan memblokir SEMUA akses (termasuk dari
-- Prisma) alih-alih menyaringnya.
--
-- Jika suatu saat tim memutuskan untuk menambah RLS sebagai lapisan
-- pertahanan tambahan (defense-in-depth) di luar Express, tulis policy
-- di sini secara eksplisit dan update catatan §8 PRD juga.
-- ---------------------------------------------------------------------
