# 🚀 Deployment Guide — KerenTal Kita

Panduan lengkap deploy **Backend** ke **Render.com** dan **Frontend** ke **Vercel**.

---

## 📋 Prasyarat

1. **Akun Supabase** — Database PostgreSQL + Auth sudah live
2. **Akun Render.com** — untuk backend (gratis tier tersedia)
3. **Akun Vercel** — untuk frontend (gratis tier tersedia)
4. **Akun Pakasir** — payment gateway (sandbox/production)
5. **Git Repository** — Push proyek ke GitHub/GitLab

---

## 🗄️ A. Deploy Backend ke Render

### 1. Persiapan

Push kode ke Git repository:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Buat Web Service di Render

1. Login ke [render.com](https://render.com)
2. Klik **New +** → **Web Service**
3. Connect repository GitHub/GitLab
4. Pilih repository **kerental-kita**
5. Konfigurasi:
   - **Name**: `kerental-backend`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 3. Setup Environment Variables

Di Render Dashboard → Environment, tambahkan:

```bash
NODE_ENV=production
PORT=10000

# Database (dari Supabase Dashboard > Project Settings > Database)
DATABASE_URL=postgresql://postgres:PASSWORD@PROJECT-REF.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:PASSWORD@PROJECT-REF.pooler.supabase.com:5432/postgres

# Supabase (dari Supabase Dashboard > Project Settings > API)
SUPABASE_URL=https://PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Frontend Origin (isi setelah frontend deploy)
FRONTEND_ORIGIN=https://your-app.vercel.app

# Pakasir Payment Gateway
PAKASIR_API_KEY=your-pakasir-api-key
PAKASIR_PROJECT_SLUG=kerental-kita
```

### 4. Deploy

1. Klik **Create Web Service**
2. Tunggu build selesai (~5-10 menit)
3. Backend URL: `https://kerental-backend.onrender.com`

### 5. Setup Webhook Pakasir

1. Login ke [pakasir.com](https://pakasir.com)
2. Project Settings → Webhook URL
3. Set: `https://kerental-backend.onrender.com/api/webhooks/pakasir`
4. Save

### 6. Health Check

Test backend:
```bash
curl https://kerental-backend.onrender.com/api/public/stats
```

---

## 🌐 B. Deploy Frontend ke Vercel

### 1. Install Vercel CLI (opsional)

```bash
npm install -g vercel
```

### 2. Deploy via Dashboard

1. Login ke [vercel.com](https://vercel.com)
2. Klik **Add New** → **Project**
3. Import Git Repository
4. Pilih **kerental-kita**
5. Konfigurasi:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. Setup Environment Variables

Di Vercel Dashboard → Settings → Environment Variables:

```bash
# Supabase (dari Supabase Dashboard > Project Settings > API)
VITE_SUPABASE_URL=https://PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend API URL (dari Render deployment)
VITE_API_URL=https://kerental-backend.onrender.com
```

### 4. Deploy

1. Klik **Deploy**
2. Tunggu build selesai (~2-3 menit)
3. Frontend URL: `https://kerental-kita.vercel.app`

### 5. Update CORS di Backend

Kembali ke Render Dashboard:
1. Environment → Edit `FRONTEND_ORIGIN`
2. Ganti dengan URL Vercel: `https://kerental-kita.vercel.app`
3. Restart service

### 6. Test Deployment

1. Buka `https://kerental-kita.vercel.app`
2. Test login, booking, payment flow
3. Check browser console untuk error

---

## 🔧 C. Update CORS & Origins

### Backend (Render)

Update `FRONTEND_ORIGIN` di environment variables:
```bash
FRONTEND_ORIGIN=https://kerental-kita.vercel.app
```

### Frontend (Vercel)

Update `VITE_API_URL`:
```bash
VITE_API_URL=https://kerental-backend.onrender.com
```

---

## 📊 D. Monitoring & Logs

### Render (Backend)
- **Logs**: Dashboard → Logs tab
- **Metrics**: Dashboard → Metrics tab
- **Auto-deploy**: Git push ke `main` otomatis deploy

### Vercel (Frontend)
- **Logs**: Dashboard → Deployments → View Logs
- **Analytics**: Dashboard → Analytics
- **Auto-deploy**: Git push ke `main` otomatis deploy

---

## ⚠️ E. Troubleshooting

### Backend Error 502/503
```bash
# Check logs di Render Dashboard
# Pastikan Prisma generate berhasil
# Cek DATABASE_URL valid
```

### Frontend Build Failed
```bash
# Check environment variables
# Pastikan VITE_SUPABASE_URL dan VITE_API_URL terisi
# Test build lokal: cd frontend && npm run build
```

### CORS Error
```bash
# Pastikan FRONTEND_ORIGIN di backend sesuai URL Vercel
# Check browser console untuk detail error
```

### Payment Gateway Gagal
```bash
# Cek webhook URL di Pakasir dashboard
# Test webhook: curl -X POST https://kerental-backend.onrender.com/api/webhooks/pakasir
# Check PAKASIR_API_KEY valid
```

---

## 🔐 F. Security Checklist

- ✅ `SUPABASE_SERVICE_ROLE_KEY` TIDAK di frontend
- ✅ `DATABASE_URL` hanya di backend
- ✅ CORS `FRONTEND_ORIGIN` hanya domain production
- ✅ Rate limiting aktif (sudah ada di kode)
- ✅ Helmet security headers (sudah ada di kode)
- ✅ Environment variables tidak di-commit ke Git

---

## 🔄 G. CI/CD (Auto Deploy)

### Render
- Push ke `main` → auto deploy backend
- Preview: buat branch → auto deploy preview

### Vercel
- Push ke `main` → auto deploy production
- Pull Request → auto deploy preview

---

## 💰 H. Cost Estimation

### Free Tier
- **Render Free**: 750 jam/bulan, sleep after 15 menit idle
- **Vercel Free**: 100 GB bandwidth, unlimited requests
- **Supabase Free**: 500 MB database, 2 GB bandwidth

### Paid (saat traffic naik)
- **Render**: $7/bulan (always on, 512 MB RAM)
- **Vercel Pro**: $20/bulan (unlimited, priority support)
- **Supabase Pro**: $25/bulan (8 GB database, better perf)

---

## 📝 I. Post-Deployment Tasks

1. **Update README** dengan URL production
2. **Setup monitoring** (Sentry, LogRocket, dll)
3. **Test semua fitur** di production
4. **Backup database** (Supabase auto-backup daily)
5. **Setup custom domain** (opsional)
6. **Enable Vercel Analytics** untuk tracking

---

## 🆘 Support

Jika ada masalah:
1. Check logs di Render/Vercel dashboard
2. Test API endpoint dengan `curl` atau Postman
3. Check Supabase Dashboard → Logs
4. Review error di browser console (F12)

---

**Deployment URL:**
- Backend: `https://kerental-backend.onrender.com`
- Frontend: `https://kerental-kita.vercel.app`
- Database: Supabase (managed)

**Happy Deploying! 🚀**
