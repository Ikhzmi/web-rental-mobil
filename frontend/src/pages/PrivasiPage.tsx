import { Link } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, ChevronRight, Phone, Mail, FileCheck, Eye, Database, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { BUSINESS_PHONE_DISPLAY } from '../lib/businessConfig';

export default function PrivasiPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const glassCard = isDark
    ? 'bg-white/[0.04] border border-white/10 text-white'
    : 'bg-white/80 border border-slate-200/80 text-slate-900 shadow-sm';

  const privacyHighlights = [
    {
      icon: Lock,
      title: 'Enkripsi & Keamanan Data',
      desc: 'Kata sandi dan token sesi Anda dilindungi enkripsi bcrypt & TLS/HTTPS standar industri.',
    },
    {
      icon: Eye,
      title: 'Perlindungan Dokumen KTP & SIM',
      desc: 'Dokumen KTP & SIM disimpan di bucket privat Supabase Storage dan hanya diakses via signed URL sementara.',
    },
    {
      icon: Database,
      title: 'Tanpa Penjualan Data',
      desc: 'Kami tidak pernah menjual, menyewakan, atau membagikan data pribadi Anda kepada pihak ketiga untuk iklan.',
    },
    {
      icon: Server,
      title: 'Kepatuhan UU PDP No. 27/2022',
      desc: 'Seluruh pemrosesan data dilakukan berdasarkan persetujuan eksplisit dan kewajiban hukum yang sah.',
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
          <span className="text-slate-800 dark:text-white/80 font-medium">Kebijakan Privasi</span>
        </div>

        {/* Title Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-3">
            <Shield size={14} /> Kepatuhan Undang-Undang PDP No. 27/2022
          </div>
          <h1 className={`font-playfair italic text-3xl sm:text-5xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Kebijakan Privasi
          </h1>
          <p className={`text-sm sm:text-base max-w-2xl ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            KerenTal Kita berkomitmen menjaga kerahasiaan, integritas, dan keamanan data pribadi serta dokumen identitas Anda secara transparan.
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Terakhir Diperbarui: 15 September 2026 • Versi 1.0 (Berlaku Efektif)
          </p>
        </motion.div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {privacyHighlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`p-5 rounded-2xl border backdrop-blur-md ${glassCard}`}>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                  <Icon size={18} />
                </div>
                <h2 className="font-bold text-sm mb-1">{item.title}</h2>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detailed Content Sections */}
        <div className="space-y-6 mb-12 text-sm leading-relaxed">
          <div className={`p-6 rounded-2xl backdrop-blur-md border ${glassCard}`}>
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
              <FileCheck size={18} className="text-emerald-500" />
              1. Data Pribadi yang Kami Kumpulkan
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              Kami mengumpulkan data pribadi yang Anda berikan secara langsung saat mendaftar akun atau membuat pesanan:
            </p>
            <ul className="space-y-1.5 text-xs list-disc list-inside opacity-90">
              <li><strong>Informasi Profil:</strong> Nama lengkap, alamat email, nomor WhatsApp/HP, dan kata sandi (terenkripsi).</li>
              <li><strong>Data Transaksi:</strong> Tanggal sewa, lokasi penjemputan, pilihan add-on, dan riwayat pesanan.</li>
              <li><strong>Dokumen Identitas:</strong> Foto KTP dan foto SIM A untuk verifikasi kelayakan penyewa kendaraan.</li>
            </ul>
          </div>

          <div className={`p-6 rounded-2xl backdrop-blur-md border ${glassCard}`}>
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
              <Lock size={18} className="text-emerald-500" />
              2. Tujuan Penggunaan Data & Dokumen Identitas
            </h2>
            <p className="text-xs sm:text-sm mb-3">
              Data Anda hanya digunakan untuk keperluan operasional sewa kendaraan:
            </p>
            <ul className="space-y-1.5 text-xs list-disc list-inside opacity-90">
              <li>Memproses transaksi pemesanan dan verifikasi pembayaran.</li>
              <li>Memverifikasi identitas penyewa guna mencegah penipuan dan pelanggaran hukum.</li>
              <li>Mengirimkan notifikasi status pemesanan (dikonfirmasi, berjalan, selesai).</li>
              <li>Memberikan bantuan dan layanan pelanggan 24/7.</li>
            </ul>
          </div>

          <div className={`p-6 rounded-2xl backdrop-blur-md border ${glassCard}`}>
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
              <Shield size={18} className="text-emerald-500" />
              3. Hak-Hak Anda Sesuai UU PDP
            </h2>
            <p className="text-xs sm:text-sm mb-2">
              Sebagai pemilik data (Subjek Data), Anda berhak untuk:
            </p>
            <ul className="space-y-1 text-xs list-disc list-inside opacity-90">
              <li>Mengakses dan memperbarui data profil serta dokumen KTP/SIM di menu Profil Akun.</li>
              <li>Meminta penghapusan akun atau penarikan persetujuan pemrosesan data.</li>
              <li>Mengajukan pertanyaan atau pengaduan privasi kepada Data Protection Officer (DPO) kami.</li>
            </ul>
          </div>
        </div>

        {/* DPO Contact Card */}
        <div className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl border ${glassCard}`}>
          <h3 className="font-bold text-lg mb-2">Kontak Data Protection Officer (DPO)</h3>
          <p className={`text-xs sm:text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            Untuk pengajuan hak data pribadi atau pertanyaan mengenai Kebijakan Privasi, hubungi tim privasi kami:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <a href="mailto:privacy@kerentalkita.id" className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <Mail size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold">Email DPO Privasi</p>
                <p className="opacity-75">privacy@kerentalkita.id</p>
              </div>
            </a>
            <a href={`tel:${BUSINESS_PHONE_DISPLAY.replace(/[\s-]/g, '')}`} className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <Phone size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold">WhatsApp & Telepon Support</p>
                <p className="opacity-75">{BUSINESS_PHONE_DISPLAY}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
