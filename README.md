# KerenTal Kita

Monorepo (Opsi A — folder biasa, dua project npm yang independen):

```
kerental-kita/
├── frontend/    React + Vite + TS — lihat frontend/.env untuk kredensial
└── backend/     Express + TS + Prisma — lihat backend/.env untuk kredensial
```

Masing-masing folder adalah project npm yang **berdiri sendiri sepenuhnya**
(punya `package.json`, `node_modules`, `tsconfig.json` masing-masing).
Tidak ada workspaces — cukup `cd` ke folder yang mau dikerjakan.

## Jalankan (butuh 2 terminal)

```bash
# Terminal 1
cd backend
npm install
npx prisma generate   # wajib sebelum npm run dev, lihat backend/README.md
npm run dev            # http://localhost:3001

# Terminal 2
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## Status

- **Database Supabase**: sudah live, sudah di-provisioning (project
  "Rental-Mobil"). Skema, trigger, RLS, dan storage bucket semua sudah
  diterapkan — lihat `backend/README.md` untuk detail lengkap.
- **`.env` kedua folder**: sudah terisi kredensial asli (dari file yang
  kamu upload). Cek isinya sebelum commit ke git — sudah di-gitignore di
  kedua folder, tapi tetap double-check sebelum push pertama kali.
- **Belum diuji end-to-end** dari sandbox ini — build & typecheck lolos
  di kedua sisi, tapi belum pernah benar-benar dijalankan `npm run dev`
  dan diklik-klik manual bersamaan.

Detail lebih lengkap ada di README masing-masing folder (`frontend/`
belum punya README terpisah — semua konteks ada di PRD; `backend/README.md`
sudah lengkap dengan status verifikasi & setup).
