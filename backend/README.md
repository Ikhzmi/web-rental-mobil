# KerenTal Kita — Backend API

Express + TypeScript + Prisma, sesuai §8–§11 PRD v1.1.

## ⚠️ Status verifikasi — baca ini dulu

Kode ini awalnya ditulis di sandbox tanpa akses internet ke `supabase.com`
atau `binaries.prisma.sh`. **Update:** lewat koneksi Supabase MCP, project
Supabase sungguhan ("Rental-Mobil", project ref `zzbqekebpmdhvhcdmvrs`)
sudah di-provisioning langsung — skema §9, trigger, RLS, dan Storage
bucket semuanya **live dan terverifikasi** lewat `Supabase:list_tables`
dan `Supabase:get_advisors` (0 warning security tersisa). Yang masih
belum bisa diverifikasi dari sini:

| Yang **sudah** diverifikasi | Yang **belum/tidak bisa** diverifikasi di sini |
|---|---|
| `npm install` sukses, semua dependency ter-install | `npx prisma generate` — masih gagal fetch binary schema-engine di sandbox ini (403 dari `binaries.prisma.sh`) |
| `npx tsc --noEmit` — 0 error nyata | `npx prisma migrate dev` — belum perlu, skema sudah diterapkan langsung lewat `Supabase:apply_migration` (lihat `prisma/sql/`); migration Prisma lokal akan **out of sync** sampai kamu jalankan `npx prisma db pull` atau `prisma migrate resolve --applied` di environment sendiri |
| **Skema database live** — 6 tabel, enum, trigger, RLS, 2 storage bucket — semua terverifikasi lewat `Supabase:list_tables` & `get_advisors` | Request HTTP sungguhan lewat Express (backend belum pernah benar-benar dijalankan `npm run dev` dan dites end-to-end) |
| Logika bisnis (overlap-check, kalkulasi harga, alur status) sudah ditulis mengikuti §11 PRD persis | Alur signup sungguhan (belum ada user nyata yang daftar untuk mengetes trigger `on_auth_user_created`) |

**Kesimpulan:** database-nya sekarang nyata dan sudah benar secara struktur — tapi kode Express-nya sendiri (yang connect ke database ini) belum pernah benar-benar dijalankan dan dites dari sandbox ini.

Kredensial project ada di langkah 4 bagian Setup di bawah.

## Setup

### 1. ~~Buat project Supabase~~ ✅ Sudah dibuatkan
Project **"Rental-Mobil"** (`zzbqekebpmdhvhcdmvrs`) sudah ada dan skemanya
sudah live. Lewati langkah ini.

### 2. ~~Jalankan trigger SQL~~ ✅ Sudah dijalankan
`001_on_auth_user_created_trigger.sql` dan `002_rls_and_storage_setup.sql`
sudah diterapkan ke database live. Kedua file tetap ada di repo sebagai
catatan/untuk replikasi kalau perlu bikin project baru nanti.

### 3. ~~Buat bucket Storage~~ ✅ Sudah dibuat
`car-photos` (publik) dan `dokumen-penyewa` (privat) sudah ada, lengkap
dengan RLS policy.

