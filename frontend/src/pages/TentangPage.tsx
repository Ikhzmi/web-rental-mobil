import { useScrollReveal } from '../hooks/useScrollReveal';

export default function TentangPage() {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div ref={revealRef} className="max-w-3xl mx-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Tentang Kami</p>
        <h1 className="font-playfair italic text-white text-4xl sm:text-5xl mb-6">
          KerenTal Kita
        </h1>
        <div className="text-white/60 text-sm sm:text-base leading-relaxed space-y-4">
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
