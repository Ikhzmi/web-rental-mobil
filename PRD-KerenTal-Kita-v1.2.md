# PRD — KerenTal Kita (Platform Sewa Mobil Online)

**Versi:** 1.2
**Status:** Draft untuk pengembangan
**Tipe proyek:** Full-stack web app (Frontend + Backend + Database)

> **Riwayat Revisi**
> - **v1.2** (13 Juli 2026): Project Supabase sungguhan ("Rental-Mobil") sudah di-provisioning — skema §9, trigger `on_auth_user_created`, dan dua bucket Storage sudah live. Memperhalus teks Keputusan RLS di §8: RLS ternyata perlu **diaktifkan** (bukan dimatikan) tanpa policy, untuk menutup jalur akses PostgREST/anon-key yang terlewat di analisis v1.1 — Prisma tetap bypass RLS seperti semula, jadi arsitektur intinya tidak berubah, cuma pemahamannya lebih presisi. Ditemukan & ditutup lewat `Supabase:get_advisors`: fungsi trigger sempat bisa dipanggil langsung lewat REST API (`SECURITY DEFINER` tanpa `REVOKE EXECUTE`), dan policy SELECT di bucket publik `car-photos` sempat membuka kemampuan me-list seluruh isi bucket. Lihat `kerental-backend/prisma/sql/002_rls_and_storage_setup.sql`.
> - **v1.1** (12 Juli 2026): Menyinkronkan §12 Desain & Branding dengan implementasi frontend yang sudah berjalan (Playfair Display + Inter, aksen oranye `#e8702a` — menggantikan Oswald + biru/merah di draft awal). Menambahkan catatan teknis Prisma × Supabase `auth.users` (§8, §9), keputusan eksplisit soal RLS (§8), koreksi nama package Lenis (§8), field `lokasi_kembali` & `updated_at` yang sebelumnya hilang di skema `bookings` (§9), endpoint upload foto armada yang sebelumnya hilang (§10), catatan risiko jadwal di Minggu 4 (§13), dan §12.1/§1 diperbarui menyusul migrasi animasi hero sepenuhnya ke `useGSAP()`.
> - **v1.0**: Draft awal.

---

## 1. Ringkasan Eksekutif

KerenTal Kita adalah platform sewa mobil berbasis web yang memungkinkan pelanggan mencari, membandingkan, dan memesan mobil secara online dengan kalkulasi harga otomatis dan pengecekan ketersediaan real-time. Platform ini terdiri dari tiga sisi:

1. **Publik** — katalog mobil dan informasi layanan, dapat diakses tanpa login.
2. **Customer** — alur pemesanan (booking), riwayat sewa, dan manajemen profil, memerlukan akun.
3. **Admin** — pengelolaan armada, pesanan, dan pengguna melalui dashboard internal.

---

## 2. Latar Belakang & Tujuan

Proses sewa mobil konvensional (telepon/WhatsApp manual) rentan terhadap kesalahan jadwal (double booking), tidak ada transparansi harga di muka, dan sulit dilacak statusnya. Tujuan produk ini:

- Menyediakan alur pemesanan mandiri (self-service) dari pencarian mobil hingga konfirmasi.
- Mencegah tabrakan jadwal (double booking) melalui pengecekan ketersediaan otomatis di backend.
- Memberi kejelasan harga di muka, termasuk biaya tambahan (add-on).
- Memberi admin satu dashboard terpusat untuk mengelola armada dan pesanan, menggantikan pencatatan manual.

---

## 3. Target Pengguna & Persona

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Rani, Penyewa Individu** | Karyawan swasta, menyewa mobil untuk perjalanan keluarga akhir pekan | Cari mobil sesuai budget & kapasitas, lihat harga total di muka, proses booking cepat |
| **Doni, Penyewa Korporat** | Mengurus transportasi untuk keperluan kantor, menyewa rutin | Riwayat sewa rapi, invoice jelas, opsi sopir |
| **Admin/Pemilik Rental** | Mengelola armada, memverifikasi pesanan, memantau pendapatan | Dashboard ringkas, CRUD mobil mudah, kontrol status pesanan |

---

## 4. Ruang Lingkup

### 4.1 Dalam Lingkup (In-Scope — v1)
- Halaman publik: Beranda, Armada, Detail Mobil, Tentang, Kontak, FAQ
- Registrasi & login customer (email + password)
- Alur booking lengkap: pilih tanggal → cek ketersediaan → kalkulasi harga → checkout → konfirmasi
- Riwayat pesanan & profil customer
- Dashboard admin: kelola armada (CRUD), kelola pesanan (ubah status), kelola user
- Upload & tampilkan galeri foto mobil
- Kalkulasi harga otomatis (harga/hari × durasi + add-on)
- Dukungan tipe sewa per unit mobil: **lepas kunci** (self-drive), **wajib dengan sopir** (kunci tidak dilepas), atau **keduanya** — alur booking & harga menyesuaikan otomatis (lihat §6.2 F6 dan §11.3)

