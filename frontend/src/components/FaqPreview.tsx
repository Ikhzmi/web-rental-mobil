import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { AmbientGlow, RouteWaypoint } from './decor/RouteMotifs';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const faqs = [
  {
    id: 1,
    question: 'Dokumen apa saja yang diperlukan untuk menyewa mobil?',
    answer: 'Untuk sewa Lepas Kunci, siapkan KTP asli dan SIM A aktif yang diunggah melalui halaman Profil Anda. Untuk sewa Dengan Sopir, verifikasi dokumen dilakukan saat penjemputan.',
  },
  {
    id: 2,
    question: 'Bagaimana sistem pembayaran di KerenTal Kita?',
    answer: 'Pembayaran dilakukan secara otomatis & instan melalui QRIS (dapat discan dari seluruh e-wallet & m-banking), Virtual Account Bank, dan E-Wallet tanpa perlu verifikasi manual.',
  },
  {
    id: 3,
    question: 'Apakah bisa mengubah jadwal sewa (Reschedule)?',
    answer: 'Ya! Anda dapat mengajukan Reschedule tanggal sewa secara mandiri melalui menu Detail Pesanan di akun Anda selama armada tersedia pada jadwal baru.',
  },
  {
    id: 4,
    question: 'Bisakah menyewa mobil dengan sopir?',
    answer: 'Tentu! Kami menyediakan opsi sewa Lepas Kunci maupun Dengan Sopir profesional. Anda juga dapat menambahkan add-on asuransi dan layanan antar-jemput.',
  },
  {
    id: 5,
    question: 'Bagaimana jika saya perlu membatalkan pesanan?',
    answer: 'Anda dapat mengajukan pembatalan pesanan beserta refund melalui menu Detail Pesanan. Dana refund akan ditransfer kembali ke rekening bank Anda setelah disetujui.',
  },
];

export default function FaqPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useGSAP(
    () => {
      gsap.fromTo(
        '.faq-item',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={sectionRef}
      className={`relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 ${
        isDark ? 'bg-[#141419]' : 'bg-[#F9EFE8]'
      }`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
        <AmbientGlow isDark={isDark} position="bottom-right" size="md" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <RouteWaypoint isDark={isDark} />
          <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Pertanyaan Umum
          </h2>
          <p className={`text-base ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Temukan jawaban untuk pertanyaan yang sering diajukan
          </p>
        </div>

        {/* FAQ List - Glass cards */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="faq-item">
              <div className={`
                relative rounded-xl overflow-hidden
                ${isDark
                  ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]'
                  : 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm'
                }
              `}>
                {/* Top highlight when open */}
                {openIndex === index && (
                  <div className={`
                    absolute top-0 left-4 right-4 h-px
                    ${isDark
                      ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                      : 'bg-gradient-to-r from-transparent via-white/90 to-transparent'
                    }
                  `} />
                )}

                <button
                  onClick={() => toggleFaq(index)}
                  className={`
                    w-full px-5 py-4 flex items-center justify-between gap-4 text-left
                    ${isDark ? 'text-zinc-200' : 'text-zinc-900'}
                  `}
                >
                  <span className="font-medium text-sm">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`
                      shrink-0 transition-transform duration-200
                      ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                      ${openIndex === index ? 'rotate-180' : ''}
                    `}
                  />
                </button>

                {openIndex === index && (
                  <div className={`
                    px-5 pb-4
                    ${isDark ? 'text-zinc-400' : 'text-zinc-600'}
                  `}>
                    <div className={`h-px mb-4 ${
                      isDark ? 'bg-white/10' : 'bg-zinc-200'
                    }`} />
                    <p className="text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-10 text-center">
          <Link
            to="/faq"
            className={`
              inline-flex items-center gap-1.5 text-sm font-medium transition-colors
              ${isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
              }
            `}
          >
            Lihat semua pertanyaan
            <ChevronDown size={14} className="-rotate-90" />
          </Link>
        </div>
      </div>
    </section>
  );
}