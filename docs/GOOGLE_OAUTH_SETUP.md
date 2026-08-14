# Setup Google OAuth untuk Supabase

Panduan step-by-step untuk menambahkan Google Sign In ke aplikasi KerenTal Kita.

---

## Prerequisites

- Akun Google Cloud Console
- Project Supabase yang sudah aktif

---

## Langkah 1: Buat OAuth Client di Google Cloud Console

### 1.1 Buat Project (jika belum ada)

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Select a project** → **New Project**
3. Nama project: `kerental-kita` (atau sesuai keinginan)
4. Klik **Create**

### 1.2 Configure OAuth Consent Screen

1. Navigate ke **APIs & Services** → **OAuth consent screen**
2. Pilih **External** → Click **Create**
3. Fill in:
   - App name: `KerenTal Kita`
   - User support email: email Anda
   - Developer contact: email Anda
4. Click **Save and Continue**
5. Skip Scopes (default sudah cukup) → **Save and Continue**
6. Add test users (optional untuk development) → **Save and Continue**
7. Summary → **Back to Dashboard**

### 1.3 Buat OAuth 2.0 Client ID

1. Navigate ke **APIs & Services** → **Credentials**
2. Klik **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `KerenTal Kita Web`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   ```
6. **Authorized redirect URIs**:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   > ⚠️ Ganti `[YOUR-PROJECT-REF]` dengan project reference Anda dari Supabase.
   > Contoh: jika URL Supabase Anda `https://abcdefgh.supabase.co`, maka gunakan:
   > ```
   > https://abcdefgh.supabase.co/auth/v1/callback
   > ```

7. Klik **Create**
8. Copy **Your Client ID** dan **Your Client Secret**

---

## Langkah 2: Konfigurasi Provider di Supabase

### 2.1 Enable Google Provider

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Navigate ke **Authentication** → **Providers**
4. Cari **Google** dalam daftar
5. Klik untuk expand
6. Toggle **Enable Sign in with Google** ke ON

### 2.2 Masukkan Credentials

7. **Client ID**: paste dari Google Cloud Console
8. **Client Secret**: paste dari Google Cloud Console
9. Klik **Save**

### 2.3 Konfigurasi Redirect URL

10. Navigate ke **Authentication** → **URL Configuration**
11. Di **Redirect URLs**, tambahkan:
    ```
    http://localhost:5173/auth/callback
    ```
12. Klik **Save**

---

## Langkah 3: Verifikasi Setup

### Cek Environment Variables

Pastikan file `frontend/.env` sudah benar:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Test Manual

1. Buka aplikasi di `http://localhost:5173`
2. Buka halaman `/login`
3. Klik tombol "Masuk dengan Google"
4. Anda harus redirect ke Google OAuth consent screen
5. Setelah approve, harus redirect kembali ke aplikasi

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Penyebab**: Redirect URL di Google Cloud Console tidak cocok dengan Supabase callback URL.

**Solusi**:
1. Cek Google Cloud Console → Credentials → OAuth 2.0 Client
2. Pastikan **Authorized redirect URIs** berisi:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
3. Pastikan juga di Supabase → URL Configuration → Redirect URLs ada:
   ```
   http://localhost:5173/auth/callback
   ```

### Error: "Application not verified"

**Penyebab**: OAuth consent screen belum di-verifikasi oleh Google.

**Solusi untuk Development**:
- Tambahkan email Anda sebagai test user di OAuth consent screen
- Atau skip verification dengan menambahkan semua needed scopes

### Error: "popup_closed_by_user"

**Penyebab**: User menutup popup sebelum selesai.

**Solusi**: Ini normal - user harus mengklik tombol lagi.

### Google OAuth tidak redirect kembali

**Penyebab**: Callback URL tidak di-config dengan benar.

**Solusi**:
1. Pastikan redirect URL di Supabase dashboard sudah benar
2. Pastikan `emailRedirectTo` di code sesuai dengan callback URL

---

## Production Checklist

Sebelum deploy ke production:

- [ ] Create production OAuth client di Google Cloud Console
- [ ] Update Authorized JavaScript origins ke domain production
- [ ] Update Authorized redirect URIs ke production URL
- [ ] Update Redirect URLs di Supabase untuk production
- [ ] Submit OAuth app untuk verification (jika perlu)

### Production URLs:

```
Authorized JavaScript origins:
https://yourdomain.com

Authorized redirect URIs:
https://your-project-ref.supabase.co/auth/v1/callback

Supabase Redirect URLs:
https://yourdomain.com/auth/callback
```