### 4.2 Di Luar Lingkup (Out-of-Scope untuk v1 — kandidat fase berikutnya)
- Payment gateway sungguhan (v1 cukup status "menunggu pembayaran" manual/transfer, verifikasi manual oleh admin)
- Notifikasi email/WhatsApp otomatis
- Multi-cabang/multi-kota
- Aplikasi mobile native
- Review & rating mobil
- Live chat/CS

---

## 5. Peta Halaman (Sitemap)

```
Publik
├── / (Beranda)
├── /armada (Katalog mobil + filter)
├── /armada/:id (Detail mobil)
├── /tentang
├── /kontak
├── /faq
├── /login
└── /daftar

Customer (butuh login, role: customer)
├── /booking/:carId (Form pemesanan)
├── /booking/:id/konfirmasi
├── /akun/pesanan (Riwayat)
├── /akun/pesanan/:id (Detail pesanan)
└── /akun/profil

Admin (butuh login, role: admin)
├── /admin (Dashboard ringkasan)
├── /admin/armada (List + CRUD mobil)
├── /admin/armada/:id/edit
├── /admin/pesanan (List + filter status)
├── /admin/pesanan/:id (Detail + ubah status)
└── /admin/pengguna (List user)
```

---

## 6. Fitur Detail per Modul

### 6.1 Modul Publik

**F1 — Beranda**
- Hero interaktif (sudah dibangun): reveal x-ray mobil mengikuti kursor, diorkestrasi dalam **satu `gsap.timeline()`** lewat hook `useGSAP()` dari `@gsap/react` — mencakup zoom latar (Ken Burns), reveal judul, dan fade-in copy/CTA sebagai satu urutan tunggal, bukan lagi campuran CSS keyframes + GSAP terpisah seperti di draft awal. Timeline ini dibungkus `gsap.matchMedia()` sehingga otomatis melompat ke keadaan akhir tanpa animasi bila pengguna mengaktifkan `prefers-reduced-motion` di OS-nya.
- Section unggulan: 3–4 mobil populer, kategori (city car, SUV, MPV, mobil mewah), muncul dengan scroll-reveal `ScrollTrigger` + stagger.
  > **Catatan implementasi:** prototipe fleet-configurator yang sudah dibangun (arc-menu setir untuk pilih mobil + grid "tampilkan semua") saat ini menempel di homepage. Karena interaksinya cukup kaya dan sudah mendekati fungsi F2 (Katalog penuh), ini perlu diputuskan eksplisit saat routing dibangun (lihat roadmap Minggu 2–3): apakah komponen ini dipindah ke `/armada` dan homepage cukup memakai teaser statis 3–4 mobil, atau tetap tinggal di homepage sebagai showcase dan `/armada` dibangun terpisah dengan grid+filter konvensional.
- Testimoni pelanggan (statis/dummy untuk v1).
- CTA ke halaman Armada.

**F2 — Katalog Armada**
- Grid daftar mobil dengan foto, nama, kategori, harga/hari, badge status ("Tersedia"/"Disewa").
- Filter: kategori, rentang harga, transmisi (manual/matic), kapasitas kursi, tipe sewa (lepas kunci / dengan sopir).
- Sorting: harga termurah/termahal, terpopuler.
- Pencarian nama mobil.
- Acceptance criteria: filter dapat dikombinasikan; hasil ter-update tanpa reload penuh.

**F3 — Detail Mobil**
- Galeri foto (multi-gambar).
- Spesifikasi: transmisi, kapasitas kursi, tahun, bahan bakar, fitur (AC, GPS, dll).
- Badge tipe sewa ditampilkan jelas di bagian atas halaman: **"Bisa Lepas Kunci"**, **"Wajib dengan Sopir"**, atau **"Lepas Kunci / Dengan Sopir"** bila unit menawarkan keduanya — supaya calon penyewa tahu sejak awal, bukan baru terkejut di tahap akhir booking.
- Kalender ketersediaan — tanggal yang sudah dibooking ditandai tidak bisa dipilih.
- Harga per hari, tombol "Sewa Sekarang" → mengarah ke alur booking (redirect ke login dulu jika belum login).

**F4 — Tentang, Kontak, FAQ**
- Konten statis/CMS sederhana (v1 bisa hardcode).

**F5 — Registrasi & Login**
- Ditangani **Supabase Auth** (email + password), dipanggil langsung dari frontend via `supabase-js` — bukan endpoint custom di Express.
- Form daftar: nama, email, no. HP, password (field tambahan seperti nama & no. HP dikirim sebagai `user_metadata` lalu disalin ke tabel `profiles` oleh trigger).
- Validasi: email unik (ditangani otomatis oleh Supabase Auth), password minimal 8 karakter.
- Session token (JWT) disimpan otomatis oleh `supabase-js` di browser; token inilah yang dikirim ke Express sebagai Bearer token untuk endpoint yang butuh login.

### 6.2 Modul Customer

