import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, MessageCircle, ArrowRight, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

type FaqItem = { q: string; a: string };
type FaqCategory = { category: string; items: FaqItem[] };

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    category: 'Pemesanan & Pembayaran',
    items: [
      {
        q: 'Bagaimana cara pembayaran di v1?',
        a: 'Saat ini pembayaran dilakukan lewat transfer manual. Setelah kamu booking, kami kirim instruksi transfer, dan admin akan memverifikasi pembayaran sebelum status pesanan dikonfirmasi.',
      },
      {
        q: 'Berapa lama proses konfirmasi pesanan?',
        a: 'Umumnya admin memverifikasi dan mengonfirmasi pesanan dalam waktu 1x24 jam setelah bukti transfer diunggah. Untuk booking mendadak, hubungi tim kami via WhatsApp agar diprioritaskan.',
      },
      {
        q: 'Apakah ada minimal durasi sewa?',
        a: 'Minimal sewa adalah 1 hari (24 jam). Untuk sewa jangka panjang (mingguan/bulanan), hubungi tim kami langsung untuk penawaran harga khusus.',
      },
    ],
  },
  {
    category: 'Dokumen & Syarat',
    items: [
      {
        q: 'Dokumen apa yang perlu disiapkan?',
        a: 'KTP dan SIM yang masih berlaku. Unggah lewat halaman profil sebelum booking pertama disetujui.',
      },
      {
        q: 'Berapa usia minimal untuk menyewa?',
        a: 'Minimal usia penyewa adalah 21 tahun dan sudah memiliki SIM A yang masih berlaku minimal 1 tahun.',
      },
      {
        q: 'Apa bedanya sewa lepas kunci dan dengan sopir?',
        a: 'Lepas kunci berarti kamu menyetir sendiri (self-drive), kunci diserahkan langsung ke kamu. Dengan sopir berarti mobil datang bersama sopir dari pihak kami, kunci tetap dipegang sopir sepanjang masa sewa.',
      },
    ],
  },
  {
    category: 'Selama Masa Sewa',
    items: [
      {
        q: 'Apa yang terjadi jika terlambat mengembalikan mobil?',
        a: 'Keterlambatan dikenakan denda per jam sesuai kebijakan yang tertera di detail pesanan. Kalau kamu tahu akan terlambat, kabari tim kami lebih dulu supaya bisa dikoordinasikan.',
      },
      {
        q: 'Apakah mobil sudah termasuk asuransi?',
        a: 'Setiap armada sudah dilindungi asuransi dasar untuk kecelakaan. Kerusakan akibat kelalaian penyewa (seperti salah bahan bakar atau kerusakan interior) tetap menjadi tanggung jawab penyewa sesuai ketentuan yang berlaku.',
      },
      {
        q: 'Apakah tersedia layanan antar-jemput?',
        a: 'Ya, untuk area yang tercakup dalam jangkauan layanan. Biaya antar-jemput mengikuti jarak lokasi dan akan diinfokan saat proses booking.',
      },
    ],
  },
  {
    category: 'Pembatalan & Perubahan',
    items: [
      {
        q: 'Bisa batalkan pesanan?',
        a: 'Bisa, selama status pesanan masih "pending" (belum dikonfirmasi admin). Setelah dikonfirmasi, pembatalan perlu dikoordinasikan langsung dengan tim kami.',
      },
      {
        q: 'Bisa ubah tanggal sewa setelah pesanan dikonfirmasi?',
        a: 'Bisa, sepanjang unit yang sama masih tersedia di tanggal baru. Hubungi tim kami via WhatsApp minimal 1 hari sebelum tanggal jemput untuk perubahan jadwal.',
      },
    ],
  },
];

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>('Pemesanan & Pembayaran-0');
  const [query, setQuery] = useState('');
  const listRef = useScrollReveal<HTMLDivElement>({ stagger: 0.07, dependencies: [query] });
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_CATEGORIES;
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const glassCard = isDark
    ? 'bg-white/[0.04] border border-white/10'
    : 'bg-white/60 border border-white/80 shadow-sm';

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-2xl mx-auto">
        <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          Bantuan
        </p>
        <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Pertanyaan Umum
        </h1>

        {/* Search */}
        <div className="relative mb-8">
          <Search
            size={16}
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pertanyaan..."
            className={`w-full rounded-full pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:scale-[1.01] ${
              isDark
                ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
                : 'bg-white/70 border border-white/80 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
            }`}
          />
        </div>

        {filteredCategories.length === 0 ? (
          <div className={`text-center py-16 rounded-3xl backdrop-blur-2xl ${glassCard}`}>
            <SearchX size={26} className={`mx-auto mb-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Tidak ada pertanyaan yang cocok dengan "{query}".
            </p>
          </div>
        ) : (
          <div ref={listRef} className="flex flex-col gap-8">
            {filteredCategories.map((cat) => (
              <div key={cat.category}>
                <h2
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    isDark ? 'text-white/40' : 'text-slate-500'
                  }`}
                >
                  {cat.category}
                </h2>
                <div className="flex flex-col gap-3">
                  {cat.items.map((item, i) => {
                    const key = `${cat.category}-${i}`;
                    const isOpen = openKey === key;
                    return (
                      <div key={key} className={`rounded-2xl backdrop-blur-md overflow-hidden ${glassCard}`}>
                        <button
                          onClick={() => setOpenKey(isOpen ? null : key)}
                          className="w-full flex items-center justify-between text-left px-5 py-4"
                        >
                          <span className={`text-sm font-medium pr-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {item.q}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 transition-transform duration-300 ${
                              isDark ? 'text-white/40' : 'text-slate-400'
                            } ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <p
                                className={`text-sm leading-relaxed px-5 pb-4 ${
                                  isDark ? 'text-white/55' : 'text-slate-600'
                                }`}
                              >
                                {item.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 rounded-2xl p-6 backdrop-blur-xl ${glassCard}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-white/[0.06] text-white/70' : 'bg-slate-900/[0.05] text-slate-600'
              }`}
            >
              <MessageCircle size={18} />
            </div>
            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              Masih ada pertanyaan lain?
            </p>
          </div>
          <Link
            to="/kontak"
            className={`inline-flex items-center gap-1.5 shrink-0 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Hubungi Kami
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}