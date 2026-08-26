import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Phone, Mail, Clock, Globe } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const navigation = {
  navigasi: [
    { name: 'Beranda', href: '/' },
    { name: 'Armada', href: '/armada' },
    { name: 'Tentang', href: '/tentang' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Kontak', href: '/kontak' },
  ],
  layanan: [
    { name: 'Sewa Harian', href: '/armada' },
    // "Dengan Sopir" sekarang benar-benar memfilter (param cocok dengan
    // yang dibaca ArmadaPage). "Antar-Jemput" & "Paket Tour" sebelumnya
    // pakai query param (delivery=true, tour=true) yang tidak berarti
    // apa-apa — tidak ada konsep ini di data model (lihat AUDIT_FINDINGS.md)
    // — jadi diarahkan ke katalog polos daripada menjanjikan filter yang
    // tidak pernah benar-benar terjadi.
    { name: 'Dengan Sopir', href: '/armada?tipeSewa=dengan_sopir' },
    { name: 'Antar-Jemput', href: '/armada' },
    { name: 'Paket Tour', href: '/armada' },
  ],
  bantuan: [
    { name: 'Cara Booking', href: '/faq' },
    { name: 'Syarat & Ketentuan', href: '/syarat' },
    { name: 'Kebijakan Privasi', href: '/privasi' },
    { name: 'Pengaduan', href: '/kontak' },
  ],
};

const socialLinks = [
  { name: 'Instagram', href: '#', icon: Globe },
  { name: 'Facebook', href: '#', icon: Globe },
  { name: 'Twitter', href: '#', icon: Globe },
];

export default function ModernFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useGSAP(
    () => {
      if (!footerRef.current) return;

      const columns = footerRef.current.querySelectorAll('.footer-col');
      const bottom = footerRef.current.querySelector('.footer-bottom');

      gsap.fromTo(
        columns,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
            once: true,
          },
        }
      );

      if (bottom) {
        gsap.fromTo(
          bottom,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            delay: 0.4,
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 90%',
              once: true,
            },
          }
        );
      }
    },
    { scope: footerRef }
  );

  const currentYear = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      className={`relative pt-16 md:pt-24 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-[var(--bg-primary)]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDark
          ? 'bg-gradient-to-t from-[#0a0a0a] to-transparent'
          : 'bg-gradient-to-t from-slate-50/50 to-transparent'
      }`} />

      {/* Top decorative line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${
        isDark
          ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent'
          : 'bg-gradient-to-r from-transparent via-slate-200/50 to-transparent'
      }`} />

      <div className="relative max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-16">
          {/* Column 1: Brand */}
          <div className="footer-col">
            <Link to="/" className="inline-block mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="/favicon.webp"
                  alt="KerenTal Kita"
                  className="w-12 h-12 rounded-xl"
                />
                <div>
                  <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>KerenTal</h3>
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Kita</p>
                </div>
              </div>
            </Link>
            <p className={`leading-relaxed mb-6 max-w-xs ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
              Platform rental mobil terpercaya dengan armada terlengkap dan harga transparan.
              Nikmati perjalanan tanpa khawatir.
            </p>

            {/* Contact info */}
            <div className="space-y-3">
              <div className={`flex items-start gap-3 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`} />
                <span className="text-sm">Jl. Sudirman No. 123, Jakarta</span>
              </div>
              <div className={`flex items-center gap-3 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                <Phone className={`w-5 h-5 shrink-0 ${isDark ? 'text-white/50' : 'text-slate-500'}`} />
                <span className="text-sm">+62 812 3456 7890</span>
              </div>
              <div className={`flex items-center gap-3 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                <Mail className={`w-5 h-5 shrink-0 ${isDark ? 'text-white/50' : 'text-slate-500'}`} />
                <span className="text-sm">info@kerentalkita.id</span>
              </div>
              <div className={`flex items-center gap-3 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                <Clock className={`w-5 h-5 shrink-0 ${isDark ? 'text-white/50' : 'text-slate-500'}`} />
                <span className="text-sm">24/7 Siap Melayani</span>
              </div>
            </div>
          </div>

          {/* Column 2: Navigasi */}
          <div className="footer-col">
            <h4 className={`font-semibold text-lg mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Navigasi</h4>
            <ul className="space-y-3">
              {navigation.navigasi.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`text-sm transition-colors duration-200 hover:text-white/80 ${
                      isDark ? 'text-white/50 hover:text-white/50' : 'text-slate-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Layanan */}
          <div className="footer-col">
            <h4 className={`font-semibold text-lg mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Layanan</h4>
            <ul className="space-y-3">
              {navigation.layanan.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`text-sm transition-colors duration-200 hover:text-white/80 ${
                      isDark ? 'text-white/50 hover:text-white/50' : 'text-slate-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Bantuan */}
          <div className="footer-col">
            <h4 className={`font-semibold text-lg mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Bantuan</h4>
            <ul className="space-y-3">
              {navigation.bantuan.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`text-sm transition-colors duration-200 hover:text-white/80 ${
                      isDark ? 'text-white/50 hover:text-white/50' : 'text-slate-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social links */}
            <div className="mt-8">
              <h4 className={`font-semibold text-sm mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Ikuti Kami</h4>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-lg'
                    }`}
                    aria-label={social.name}
                  >
                    <social.icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className={`footer-bottom py-6 ${
          isDark ? 'border-t border-white/10' : 'border-t border-slate-200/60'
        }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Payment badges */}
            <div className="flex items-center gap-4">
              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Metode Pembayaran:</span>
              <div className={`flex items-center gap-2 ${
                isDark ? '' : 'bg-white rounded-lg px-2 py-1 shadow-sm border border-slate-100'
              }`}>
                {['BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO'].map((bank) => (
                  <div
                    key={bank}
                    className={`px-3 py-1 rounded-lg ${
                      isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{bank}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Copyright */}
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              &copy; {currentYear} KerenTal Kita. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}