**F6 — Alur Booking**
1. Pilih tanggal ambil & kembali dari kalender ketersediaan.
2. Pilih lokasi ambil/kembali (opsional, bisa 1 lokasi default untuk v1).
3. Pilih add-on — perilaku sopir mengikuti `tipe_sewa` mobil:
   - `lepas_kunci` → sopir **tidak ditawarkan** sama sekali (unit memang hanya disewakan self-drive).
   - `dengan_sopir` → sopir **wajib**, otomatis tercentang dan tidak bisa dihilangkan; biayanya sudah masuk rincian harga sejak awal, bukan sebagai pilihan.
   - `keduanya` → sopir bersifat **opsional**, penyewa bebas memilih dengan/tanpa sopir.
   - Add-on lain (asuransi tambahan, antar-jemput) tetap opsional untuk semua tipe.
4. Sistem menampilkan rincian harga otomatis (lihat §11.3).
5. Isi/periksa data penyewa (nama, no. HP, no. KTP, no. SIM).
6. Konfirmasi → status pesanan awal: `pending`.
7. Halaman konfirmasi menampilkan ringkasan & instruksi pembayaran (transfer manual untuk v1).

**F7 — Riwayat Pesanan**
- List pesanan dengan status (pending, dikonfirmasi, berjalan, selesai, dibatalkan).
- Detail pesanan: rincian mobil, tanggal, total harga, invoice sederhana (dapat dicetak/PDF di fase berikutnya).
- Aksi: batalkan pesanan (hanya bila status masih `pending`).

**F8 — Profil**
- Edit data diri (ganti password dilakukan lewat alur reset password bawaan Supabase Auth, bukan form manual).
- Upload dokumen KTP/SIM langsung dari browser ke bucket privat Supabase Storage `dokumen-penyewa`; path hasil upload disimpan ke `profiles.dokumen_ktp_url` / `dokumen_sim_url` lewat `POST /api/profiles/me/dokumen`.
- Dokumen hanya bisa dilihat kembali oleh pemilik akun atau admin (lewat signed URL), tidak publik.

### 6.3 Modul Admin

**F9 — Dashboard**
- Ringkasan: total pendapatan (bulan berjalan), jumlah pesanan aktif, tingkat okupansi armada, mobil terlaris.

**F10 — Kelola Armada**
- List semua mobil + status.
- Tambah/edit/hapus mobil: nama, kategori, harga/hari, spesifikasi, upload foto (langsung ke bucket publik Supabase Storage `car-photos`, referensinya disimpan ke tabel `car_images` lewat endpoint terpisah — lihat §10), status (tersedia/maintenance/nonaktif), **tipe sewa** (lepas kunci / wajib dengan sopir / keduanya) beserta harga sopir per hari jika relevan.
- Set jadwal maintenance (blok tanggal tertentu agar tidak bisa dibooking).

**F11 — Kelola Pesanan**
- List semua pesanan + filter status & tanggal.
- Ubah status pesanan: `pending → dikonfirmasi → berjalan → selesai` atau `→ dibatalkan`.
- Verifikasi dokumen & bukti transfer pelanggan.
- Lihat riwayat perubahan status (audit sederhana).

**F12 — Kelola Pengguna**
- List customer + admin.
- Nonaktifkan akun bermasalah.

---

## 7. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Performa** | Halaman katalog & detail termuat < 2 detik pada koneksi standar; gambar dioptimasi (WebP, lazy-load) |
| **Keamanan** | Autentikasi & hashing password ditangani Supabase Auth (bukan diimplementasi manual); validasi input tetap dilakukan di backend Express (bukan hanya frontend); proteksi endpoint admin via role-check; rate limiting pada login; lihat juga keputusan RLS di §8 |
| **Responsif** | Mobile-first; semua halaman customer harus dapat dipakai penuh di layar ≥360px |
| **Aksesibilitas** | Kontras teks memadai, label form jelas, navigasi dapat diakses keyboard; seluruh animasi GSAP menghormati `prefers-reduced-motion` lewat `gsap.matchMedia()` (dikurangi/dimatikan otomatis bila pengguna mengaktifkan setting tersebut di OS-nya) |
| **Lokalisasi** | Bahasa Indonesia, mata uang Rupiah (Rp, format ribuan titik), format tanggal DD/MM/YYYY |
| **Kompatibilitas** | Chrome, Firefox, Edge, Safari versi 2 tahun terakhir |

---

## 8. Arsitektur Teknis

