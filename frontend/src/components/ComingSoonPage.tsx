import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ComingSoonPageProps {
  title: string;
  description: string;
  week?: number;
}

export default function ComingSoonPage({ title, description, week }: ComingSoonPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className={`min-h-screen flex items-center justify-center px-5 py-24 ${
      isDark ? 'bg-[#0a0a0a]' : 'bg-[#F5F0E8]'
    }`}>
      <div className="text-center max-w-md">
        <div className={`w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-5 ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-[#8B7355]/10 border-[#8B7355]/20'
        }`}>
          <Construction size={22} className={isDark ? 'text-white/40' : 'text-[#8B7355]/60'} />
        </div>
        <h1 className={`font-playfair italic text-2xl sm:text-3xl mb-2 ${isDark ? 'text-white' : 'text-[#2C1810]'}`}>{title}</h1>
        <p className={`text-sm mb-1 ${isDark ? 'text-white/50' : 'text-[#8B7355]'}`}>{description}</p>
        {week !== undefined && (
          <p className={`text-xs mb-6 ${isDark ? 'text-white/30' : 'text-[#8B7355]/60'}`}>
            Dijadwalkan dikerjakan Minggu {week} (lihat §13 PRD).
          </p>
        )}
        <Link to="/" className={`text-sm hover:underline mt-2 inline-block ${isDark ? 'text-white/70' : 'text-[#8B7355]'}`}>
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
