import { Link } from 'react-router-dom';
import { Share2, AtSign, Globe } from 'lucide-react';
import logo from '../assets/logo.webp';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function Footer() {
  const ctaRef = useScrollReveal<HTMLDivElement>({ y: 20, stagger: 0.12 });

  return (
    <footer className="relative bg-black border-t border-white/10 px-5 sm:px-10 md:px-16 py-16">
      <div className="max-w-6xl mx-auto">
        <div
          ref={ctaRef}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 rounded-3xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-8 sm:p-10"
        >
          <div>
            <h3 className="font-playfair italic text-white text-3xl mb-2">
              Ready to hit the road?
            </h3>
            <p className="text-white/50 text-sm">
              Book your car in under two minutes, no paperwork at the counter.
            </p>
          </div>
          <Link
            to="/armada"
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-8 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
          >
            Reserve Now
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/10">
          <div className="flex items-center gap-2">
            <img src={logo} alt="KerenTal Kita" className="w-7 h-7 object-contain" />
            <span className="text-white text-lg font-playfair italic">KerenTal Kita</span>
          </div>

          <p className="text-white/40 text-xs order-3 sm:order-2">
            &copy; {new Date().getFullYear()} KerenTal Kita. All rights reserved.
          </p>

          <div className="flex items-center gap-4 order-2 sm:order-3">
            <a href="#" className="text-white/50 hover:text-white transition-colors">
              <AtSign size={18} />
            </a>
            <a href="#" className="text-white/50 hover:text-white transition-colors">
              <Globe size={18} />
            </a>
            <a href="#" className="text-white/50 hover:text-white transition-colors">
              <Share2 size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