**Frontend**
- React 18 + TypeScript + Vite + Tailwind CSS
- React Router (routing multi-halaman)
- TanStack Query (fetching & caching data server)
- react-hook-form + zod (form & validasi)
- react-day-picker (kalender ketersediaan)
- lucide-react (ikon)
- `@supabase/supabase-js` (client untuk Auth & Storage, pakai **anon key**)
- **GSAP** — animasi inti. Sejak 30 April 2025, seluruh plugin GSAP (`ScrollTrigger`, `SplitText`, `MorphSVG`, `DrawSVG`, `ScrollSmoother`, dll) **100% gratis termasuk untuk pemakaian komersial** — Webflow (pemilik GreenSock/GSAP sejak Oktober 2024) menghapus seluruh batasan lisensi Club GreenSock yang dulu berbayar. *(sumber: gsap.com/pricing)*
- `@gsap/react` — package resmi GSAP untuk React, dipakai lewat hook `useGSAP()` di seluruh komponen beranimasi (Hero, FleetConfigurator, FeaturesSection, FleetGrid) untuk auto-cleanup saat unmount — menggantikan pola manual `useEffect` + `gsap.context().revert()` yang dipakai di draft awal.
- **Lenis** — smooth-scroll library, sering dipasangkan dengan GSAP `ScrollTrigger` supaya scroll terasa "kental"/halus, bukan native scroll biasa. Awalnya dirilis oleh studio bernama Studio Freight, yang sejak itu sudah rebrand menjadi **Darkroom Engineering**. **Penting untuk instalasi:** pakai package **`lenis`** (bukan `@studio-freight/lenis`, yang sudah di-deprecate oleh maintainer-nya sendiri) — untuk wrapper React, import dari `lenis/react`, bukan `@studio-freight/react-lenis` yang juga sudah tidak dipelihara lagi.

> **Rekomendasi:** cukup pakai GSAP sebagai satu-satunya animation engine di seluruh frontend (hero, transisi halaman, reveal saat scroll, micro-interaction tombol/kartu). Menghindari mencampur GSAP dengan Framer Motion/react-spring di proyek yang sama — dua animation engine berjalan bersamaan gampang bentrok soal timing dan lebih berat di performa, tanpa manfaat tambahan yang berarti untuk skala proyek ini.

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM → koneksi ke Postgres milik Supabase, dipakai untuk tabel bisnis (`profiles`, `cars`, `bookings`, dst.)
  > **Catatan teknis penting:** Prisma **tidak mendukung foreign key constraint lintas schema Postgres** (`public` → `auth`) — ini limitasi resmi yang sudah dikonfirmasi di tracker Prisma, bahkan dengan preview feature `multiSchema` diaktifkan. Karena itu, relasi `profiles.id → auth.users.id` **jangan** dideklarasikan sebagai hard FK constraint saat `prisma migrate`. Cukup andalkan trigger `on_auth_user_created` untuk menjamin kedua id selalu sama persis — perlakukan sebagai **soft reference**, divalidasi di level trigger/aplikasi, bukan di level constraint database. Lihat juga §9.
- Middleware `verifySupabaseToken`: memverifikasi `access_token` Supabase yang dikirim frontend lewat header `Authorization: Bearer <token>`, lalu mengambil `role` dari tabel `profiles` untuk role-check endpoint admin
- `@supabase/supabase-js` (dipakai backend dengan **service-role key**, khusus untuk operasi admin ke Storage yang butuh hak akses penuh — key ini **tidak boleh** dipakai/diekspos di frontend)
- **Keputusan RLS (Row Level Security):** RLS **diaktifkan** di semua tabel yang dikelola Prisma (`profiles`, `cars`, `bookings`, `car_images`, `booking_addons`, `booking_status_log`), tapi **sengaja tanpa policy apa pun**. Ini bukan kontradiksi — Supabase punya dua jalur akses berbeda ke tabel yang sama: (1) **PostgREST**, REST API otomatis yang dipakai kalau ada yang query lewat `supabase-js .from('cars').select()` pakai anon key — RLS di jalur ini WAJIB aktif, karena anon key bersifat publik (ada di bundle JS frontend), dan RLS OFF berarti siapa pun bisa baca/tulis tabel ini langsung, melewati Express sepenuhnya; (2) **Prisma**, koneksi Postgres langsung lewat `DATABASE_URL` yang dipakai Express — jalur ini **selalu bypass RLS**, baik RLS ON maupun OFF, karena connect sebagai role database biasa, bukan lewat PostgREST. Jadi "RLS ON tanpa policy" = mengunci pintu PostgREST sepenuhnya (default-deny), sementara Prisma/Express tetap berfungsi seperti didesain sebagai satu-satunya gatekeeper efektif. Verifikasi: `Supabase:get_advisors` (security) menunjukkan status `rls_enabled_no_policy` (level INFO) di keenam tabel — ini status yang **diharapkan**, bukan celah.

### 8.1 Peran Supabase secara Spesifik

