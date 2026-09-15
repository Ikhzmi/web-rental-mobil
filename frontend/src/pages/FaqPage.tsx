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
    category: 'Pemesanan & Sewa Armada',
    items: [
      {
        q: 'Bagaimana cara melakukan pemesanan (booking) mobil di KerenTal Kita?',
        a: 'Pilih armada yang diinginkan di halaman Mobil/Katalog, tentukan tanggal sewa & lokasi, pilih jenis sewa (Lepas Kunci / Dengan Sopir), serta add-on tambahan jika diperlukan. Setelah itu isi data penyewa dan lanjutkan ke pembayaran.',
      },
      {
        q: 'Apa bedanya sewa Lepas Kunci dan Dengan Sopir?',
        a: 'Lepas Kunci berarti Anda mengendarai sendiri kendaraan (self-drive) setelah memverifikasi KTP & SIM A. Dengan Sopir berarti armada disewakan beserta pengemudi berpengalaman yang siap mengantar Anda.',
      },
      {
        q: 'Berapa minimal durasi sewa mobil?',
        a: 'Minimal durasi sewa adalah 1 hari (24 jam). Untuk sewa jangka panjang (mingguan atau bulanan), Anda dapat mengonfirmasi penawaran khusus langsung dengan pihak mitra rental via Live Chat.',
      },
      {
        q: 'Apakah saya bisa mengajukan perubahan jadwal (Reschedule)?',
        a: 'Bisa! Anda dapat mengajukan Reschedule tanggal sewa secara mandiri dari halaman Detail Pesanan di akun Anda selama status booking sudah dikonfirmasi dan armada tersedia di jadwal baru.',
      },
    ],
  },
  {
    category: 'Pembayaran & Konfirmasi Otomatis',
    items: [
      {
        q: 'Metode pembayaran apa saja yang didukung?',
        a: 'Pembayaran didukung secara instan melalui QRIS (dapat discan seluruh e-wallet & m-banking seperti BCA, Mandiri, BRI, GoPay, OVO, ShopeePay), Virtual Account Bank, dan E-Wallet.',
      },
      {
        q: 'Apakah konfirmasi pembayaran dilakukan secara otomatis?',
        a: 'Ya! Sistem pembayaran terhubung langsung secara otomatis melalui payment gateway. Begitu pembayaran berhasil, status transaksi langsung terkonfirmasi otomatis tanpa perlu unggah bukti transfer manual.',
      },
      {
        q: 'Berapa lama batas waktu pembayaran checkout?',
        a: 'Setiap transaksi memiliki batas waktu pembayaran (countdown timer) pada halaman invoice checkout. Jika tidak dibayar hingga batas waktu habis, pesanan akan otomatis dibatalkan.',
      },
    ],
  },
  {
    category: 'Dokumen, Syarat & Verifikasi',
    items: [
      {
        q: 'Dokumen apa saja yang wajib disiapkan untuk menyewa?',
        a: 'Untuk sewa Lepas Kunci, Anda wajib menyiapkan KTP asli dan SIM A yang masih berlaku. Dokumen diunggah melalui menu Profil akun Anda untuk verifikasi.',
      },
      {
        q: 'Apakah akun saya harus diverifikasi terlebih dahulu?',
        a: 'Ya, verifikasi dokumen KTP dan SIM bertujuan untuk keamanan bersama antara pelanggan dan mitra instansi rental.',
      },
      {
        q: 'Berapa usia minimal untuk menyewa kendaraan?',
        a: 'Minimal usia penyewa adalah 21 tahun dan memiliki SIM A aktif minimal 1 tahun untuk tipe sewa Lepas Kunci.',
      },
    ],
  },
  {
    category: 'Pembatalan & Pengajuan Refund',
    items: [
      {
        q: 'Apakah saya bisa membatalkan pesanan yang sudah dibayar?',
        a: 'Bisa. Anda dapat mengajukan pembatalan pesanan dan refund langsung melalui menu Detail Pesanan sesuai dengan syarat & ketentuan yang berlaku.',
      },
      {
        q: 'Bagaimana proses pengembalian dana (Refund)?',
        a: 'Pengajuan refund akan ditinjau oleh pihak Admin Instansi dan pengembalian dananya diproses langsung oleh Super Admin ke rekening bank tujuan Anda.',
      },
    ],
  },
  {
    category: 'Fitur Live Chat, Notifikasi & Ulasan',
    items: [
      {
        q: 'Bagaimana cara menghubungi pihak rental saat menyewa?',
        a: 'Setiap pesanan dilengkapi fitur Live Chat langsung di dalam aplikasi. Anda dapat berkomunikasi dengan Admin Instansi rental untuk koordinasi penjemputan atau serah terima unit.',
      },
      {
        q: 'Bagaimana saya mengetahui status terbaru pesanan saya?',
        a: 'Anda akan menerima notifikasi real-time di akun Anda (ikon Lonceng Notifikasi) untuk setiap update seperti konfirmasi pembayaran, pengingat jadwal, pesan chat baru, hingga status refund.',
      },
      {
        q: 'Bagaimana cara memberikan ulasan dan rating kendaraan?',
        a: 'Setelah status sewa Selesai, Anda dapat memberikan ulasan bintang 1–5 beserta komentar untuk unit armada dan instansi rental melalui halaman riwayat pesanan.',
      },
    ],
  },
  {
    category: 'Kemitraan Mitra Rental (Admin Instansi)',
    items: [
      {
        q: 'Bagaimana cara mendaftarkan penyedia rental saya di KerenTal Kita?',
        a: 'SIlahkan hubungi kerental kita pada menu kontak untuk membuat kesepakatan, kemudian anda dapat mulai mengelola armada dan menerima pesanan.',
      },
      {
        q: 'Bagaimana pencairan dana pendapatan bagi Mitra Instansi Rental?',
        a: 'Pendapatan sewa bersih dari transaksi yang berhasil dapat dicairkan pada setiap hari senin yang akan ditransfer oleh Super Admin ke rekening bank instansi Anda.',
      },
    ],
  },
];

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>('Pemesanan & Sewa Armada-0');
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