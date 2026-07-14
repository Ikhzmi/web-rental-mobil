import { Mail, Phone, MapPin } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const CONTACTS = [
  { icon: Phone, label: 'Telepon / WhatsApp', value: '+62 812-3456-7890' },
  { icon: Mail, label: 'Email', value: 'halo@kerentalkita.id' },
  { icon: MapPin, label: 'Kantor Pusat', value: 'Jl. Contoh Raya No. 1, Jakarta' },
];

export default function KontakPage() {
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-3xl mx-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Hubungi Kami</p>
        <h1 className="font-playfair italic text-white text-4xl sm:text-5xl mb-8">Kontak</h1>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONTACTS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-5"
            >
              <Icon size={18} className="text-[#2563eb] mb-3" />
              <p className="text-white/40 text-xs mb-1">{label}</p>
              <p className="text-white text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
