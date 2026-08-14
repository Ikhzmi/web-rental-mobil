# Konfigurasi Authentication Supabase

Dokumen ini berisi langkah-langkah yang perlu dilakukan di **Supabase Dashboard** untuk:

1. ~~Email Verification~~ (DISABLED - registration instant)
2. **Google OAuth Sign In**

---

## 📌 Status: Email Verification MATI

Email verification sudah dimatikan. User bisa langsung login setelah register tanpa perlu verifikasi email.

---

## 🔐 Konfigurasi Google OAuth

### Langkah 1: Buat Google OAuth Client ID

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Navigate ke **APIs & Services** → **Credentials**
4. Klik **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Isi **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   ```
7. Isi **Authorized redirect URIs**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   *(Ganti dengan project ID Supabase Anda)*

8. Klik **Create**
9. Copy **Client ID** dan **Client Secret**

### Langkah 2: Konfigurasi di Supabase Dashboard

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Navigate ke **Authentication** → **Providers**
4. Klik **Google**
5. Aktifkan toggle **Enable Sign in with Google**
6. Masukkan:
   - **Client ID**: dari Google Cloud Console
   - **Client Secret**: dari Google Cloud Console
7. Klik **Save**

### Langkah 3: Tambahkan Redirect URL (jika perlu)

1. Navigate ke **Authentication** → **URL Configuration**
2. Di **Redirect URLs**, tambahkan:
   ```
   http://localhost:5173/auth/callback
   ```
3. Klik **Save**

---

## 🔄 Alur Login Baru

### Login dengan Email/Password:
```
1. User buka /daftar
2. Isi form → Klik "Daftar"
3. Langsung redirect ke /login?registered=true
4. User login dengan credentials
5. Berhasil → Dashboard/akun
```

### Login dengan Google:
```
1. User klik "Masuk dengan Google" di /login ATAU "Daftar dengan Google" di /daftar
2. Redirect ke Google OAuth
3. User approve permission
4. Redirect ke /auth/callback
5. AuthCallbackPage proses session
6. Redirect ke dashboard
```

---

## ⚠️ Catatan Penting untuk Development

### Local Development:
- Google OAuth tidak bisa bekerja dengan `localhost` di beberapa kasus
- Pastikan **Authorized JavaScript origins** di Google Cloud Console sudah benar
- Redirect URL Supabase harus matching

### Jika Google OAuth tidak jalan di local:
1. Gunakan email/password registration sebagai fallback
2. Untuk testing Google OAuth, deploy ke staging/production

---

## 📝 Checklist Konfigurasi

- [ ] Buat Google OAuth Client di Google Cloud Console
- [ ] Set Authorized JavaScript origins ke `http://localhost:5173`
- [ ] Set Authorized redirect URIs ke Supabase callback URL
- [ ] Enable Google provider di Supabase Dashboard
- [ ] Masukkan Client ID dan Client Secret
- [ ] Tambahkan redirect URL `http://localhost:5173/auth/callback` di Supabase

---

## 🧪 Testing

### Test Email/Password Registration:
1. Buka `http://localhost:5173/daftar`
2. Isi form → Klik Daftar
3. Harus redirect ke `/login?registered=true`
4. Login dengan credentials
5. Harus bisa masuk ke dashboard

### Test Google Sign In:
1. Buka `http://localhost:5173/login`
2. Klik "Masuk dengan Google"
3. Redirect ke Google → Approve
4. Harus redirect ke dashboard (kalau Google OAuth sudah dikonfigurasi)

---

## 1. Konfigurasi Site URL

### Untuk Development (Local)
1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Navigate ke **Authentication** → **URL Configuration**
4. Set **Site URL** menjadi:
   ```
   http://localhost:5173
   ```
5. Set **Redirect URLs** menjadi:
   ```
   http://localhost:5173/auth/callback
   ```

### Untuk Production
1. Set **Site URL** ke domain production Anda:
   ```
   https://kerental-kita.com
   ```