### 4. Isi `.env`
```bash
cp .env.example .env
```
Lalu isi:
- `SUPABASE_URL` dan `SUPABASE_ANON_KEY` — **sudah ada**, lihat bagian
  "Kredensial project" di atas, tinggal copy-paste.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL` — **kamu isi
  sendiri** dari dashboard (lihat instruksi di atas), saya tidak punya
  akses untuk mengambilkan tiga ini.

### 5. Install & generate Prisma Client
```bash
npm install
npx prisma generate
```
Karena skema **sudah live** (dibuat lewat SQL langsung, bukan lewat
`prisma migrate`), Prisma di mesin kamu belum "tahu" soal ini. Setelah
`.env` terisi, jalankan:
```bash
npx prisma db pull        # introspeksi skema live, isi ulang schema.prisma
npx prisma migrate resolve --applied 0_init  # (opsional) tandai baseline migration
```
Atau lebih simpel: `schema.prisma` di repo ini **sudah** ditulis manual
match persis dengan skema live, jadi `npx prisma generate` saja cukup
untuk mulai development — cuma perlu `db pull`/`migrate resolve` kalau
suatu saat mau pakai `prisma migrate dev` untuk perubahan skema berikutnya.

### 6. Jalankan dev server
```bash
npm run dev
# API di http://localhost:3001, cek http://localhost:3001/health
```

## Kredensial project (isi ke `.env`)

```
SUPABASE_URL="https://zzbqekebpmdhvhcdmvrs.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YnFla2VicG1kaHZoY2RtdnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDk3NDgsImV4cCI6MjA5OTUyNTc0OH0.iQjhTLttM957iA2AyVceovFNJd3e9uvzpluwO0xoxiQ"
```

**Yang TIDAK bisa saya ambilkan** (dan memang seharusnya tidak lewat AI):
- `SUPABASE_SERVICE_ROLE_KEY` — ambil dari Dashboard → Project Settings → API → bagian "service_role secret". Ini kunci bypass-semua, jangan pernah taruh di kode frontend.
- `DATABASE_URL` / `DIRECT_URL` — ambil dari Dashboard → Project Settings → Database → "Connect" (tab **URI** untuk `DIRECT_URL`, tab **Transaction pooler** untuk `DATABASE_URL`). Butuh password database yang kamu set sendiri saat/​setelah project dibuat.

## Cara replikasi skema dari nol (kalau perlu)

Skema database sudah live, tapi kalau kamu perlu membuat ulang project dari nol, urutan file SQL-nya:
1. Skema tabel + enum — lihat riwayat migration lewat `Supabase:list_migrations` atau kontak saya lagi untuk generate ulang dari `schema.prisma`
2. `prisma/sql/001_on_auth_user_created_trigger.sql`
3. `prisma/sql/002_rls_and_storage_setup.sql`

## Struktur

```
src/
├── index.ts                    # entrypoint Express, pasang semua router
├── lib/
│   ├── prisma.ts                # singleton PrismaClient
│   └── supabaseAdmin.ts         # client service-role, khusus signed URL dokumen
├── middleware/
│   └── verifySupabaseToken.ts   # verifikasi Bearer token + requireAdmin
├── routes/
│   ├── cars.routes.ts           # publik: list, detail, availability
│   ├── bookings.routes.ts       # customer: create (transaksi), riwayat, cancel
│   ├── profiles.routes.ts       # customer: profil, upload referensi dokumen
│   ├── adminCars.routes.ts      # admin: CRUD mobil + galeri foto
│   ├── adminBookings.routes.ts  # admin: ubah status (+ audit log otomatis)
│   └── adminUsers.routes.ts     # admin: list user, signed URL dokumen
├── services/
│   ├── availability.service.ts  # §11.2 — overlap-check
│   └── pricing.service.ts       # §11.3 — satu-satunya sumber kebenaran harga
└── types/
    └── express.d.ts             # augmentasi req.user
```

## Riwayat perbaikan setelah draft awal

Saat menulis `adminUsers.routes.ts`, sempat ketahuan **F12 "Nonaktifkan
akun bermasalah"** butuh kolom `profiles.aktif` yang tidak ada di skema
§9 PRD manapun. Sudah ditambahkan: kolom `aktif Boolean @default(true)`
di `schema.prisma`, endpoint `PATCH /api/admin/users/:id/status` sudah
implementasi penuh (bukan stub 501 lagi), dan `verifySupabaseToken`
sekarang menolak request dari akun yang `aktif = false` — supaya
menonaktifkan akun benar-benar efektif, bukan cuma tercatat di database
tapi token lama tetap bisa dipakai.

## Keputusan implementasi yang perlu diketahui

- **Alur status booking** (`adminBookings.routes.ts`): saya ikuti teks
  §11.4 PRD persis — `dibatalkan` HANYA bisa dari `pending`, tidak dari
  `dikonfirmasi`. Kalau ternyata bisnisnya butuh cancel dari
  `dikonfirmasi` juga (mis. pembayaran gagal setelah diverifikasi), itu
  perubahan aturan bisnis yang perlu diputuskan eksplisit dulu.
- **Harga add-on non-sopir** (asuransi, antar_jemput) di `pricing.service.ts`
  saat ini masih menerima angka `harga` apa adanya dari request body,
  belum divalidasi terhadap tabel harga referensi resmi (PRD juga belum
  mendefinisikan itu). Ini celah kecil untuk manipulasi harga khusus
  add-on non-sopir — sopir sendiri sudah aman karena dihitung dari
  `car.hargaSopirPerHari` di database, bukan dari request.
- **Soft-delete mobil**: `DELETE /api/admin/cars/:id` tidak benar-benar
  menghapus baris, hanya mengubah `status` jadi `nonaktif` — supaya
  histori booking lama tetap punya referensi mobil yang valid.