| Layanan Supabase | Dipakai untuk | Catatan |
|---|---|---|
| **Auth** | Registrasi/login email+password, terbitkan JWT session | Frontend panggil `supabase.auth.signUp()` / `signInWithPassword()` langsung — **tidak** lewat Express. Data akun inti (email, password terenkripsi) tersimpan di skema internal `auth.users` milik Supabase, di luar kendali Prisma |
| **Database (Postgres)** | Semua tabel bisnis: `profiles`, `cars`, `car_images`, `bookings`, `booking_addons`, `booking_status_log` | Diakses lewat Prisma, tanpa hard FK ke `auth.users` (lihat catatan teknis di §8). Butuh **dua** connection string: `DATABASE_URL` (lewat connection pooler/PgBouncer, port 6543, dipakai runtime app) dan `DIRECT_URL` (koneksi langsung, port 5432, khusus untuk `prisma migrate`) |
| **Storage** | Bucket `car-photos` (publik, foto armada) dan bucket `dokumen-penyewa` (privat, KTP/SIM) | Upload foto mobil dari dashboard admin langsung ke bucket publik; upload dokumen KTP/SIM dari customer ke bucket privat, hanya bisa diakses lewat signed URL yang dibuat backend untuk admin |
| **Trigger `on_auth_user_created`** | Auto-membuat baris `profiles` begitu ada user baru di `auth.users` | Menghindari kondisi "user ada di Auth tapi belum punya profil"; juga menjadi mekanisme utama yang menjaga `profiles.id` tetap sama dengan `auth.users.id` sebagai soft reference (lihat §8) — dibuat sebagai Postgres function + trigger di project Supabase, bukan di kode Express |

**Diagram alur data (ringkas):**
```
[React SPA] --supabase-js (anon key)--> [Supabase Auth]  (signup/login → JWT)
[React SPA] --supabase-js (anon key)--> [Supabase Storage] (upload foto/dokumen)
[React SPA] --REST/JSON + Bearer JWT--> [Express API] --Prisma--> [Supabase Postgres]
                                              |
                                              └--(service-role key)--> [Supabase Storage] (signed URL utk admin)
```

---

## 9. Skema Data (ERD Ringkas)

**profiles** *(memperluas `auth.users` bawaan Supabase — 1:1, `id` sama persis dengan `auth.users.id`, dijamin lewat trigger sebagai soft reference — lihat §8)*
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK, soft-reference ke `auth.users.id`) | dibuat otomatis + disamakan lewat trigger `on_auth_user_created`; **bukan** hard FK constraint (Prisma tidak mendukung FK lintas schema — lihat §8) |
| nama | string | |
| email | string | disalin dari `auth.users.email` saat akun dibuat, agar bisa di-query tanpa join lintas skema |
| no_hp | string | |
| role | enum(`customer`,`admin`) | default `customer` |
| no_ktp | string, nullable | |
| no_sim | string, nullable | |
| dokumen_ktp_url | string, nullable | path/objek di bucket privat `dokumen-penyewa` |
| dokumen_sim_url | string, nullable | path/objek di bucket privat `dokumen-penyewa` |
| dokumen_verified | boolean, default false | |
| created_at | datetime | |

**cars**
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| nama | string | |
| kategori | enum(`city_car`,`suv`,`mpv`,`mewah`) | |
| transmisi | enum(`manual`,`matic`) | |
| tipe_sewa | enum(`lepas_kunci`,`dengan_sopir`,`keduanya`) | menentukan apakah unit bisa disewa lepas kunci (self-drive), wajib dengan sopir, atau menawarkan keduanya |
| harga_sopir_per_hari | decimal, nullable | wajib diisi bila `tipe_sewa` mengandung opsi sopir; dipakai backend untuk memaksa biaya sopir masuk ke total bila `dengan_sopir` |
| kapasitas_kursi | int | |
| harga_per_hari | decimal | |
| status | enum(`tersedia`,`maintenance`,`nonaktif`) | |
| deskripsi | text | |
| created_at | datetime | |

**car_images**
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| car_id | UUID (FK → cars) | |
| url | string | public URL dari bucket Supabase Storage `car-photos` |
| urutan | int | untuk urutan galeri |

**bookings**
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → profiles) | |
| car_id | UUID (FK → cars) | |
| tanggal_mulai | date | |
| tanggal_selesai | date | |
| lokasi_ambil | string | |
| lokasi_kembali | string | ditambahkan di v1.1 — sebelumnya hilang dari skema padahal F6 langkah 2 sudah menjanjikan pilihan lokasi kembali; default sama dengan `lokasi_ambil` bila tidak diisi terpisah |
| harga_dasar | decimal | snapshot harga saat booking dibuat |
| total_addon | decimal | |
| total_harga | decimal | |
| status | enum(`pending`,`dikonfirmasi`,`berjalan`,`selesai`,`dibatalkan`) | |
| created_at | datetime | |
| updated_at | datetime | ditambahkan di v1.1 — diperbarui tiap kali status berubah, mempercepat query tanpa perlu join ke `booking_status_log` untuk kebutuhan sederhana (sort by last update, dsb.) |

**booking_addons**
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| booking_id | UUID (FK → bookings) | |
| jenis | enum(`sopir`,`asuransi`,`antar_jemput`) | |
| harga | decimal | |

**booking_status_log** *(audit trail perubahan status)*
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | |
| booking_id | UUID (FK → bookings) | |
| status_lama | string | |
| status_baru | string | |
| diubah_oleh | UUID (FK → profiles) | |
| created_at | datetime | |

