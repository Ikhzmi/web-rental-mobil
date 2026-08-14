import { Mail, Phone, MapPin } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTheme } from '../hooks/useTheme';

const CONTACTS = [
  { icon: Phone, label: 'Telepon / WhatsApp', value: '+62 812-3456-7890' },
  { icon: Mail, label: 'Email', value: 'halo@kerentalkita.id' },
  { icon: MapPin, label: 'Kantor Pusat', value: 'Jl. Contoh Raya No. 1, Jakarta' },
];

export default function KontakPage() {
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1 });
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-3xl mx-auto">
        <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Hubungi Kami</p>
        <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>Kontak</h1>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONTACTS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className={`rounded-2xl backdrop-blur-md border p-5 ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-white/60 border-white/80 shadow-sm'
              }`}
            >
              <Icon size={18} className={`mb-3 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
              <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{label}</p>
              <p className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
