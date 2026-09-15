import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowLeft, ChevronRight, Phone, Mail, Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { BUSINESS_EMAIL, BUSINESS_PHONE_DISPLAY } from '../lib/businessConfig';

export default function SyaratPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const glassCard = isDark
    ? 'bg-white/[0.04] border border-white/10 text-white'
    : 'bg-white/80 border border-slate-200/80 text-slate-900 shadow-sm';

  const sections = [
    {
      id: 'definisi',
      title: '1. Definisi & Interpretasi',
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            Dokumen ini mengatur hak dan kewajiban antara Pengguna/Customer dan Pengelola KerenTal Kita.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-blue-400 block mb-1">Customer / Penyewa</span>
              Pengguna terdaftar yang melakukan pemesanan sewa armada kendaraan melalui platform.
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-blue-400 block mb-1">Lepas Kunci (Self-Drive)</span>
              Skema sewa mandiri tanpa sopir. Penyewa wajib memiliki SIM A berlaku & KTP asli.
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-blue-400 block mb-1">Dengan Sopir</span>
              Skema sewa beserta pengemudi profesional yang disediakan oleh KerenTal Kita / Mitra Instansi.
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-blue-400 block mb-1">Jemput ke Rumah</span>
              Layanan pengantaran dan penjemputan unit kendaraan langsung ke lokasi penyewa.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'kelayakan',
      title: '2. Kelayakan & Persyaratan Pengguna',
      content: (
        <ul className="space-y-2 list-disc list-inside leading-relaxed text-sm">
          <li>Pengguna wajib berusia minimal <strong>17 tahun</strong> untuk pendaftaran akun.</li>
          <li>Untuk sewa <strong>Lepas Kunci</strong>, Penyewa wajib berusia minimal <strong>21 tahun</strong> dan memiliki <strong>SIM A aktif</strong>.</li>
          <li>Pengguna wajib melampirkan foto dokumen asli KTP & SIM A yang valid untuk verifikasi identitas.</li>
          <li>Satu orang hanya diperbolehkan memiliki 1 (satu) akun terverifikasi di platform KerenTal Kita.</li>
        </ul>
      ),
    },
    {
      id: 'booking',
      title: '3. Alur Pemesanan & Pembayaran',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Pemesanan dilakukan secara online melalui platform KerenTal Kita. Harga yang tercantum pada saat pesanan dikonfirmasi bersifat <strong>Harga Snapshot</strong> dan tidak akan berubah.
          </p>
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <p className="font-bold mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <CheckCircle2 size={14} /> Ketentuan Jam Operasional Sewa Unit
            </p>
            <p className="text-xs leading-relaxed">
              Jadwal pengambilan dan pengembalian unit kendaraan berlaku dari jam <strong>01.00 WIB hingga 23.00 WIB</strong> setiap harinya. Layanan bantuan customer support online beroperasi 24 Jam Nonstop.
            </p>
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-xs opacity-90">
            <li>Pembayaran dilakukan melalui Transfer Bank Manual (BCA, Mandiri, BRI, BNI, QRIS/E-Wallet).</li>
            <li>Batas waktu transfer adalah 1×24 jam sejak pesanan dibuat.</li>
            <li>Status pesanan berubah menjadi "Dikonfirmasi" setelah bukti transfer dan dokumen KTP/SIM diverifikasi oleh Admin.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'pembatalan',
      title: '4. Pembatalan, Reschedule & Refund',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Pembatalan pesanan yang masih berstatus <em>Pending</em> dapat dilakukan langsung melalui menu Detail Pesanan di akun Anda.
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs">
            <li><strong>Reschedule Tanggal:</strong> Pengguna dapat mengajukan perubahan tanggal sewa melalui fitur Reschedule di halaman pesanan selama tanggal baru tersedia.</li>
            <li><strong>Pengembalian Dana (Refund):</strong> Permohonan refund diproses oleh Super Admin dalam 3–7 hari kerja setelah disetujui.</li>
            <li><strong>Pembatalan Pengelola:</strong> Jika terjadi kendala armada mendadak atau force majeure, Pengelola akan memberikan pengembalian dana 100%.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'kewajiban',
      title: '5. Aturan Penggunaan & Larangan Kendaraan',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <p className="font-bold mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <AlertCircle size={14} /> Larangan Keras bagi Penyewa
            </p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Dilarang mengemudi dalam pengaruh alkohol, narkoba, atau obat terlarang.</li>
              <li>Dilarang melepaskan/memindahtangankan unit kendaraan kepada pihak lain tanpa izin tertulis.</li>
              <li>Dilarang merokok di dalam mobil (dikenakan denda pembersihan Rp 200.000).</li>
              <li>Dilarang membawa kendaraan ke luar wilayah operasional yang telah disepakati.</li>
            </ul>
          </div>
          <p className="text-xs opacity-80">
            Segala bentuk pelanggaran lalu lintas, tilang elektronik (ETLE), dan biaya bahan bakar selama masa sewa sepenuhnya menjadi tanggung jawab Penyewa.
          </p>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-6 text-slate-500 dark:text-white/40">
          <Link to="/" className="hover:underline flex items-center gap-1">
            <ArrowLeft size={13} /> Beranda
          </Link>
          <ChevronRight size={13} />
          <span className="text-slate-800 dark:text-white/80 font-medium">Syarat & Ketentuan</span>
        </div>

        {/* Title Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 mb-3">
            <ShieldCheck size={14} /> Perjanjian Resmi Pengguna
          </div>
          <h1 className={`font-playfair italic text-3xl sm:text-5xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Syarat & Ketentuan
          </h1>
          <p className={`text-sm sm:text-base max-w-2xl ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            Harap membaca ketentuan ini secara saksama sebelum melakukan transaksi sewa mobil di platform KerenTal Kita.
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Terakhir Diperbarui: 15 September 2026 • Versi 1.0 (Berlaku Efektif)
          </p>
        </motion.div>

        {/* Banner Syarat Pembacaan Pemesanan */}
        <div className={`p-4 rounded-2xl border mb-8 flex items-start gap-3.5 ${
          isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <FileText size={20} className="shrink-0 text-blue-500 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-sm mb-1">Ketentuan Wajib Dibaca Sebelum Membooking</p>
            <p>
              Dengan melanjutkan ke tahap pemesanan kendaraan, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh aturan sewa, tanggung jawab penyewa, serta kebijakan operasional yang berlaku di KerenTal Kita.
            </p>
          </div>
        </div>

        {/* List Section Accordion / Cards */}
        <div className="space-y-4 mb-12">
          {sections.map((section) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-5 sm:p-6 backdrop-blur-md transition-all ${glassCard}`}
            >
              <h2 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                {section.title}
              </h2>
              {section.content}
            </motion.div>
          ))}
        </div>

        {/* Contact Info Footer Card */}
        <div className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl border ${glassCard}`}>
          <h3 className="font-bold text-lg mb-2">Punya Pertanyaan Mengenai Syarat Sewa?</h3>
          <p className={`text-xs sm:text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            Tim customer support KerenTal Kita siap membantu memberikan penjelasan detail mengenai proses booking dan syarat sewa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <a href={`tel:${BUSINESS_PHONE_DISPLAY.replace(/[\s-]/g, '')}`} className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <Phone size={18} className="text-blue-500 shrink-0" />
              <div>
                <p className="font-semibold">Telepon / WhatsApp</p>
                <p className="opacity-75">{BUSINESS_PHONE_DISPLAY}</p>
              </div>
            </a>
            <a href={`mailto:${BUSINESS_EMAIL}`} className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <Mail size={18} className="text-blue-500 shrink-0" />
              <div>
                <p className="font-semibold">Email Support</p>
                <p className="opacity-75">{BUSINESS_EMAIL}</p>
              </div>
            </a>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs opacity-75">
            <span className="flex items-center gap-1.5"><Clock size={14} /> 24 Jam Nonstop Support</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} /> Tanjung Morawa, Deli Serdang</span>
          </div>
        </div>
      </div>
    </main>
  );
}
