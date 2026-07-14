import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Sengaja tidak throw di sini — biar app tetap bisa dijalankan untuk
  // mengerjakan halaman yang tidak butuh Auth, sambil dev belum sempat
  // isi .env. Halaman yang butuh Auth akan gagal jelas saat dipakai,
  // bukan gagal senyap.
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi di .env — fitur Auth tidak akan berfungsi. Lihat .env.example.'
  );
}

// Dipakai langsung dari frontend (bukan lewat Express) untuk registrasi,
// login, dan upload ke Storage — sesuai §5/§8 PRD. Pakai anon key, aman
// untuk diekspos di browser; akses sebenarnya dibatasi oleh aturan
// Auth/Storage di sisi Supabase.
export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '');
