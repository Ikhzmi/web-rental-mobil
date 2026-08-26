import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Clock, Copy, Check, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';
import { BUSINESS_EMAIL, BUSINESS_PHONE_DISPLAY, buildWhatsAppLink } from '../lib/businessConfig';

// Ganti nilai di bawah ini dengan data asli bisnis Anda (nomor WA & email
// ada di lib/businessConfig.ts, dipakai bersama oleh halaman lain juga)
const WHATSAPP_MESSAGE = 'Halo KerenTal Kita, saya ingin bertanya soal sewa mobil.';
const EMAIL = BUSINESS_EMAIL;
const PHONE_DISPLAY = BUSINESS_PHONE_DISPLAY;
const ADDRESS = 'Jl. Contoh Raya No. 1, Jakarta';

const OPERATING_HOURS = [
  { day: 'Senin – Jumat', hours: '08.00 – 20.00' },
  { day: 'Sabtu – Minggu', hours: '09.00 – 18.00' },
  { day: 'Hari Libur Nasional', hours: 'Tetap buka (jam terbatas)' },
];

const waLink = buildWhatsAppLink(WHATSAPP_MESSAGE);
const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;

export default function KontakPage() {
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1 });
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API tidak tersedia — abaikan secara diam-diam
    }
  };

  const glassCard = isDark
    ? 'bg-white/[0.04] border border-white/10'
    : 'bg-white/60 border border-white/80 shadow-sm';

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-3xl mx-auto">
        <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          Hubungi Kami
        </p>
        <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Kontak
        </h1>
        <p className={`text-sm sm:text-base mb-8 ${isDark ? 'text-white/55' : 'text-slate-600'}`}>
          Ada pertanyaan soal armada, harga, atau proses sewa? Tim kami siap membantu.
        </p>

        {/* CTA utama — WhatsApp */}
        <motion.a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`relative flex items-center gap-4 rounded-3xl p-5 sm:p-6 mb-6 overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
            isDark
              ? 'bg-emerald-400/10 border border-emerald-300/20 hover:border-emerald-300/40'
              : 'bg-emerald-50/80 border border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div
            className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-500 text-white'
            }`}
          >
            <MessageCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Chat via WhatsApp
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Respons tercepat — biasanya balas dalam hitungan menit
            </p>
          </div>
          <ExternalLink size={16} className={isDark ? 'text-white/40' : 'text-slate-400'} />
        </motion.a>

        {/* Info kontak */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <a
            href={`tel:${PHONE_DISPLAY.replace(/[\s-]/g, '')}`}
            className={`rounded-2xl backdrop-blur-md p-5 transition-colors ${glassCard} ${
              isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-white/80'
            }`}
          >
            <Phone size={18} className={`mb-3 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
            <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Telepon / WhatsApp</p>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{PHONE_DISPLAY}</p>
          </a>

          <a
            href={`mailto:${EMAIL}`}
            className={`rounded-2xl backdrop-blur-md p-5 transition-colors ${glassCard} ${
              isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-white/80'
            }`}
          >
            <Mail size={18} className={`mb-3 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
            <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Email</p>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{EMAIL}</p>
          </a>

          {/* Alamat — dengan tombol salin & buka peta */}
          <div className={`rounded-2xl backdrop-blur-md p-5 sm:col-span-2 ${glassCard}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <MapPin size={18} className={`mb-3 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Kantor Pusat</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{ADDRESS}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyAddress}
                  aria-label="Salin alamat"
                  className={`p-2 rounded-full transition-colors ${
                    isDark ? 'bg-white/10 hover:bg-white/15 text-white/70' : 'bg-white/80 hover:bg-white text-slate-600'
                  }`}
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs font-medium px-3 py-2 rounded-full transition-colors whitespace-nowrap ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15 text-white/80'
                      : 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-700'
                  }`}
                >
                  Buka Peta
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Jam operasional */}
        <div className={`rounded-2xl backdrop-blur-md p-5 sm:p-6 ${glassCard}`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className={isDark ? 'text-white/50' : 'text-slate-400'} />
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Jam Operasional</p>
          </div>
          <div className="space-y-2.5">
            {OPERATING_HOURS.map((item) => (
              <div
                key={item.day}
                className={`flex items-center justify-between text-sm pb-2.5 last:pb-0 border-b last:border-0 ${
                  isDark ? 'border-white/[0.06]' : 'border-slate-900/[0.06]'
                }`}
              >
                <span className={isDark ? 'text-white/55' : 'text-slate-600'}>{item.day}</span>
                <span className={`font-medium ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{item.hours}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}