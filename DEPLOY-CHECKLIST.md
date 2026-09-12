# 🚀 Deployment Checklist — KerenTal Kita

## ✅ Pre-Deployment

- [ ] Database Supabase sudah live & migrasi selesai
- [ ] Test lokal frontend & backend berjalan
- [ ] Semua environment variables sudah dicatat
- [ ] Git repository sudah di push ke GitHub/GitLab
- [ ] Pakasir API Key sudah didapat (sandbox/production)

## 🗄️ Backend Deployment (Render.com)

- [ ] Buat Web Service di Render
- [ ] Set Root Directory: `backend`
- [ ] Set Build Command: `npm install && npx prisma generate && npm run build`
- [ ] Set Start Command: `npm start`
- [ ] Tambahkan 8 environment variables (lihat DEPLOYMENT.md)
- [ ] Deploy & tunggu build selesai (~5-10 menit)
- [ ] Salin backend URL (contoh: `https://kerental-backend.onrender.com`)
- [ ] Test health check: `curl https://your-backend.onrender.com/api/public/stats`

## 🌐 Frontend Deployment (Vercel)

- [ ] Buat Project baru di Vercel
- [ ] Set Root Directory: `frontend`
- [ ] Set Framework Preset: Vite
- [ ] Tambahkan 3 environment variables (lihat DEPLOYMENT.md)
- [ ] Deploy & tunggu build selesai (~2-3 menit)
- [ ] Salin frontend URL (contoh: `https://kerental-kita.vercel.app`)

## 🔧 Post-Deployment Updates

- [ ] Update `FRONTEND_ORIGIN` di Render dengan URL Vercel
- [ ] Restart backend service di Render
- [ ] Update webhook URL di Pakasir dashboard
- [ ] Test CORS: buka frontend di browser, check console
- [ ] Test API: login, booking, payment flow

## 🧪 Testing

- [ ] Login sebagai customer
- [ ] Login sebagai admin
- [ ] Login sebagai super admin
- [ ] Test booking flow end-to-end
- [ ] Test payment dengan Pakasir (sandbox)
- [ ] Check logs di Render & Vercel
- [ ] Test mobile responsive

## 🔐 Security Check

- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak ada di frontend
- [ ] `DATABASE_URL` tidak ter-expose
- [ ] CORS hanya allow production domain
- [ ] `.env` ada di `.gitignore`
- [ ] No secrets di Git history

## 📊 Monitoring Setup

- [ ] Enable Vercel Analytics
- [ ] Check Render logs untuk error
- [ ] Setup uptime monitoring (opsional)
- [ ] Setup error tracking (Sentry, opsional)

## 🎉 Launch

- [ ] Announce deployment URL
- [ ] Update README dengan production URLs
- [ ] Share credentials untuk testing
- [ ] Monitor first 24 hours
- [ ] Setup auto-deploy on Git push

---

**Backend URL**: `https://kerental-backend.onrender.com`  
**Frontend URL**: `https://kerental-kita.vercel.app`  
**Database**: Supabase (managed)

✅ All done? **Deploy berhasil!** 🎊