**Relasi kunci:** satu `profiles` punya banyak `bookings`; satu `car` punya banyak `car_images` dan banyak `bookings`; satu `booking` punya banyak `booking_addons`.

---

## 10. Spesifikasi API (REST Endpoints)

> **Autentikasi tidak lewat Express.** Registrasi & login dipanggil langsung dari frontend ke Supabase Auth (`supabase.auth.signUp()` / `signInWithPassword()`). Baris `profiles` dibuat otomatis lewat trigger database. Semua endpoint di bawah yang bertanda **Customer**/**Admin** mewajibkan header `Authorization: Bearer <supabase_access_token>`; Express memverifikasinya lewat middleware sebelum memproses request.

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/cars` | Publik | List mobil + query filter (kategori, harga, transmisi) |
| GET | `/api/cars/:id` | Publik | Detail mobil + galeri |
| GET | `/api/cars/:id/availability` | Publik | Tanggal yang sudah terbooking |
| POST | `/api/bookings` | Customer | Buat pesanan baru |
| GET | `/api/bookings/mine` | Customer | Riwayat pesanan milik user login |
| GET | `/api/bookings/:id` | Customer/Admin | Detail satu pesanan |
| PATCH | `/api/bookings/:id/cancel` | Customer | Batalkan pesanan (hanya jika `pending`) |
| GET | `/api/profiles/me` | Customer | Data profil sendiri |
| PATCH | `/api/profiles/me` | Customer | Update profil |
| POST | `/api/profiles/me/dokumen` | Customer | Simpan referensi path dokumen KTP/SIM setelah diunggah ke Supabase Storage |
| GET | `/api/admin/cars` | Admin | List semua mobil (termasuk nonaktif) |
| GET | `/api/admin/cars/:id` | Admin | *(baru di v1.1)* Detail satu mobil untuk form edit, termasuk yang berstatus nonaktif/maintenance — sebelumnya form edit admin harus mem-filter dari response list, tidak efisien untuk armada besar |
| POST | `/api/admin/cars` | Admin | Tambah mobil |
| PATCH | `/api/admin/cars/:id` | Admin | Edit mobil |
| DELETE | `/api/admin/cars/:id` | Admin | Hapus/nonaktifkan mobil |
| POST | `/api/admin/cars/:id/images` | Admin | *(baru di v1.1)* Simpan referensi URL foto ke tabel `car_images` setelah upload selesai ke bucket `car-photos` — sebelumnya F10 menyebut upload foto tapi tidak ada endpoint analog dengan `POST /api/profiles/me/dokumen` untuk menyimpan hasilnya |
| DELETE | `/api/admin/cars/:id/images/:imageId` | Admin | *(baru di v1.1)* Hapus satu foto dari galeri mobil |
| GET | `/api/admin/bookings` | Admin | List semua pesanan + filter |
| PATCH | `/api/admin/bookings/:id/status` | Admin | Ubah status pesanan (implementasi wajib juga menulis baris baru ke `booking_status_log`) |
| GET | `/api/admin/users` | Admin | List semua profil user |
| PATCH | `/api/admin/users/:id/status` | Admin | Aktif/nonaktifkan user |
| GET | `/api/admin/dokumen/:userId/signed-url` | Admin | Buat signed URL sementara untuk melihat dokumen KTP/SIM di bucket privat |

---

## 11. Alur Bisnis Kunci

### 11.1 Alur Booking End-to-End
1. Customer membuka Detail Mobil → melihat kalender ketersediaan (hasil dari `GET /cars/:id/availability`).
2. Customer memilih rentang tanggal yang **tidak** beririsan dengan tanggal terbooking.
3. Frontend menghitung estimasi harga (untuk ditampilkan), tapi **harga final selalu dihitung ulang di backend** saat submit — mencegah manipulasi harga dari sisi klien.
4. `POST /api/bookings` → backend melakukan pengecekan ulang ketersediaan (lihat §11.2) sebelum menyimpan, untuk menghindari race condition dua booking bersamaan.
5. Jika tersedia: booking dibuat dengan status `pending`, snapshot harga disimpan.
6. Customer melihat halaman konfirmasi + instruksi transfer manual.
7. Admin memverifikasi bukti transfer → ubah status ke `dikonfirmasi`.
8. Saat tanggal mulai tiba, admin ubah status ke `berjalan`; setelah mobil kembali, ke `selesai`.

### 11.2 Logika Pengecekan Ketersediaan (Overlap Check)
Dua rentang tanggal dianggap **bentrok** jika:
```
booking_baru.tanggal_mulai < booking_lain.tanggal_selesai
DAN
booking_baru.tanggal_selesai > booking_lain.tanggal_mulai
```
Hanya booking dengan status `pending`, `dikonfirmasi`, atau `berjalan` yang dihitung sebagai penghalang (booking yang `dibatalkan` diabaikan). Query ini **wajib** dilakukan di dalam transaksi database saat pembuatan booking baru untuk mencegah dua pelanggan mendapat slot yang sama secara bersamaan.

### 11.3 Kalkulasi Harga Otomatis
```
durasi_hari      = tanggal_selesai - tanggal_mulai
harga_dasar      = harga_per_hari_mobil × durasi_hari
total_addon      = jumlah semua harga add-on yang dipilih
total_harga      = harga_dasar + total_addon
```
Contoh: mobil Rp300.000/hari, disewa 3 hari, + sopir Rp150.000/hari (3 hari = Rp450.000):
```
harga_dasar = 300.000 × 3 = 900.000
total_addon = 450.000
total_harga = 1.350.000
```
**Aturan tambahan (bisnis):**
- Mobil dengan `tipe_sewa = dengan_sopir`: biaya sopir (`harga_sopir_per_hari × durasi_hari`) **dipaksa masuk** ke `total_addon` oleh backend saat booking dibuat — bukan sekadar default checkbox di frontend — sehingga tidak bisa dihilangkan meski request dari klien mencoba melewatinya.
- Denda keterlambatan pengembalian: dihitung terpisah saat mobil dikembalikan (di luar v1, dicatat manual oleh admin untuk sekarang).
- Minimal usia penyewa & wajib unggah KTP/SIM sebelum booking pertama disetujui.

### 11.4 Lifecycle Status Pesanan
```
pending → dikonfirmasi → berjalan → selesai
   └──────────────→ dibatalkan
```
- `pending`: menunggu verifikasi pembayaran oleh admin.
- `dikonfirmasi`: pembayaran terverifikasi, menunggu tanggal mulai.
- `berjalan`: mobil sedang di tangan penyewa.
- `selesai`: mobil sudah dikembalikan.
- `dibatalkan`: dapat terjadi dari status `pending` (oleh customer atau admin).

---

## 12. Desain & Branding

- Identitas visual mengikuti hero & fleet configurator yang sudah dibangun: latar **gelap** (gradient navy-charcoal, sengaja dibuat tidak hitam pekat supaya mobil berwarna gelap tetap kebaca kontras), aksen **oranye (`#e8702a`)** dipakai konsisten untuk seluruh CTA, harga, highlight, dan active state — font display **Playfair Display (italic)** untuk judul besar, **Inter** untuk teks body/UI.
- Konsistensi: gunakan token warna & font yang sama di seluruh halaman (katalog, detail, dashboard admin) agar terasa satu produk, bukan tempelan.
- Dashboard admin boleh memakai tema lebih netral/terang untuk keterbacaan data, tetap memakai aksen oranye yang sama sebagai warna utama.

### 12.1 Motion & Animasi (GSAP)

Seluruh animasi di sisi publik/customer memakai GSAP sebagai satu-satunya engine lewat hook `useGSAP()` dari `@gsap/react`, supaya konsisten, auto-cleanup, dan mudah diorkestrasi lewat timeline. Rincian pemakaian per momen:

| Momen | Teknik GSAP | Tujuan |
|---|---|---|
| Hero (Beranda) | `useGSAP()` + `gsap.timeline()` untuk seluruh urutan reveal: zoom latar (Ken Burns) → judul → mobil → CTA sebagai satu sequence tunggal; reveal x-ray mobil tetap pakai canvas + cursor terpisah (mekanisme sudah ada), diorkestrasi masuk ke timeline yang sama; seluruhnya dibungkus `gsap.matchMedia()` untuk `prefers-reduced-motion` | Kesan masuk yang halus & sinematik, bukan elemen muncul serentak |
| Scroll di halaman panjang (Beranda, Detail Mobil) | `ScrollTrigger` — fade/slide-in per section saat masuk viewport, dengan `stagger` untuk grid kartu mobil | Halaman terasa hidup saat di-scroll, bukan statis |
| Scroll experience keseluruhan | **Lenis** (package `lenis`, import React lewat `lenis/react`) dipasang di root app, disinkronkan ke `ScrollTrigger.update()` | Scroll terasa halus/kental, bukan native scroll browser yang "kasar" |
| Transisi ganti halaman (React Router) | `gsap.timeline()` di komponen wrapper: fade-out halaman lama → navigasi → fade-in halaman baru | Hindari perpindahan halaman yang tiba-tiba/patah |
| Filter & sorting di Katalog Armada | Animasi keluar-masuk kartu saat hasil filter berubah (`FLIP` lewat plugin `Flip`, juga sudah gratis) | Transisi grid terasa halus saat hasil filter berubah, bukan "lompat" |
| Kalender ketersediaan | Micro-interaction saat tanggal dipilih/hover (scale kecil + easing) | Umpan balik halus tanpa berlebihan |
| Rincian harga saat booking | Angka berubah dengan `gsap.to()` men-tween nilai lama → nilai baru (count-up/down), bukan langsung berubah instan | Perubahan harga terasa "dipahami", bukan berkedip tiba-tiba |
| Tombol & kartu (hover) | Micro-interaction ringan: scale/shadow, di-drive `useGSAP()` per komponen | Interaktif tanpa berat |

**Prinsip:** animasi dipakai untuk memperjelas hierarki & memberi umpan balik (bukan sekadar dekorasi) — durasi pendek (150–500ms untuk micro-interaction, hingga ~1.2s untuk reveal section), easing custom lewat `CustomEase` (gratis sejak GSAP 100% free) yang senada dengan easing di hero (`cubic-bezier(0.16,1,0.3,1)`), dan tetap menghormati `prefers-reduced-motion` (matikan/kurangi animasi non-esensial bila pengguna mengaktifkan setting tersebut di OS-nya).

---

## 13. Roadmap & Milestone (Perkiraan 7 Minggu)

| Minggu | Fokus |
|---|---|
| 1 | Setup project Supabase (Auth provider, bucket Storage, trigger `on_auth_user_created`), hubungkan Prisma ke Postgres Supabase dengan pendekatan soft-reference untuk `profiles.id` (lihat §8 — jangan pakai hard FK ke `auth.users`), skema DB awal |
| 2 | Katalog & detail mobil (API + frontend), upload foto, setup GSAP + `@gsap/react` + Lenis (`lenis` / `lenis/react`) sebagai fondasi animasi |
| 3 | Kalender ketersediaan + endpoint overlap-check |
| 4 | Alur booking end-to-end (form → kalkulasi harga → submit → konfirmasi) ⚠️ **paling kompleks di roadmap** — menggabungkan form, kalkulasi harga, overlap-check, dan transaksi DB sekaligus. Pertimbangkan mulai desain form & logika kalkulasi paralel dengan Minggu 3, atau sisakan buffer eksplisit di Minggu 7 khusus untuk bagian ini |
| 5 | Dashboard admin: kelola armada & pesanan |
| 6 | Riwayat & profil customer, verifikasi dokumen |
| 7 | Polish UI/UX, responsive check, pengujian alur penuh, perbaikan bug |

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Double booking akibat race condition | Dua pelanggan dapat slot sama | Gunakan transaksi DB + constraint saat cek ketersediaan (§11.2) |
| Harga dimanipulasi dari frontend | Kerugian finansial | Kalkulasi harga final selalu di backend, bukan diterima mentah dari klien |
| Dokumen KTP/SIM palsu/tidak lengkap | Risiko hukum/operasional | Verifikasi manual oleh admin sebelum status `dikonfirmasi` |
| FK lintas schema Prisma (`public` → `auth`) gagal saat migration | Migration Minggu 1 terhambat, waktu debug terbuang | Sudah diantisipasi di §8: gunakan soft reference lewat trigger, bukan hard FK constraint, sejak desain awal |
| Scope membengkak (payment gateway, notifikasi, dll) | Proyek molor dari jadwal kuliah | Fitur tersebut eksplisit masuk §4.2 (Out-of-Scope v1) |
| Ketergantungan pada layanan pihak ketiga (Supabase down/berubah kebijakan) | Auth, DB, atau Storage tidak bisa diakses sementara | Wajar untuk skala tugas kuliah; simpan `.env` & schema Prisma rapi agar mudah pindah provider bila perlu di masa depan |
| Service-role key Supabase bocor/terekspos ke frontend | Akses penuh ke seluruh database & storage bisa diambil alih | Service-role key **hanya** disimpan di environment variable backend, tidak pernah dikirim ke browser atau di-commit ke repo |

---

## 15. Glosarium

- **Add-on**: layanan tambahan saat booking (sopir, asuransi, antar-jemput).
- **Lepas kunci**: skema sewa self-drive — kunci mobil diserahkan langsung ke penyewa, tanpa sopir dari pihak rental.
- **Dengan sopir (tidak lepas kunci)**: skema sewa di mana kunci tetap dipegang sopir dari pihak rental sepanjang masa sewa; berlaku wajib untuk unit yang memang tidak disewakan lepas kunci.
- **Overlap check**: proses pengecekan apakah rentang tanggal baru beririsan dengan booking yang sudah ada.
- **Snapshot harga**: harga yang disimpan pada saat booking dibuat, agar tidak berubah meski harga mobil di katalog diubah admin setelahnya.
- **Anon key**: kunci publik Supabase yang aman dipakai di frontend, akses dibatasi oleh aturan Auth/Storage.
- **Service-role key**: kunci rahasia Supabase dengan akses penuh (bypass semua pembatasan) — hanya untuk backend, tidak boleh sampai ke browser.
- **Signed URL**: tautan sementara berbatas waktu yang dibuat backend agar admin bisa melihat file di bucket privat tanpa membuat bucket itu publik.
- **Soft reference**: relasi antar tabel yang dijamin konsisten lewat logika aplikasi/trigger (bukan lewat foreign key constraint di level database) — dipakai untuk `profiles.id → auth.users.id` karena Prisma tidak mendukung FK constraint lintas schema Postgres.
