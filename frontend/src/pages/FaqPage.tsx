import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const FAQS = [
  {
    q: 'Apa bedanya sewa lepas kunci dan dengan sopir?',
    a: 'Lepas kunci berarti kamu menyetir sendiri (self-drive), kunci diserahkan langsung ke kamu. Dengan sopir berarti mobil datang bersama sopir dari pihak kami, kunci tetap dipegang sopir sepanjang masa sewa.',
  },
  {
    q: 'Bagaimana cara pembayaran di v1?',
    a: 'Saat ini pembayaran dilakukan lewat transfer manual. Setelah kamu booking, kami kirim instruksi transfer, dan admin akan memverifikasi pembayaran sebelum status pesanan dikonfirmasi.',
  },
  {
    q: 'Dokumen apa yang perlu disiapkan?',
    a: 'KTP dan SIM yang masih berlaku. Unggah lewat halaman profil sebelum booking pertama disetujui.',
  },
  {
    q: 'Bisa batalkan pesanan?',
    a: 'Bisa, selama status pesanan masih "pending" (belum dikonfirmasi admin). Setelah dikonfirmasi, pembatalan perlu dikoordinasikan langsung dengan tim kami.',
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const listRef = useScrollReveal<HTMLDivElement>({ stagger: 0.07 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-2xl mx-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Bantuan</p>
        <h1 className="font-playfair italic text-white text-4xl sm:text-5xl mb-8">
          Pertanyaan Umum
        </h1>

        <div ref={listRef} className="flex flex-col gap-3">
          {FAQS.map((item, i) => (
            <div
              key={item.q}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between text-left px-5 py-4"
              >
                <span className="text-white text-sm font-medium pr-4">{item.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-white/40 shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <p className="text-white/55 text-sm leading-relaxed px-5 pb-4">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
