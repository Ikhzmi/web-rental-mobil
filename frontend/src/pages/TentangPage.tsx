import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

export default function TentangPage() {
  const revealRef = useScrollReveal<HTMLDivElement>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div ref={revealRef} className="max-w-3xl mx-auto">
        <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tentang Kami</p>
        <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          KerenTal Kita
        </h1>
        <div className={`text-sm sm:text-base leading-relaxed space-y-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          <p>
            KerenTal Kita hadir untuk membuat proses sewa mobil terasa sederhana — tanpa
            telepon berkali-kali, tanpa harga yang berubah-ubah, dan tanpa was-was soal
            jadwal yang bentrok.
          </p>
          <p>
            Setiap unit di armada kami diperiksa dan dibersihkan sebelum disewakan. Kamu bisa
            melihat harga penuh di muka, memilih lepas kunci atau dengan sopir sesuai
            kebutuhan, dan memantau status pesanan langsung dari akun kamu.
          </p>
        </div>
      </div>
    </main>
  );
}
