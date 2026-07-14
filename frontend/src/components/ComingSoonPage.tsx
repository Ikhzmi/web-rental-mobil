import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description: string;
  week?: number;
}

export default function ComingSoonPage({ title, description, week }: ComingSoonPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] flex items-center justify-center px-5 py-24">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
          <Construction size={22} className="text-white/40" />
        </div>
        <h1 className="font-playfair italic text-white text-2xl sm:text-3xl mb-2">{title}</h1>
        <p className="text-white/50 text-sm mb-1">{description}</p>
        {week !== undefined && (
          <p className="text-white/30 text-xs mb-6">
            Dijadwalkan dikerjakan Minggu {week} (lihat §13 PRD).
          </p>
        )}
        <Link to="/" className="text-[#2563eb] text-sm hover:underline mt-2 inline-block">
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