2. Set **Redirect URLs** ke:
   ```
   https://kerental-kita.com/auth/callback
   ```

---

## 2. Konfigurasi Email Templates

### Untuk Development (Gunakan Deep Link Testing)

1. Navigate ke **Authentication** → **Email Templates**
2. Pilih template **Confirm signup**
3. Edit template agar menggunakan deep link:

   ```html
   <h2>Konfirmasi Email</h2>
   <p>Klik tombol di bawah untuk mengaktifkan akun kamu:</p>
   <a href="{{ .SiteURL }}/auth/callback?token={{ .Token }}&type=signup"
      style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:white;text-decoration:none;border-radius:8px;">
      Aktifkan Akun
   </a>
   <p>Atau salin link ini:</p>
   <p>{{ .SiteURL }}/auth/callback?token={{ .Token }}&type=signup</p>
   ```

### Verifikasi Email Tanpa Deep Link (Alternative)

Jika tidak menggunakan deep link, Supabase akan membuka halaman default-nya sendiri. Untuk menggunakan custom callback page, pastikan:

1. Di **Email Templates**, gunakan format URL di atas
2. Atau, di **Authentication** → **Providers** → **Email**, aktifkan **Confirm email**

---

## 3. Cek Konfigurasi Email Provider

### Untuk Development (Testing dengan Fake Email)

1. Navigate ke **Authentication** → **Providers** → **Email**
2. Pastikan **Enable Email Signup** dalam keadaan ON
3. Untuk development, Anda bisa menggunakan **Supabase CLI** dengan local project:

   ```bash
   # Start local Supabase
   supabase start

   # Lihat email yang dikirim (dev mode)
   supabase admin user list
   # Atau
   supabase inspect db
   ```

### Untuk Production

Pastikan Anda sudah configure SMTP custom atau biarkan Supabase menggunakan SMTP default-nya.

---

## 4. Testing Email Verification

### Testing di Local Development

1. Jalankan aplikasi:
   ```bash
   cd frontend
   npm run dev
   ```

2. Buka browser ke `http://localhost:5173/daftar`

3. Daftar dengan email test

4. **Cara 1**: Cek console browser untuk melihat email yang "dikirim":
   - Supabase menggunakan Ethereal Email untuk development
   - Link akan terlihat di console/log

5. **Cara 2**: Gunakan Supabase CLI:
   ```bash
   # Cek user yang baru terdaftar
   supabase users list

   # Generate email confirmation link manual
   supabase auth-link signup --email test@example.com
   ```

6. Klik link verification

7. Anda akan diarahkan ke `http://localhost:5173/auth/callback?token=xxx`

8. Halaman akan verifikasi token dan redirect ke home

---

## 5. Troubleshooting

### Error: "Token has expired"

- Token verification Supabase memiliki waktu expired (default 1 jam)
- Request new confirmation email

### Error: "Redirect URL mismatch"

- Pastikan URL di **Redirect URLs** persis sama dengan yang digunakan
- Untuk local: `http://localhost:5173/auth/callback`
- Perhatikan: tanpa trailing slash

### Error: "Email already registered"

- User dengan email tersebut sudah ada
- Gunakan fitur "Forgot Password" jika ini user yang sama

### Error: "Invalid token"

- Token corrupted atau tidak valid
- Minta user untuk daftar ulang

---

## 6. Environment Variables Checklist

Pastikan file `.env` Anda sudah benar:

```env
# Frontend (frontend/.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001

# Backend (backend/.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

---

## 7. Alternative: Disable Email Verification (Simpler Flow)

Jika Anda ingin simplify alur dan **tidak menggunakan email verification**:

1. Buka **Authentication** → **Providers** → **Email**
2. Matikan **Confirm email**
3. User langsung bisa login setelah daftar

Ini akan membuat alur:
```
Daftar → Langsung bisa login → No email verification needed
```

**⚠️ Warning**: Ini tidak direkomendasikan untuk production karena user bisa mendaftar dengan email yang bukan miliknya.
