import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Calendar, Car, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const locations = [
  'Jakarta',
  'Bali',
  'Surabaya',
  'Bandung',
  'Yogyakarta',
  'Semarang',
  'Makassar',
  'Medan',
];

const categories = [
  'Semua Kategori',
  'City Car',
  'SUV',
  'MPV',
  'Pickup',
  'Luxury',
];

export default function SearchForm() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('Semua Kategori');

  useGSAP(
    () => {
      if (!containerRef.current) return;

      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 40, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to armada page with search params
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (category !== 'Semua Kategori') params.set('category', category);

    navigate(`/armada?${params.toString()}`);
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-8 md:py-12 px-4 sm:px-6 lg:px-8 -mt-8 md:-mt-12 relative z-10"
    >
      <div className="max-w-5xl mx-auto">
        {/* Glassmorphism container */}
        <div
          ref={containerRef}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl p-[1px]">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl" />
          </div>

          {/* Main card */}
          <div className="relative rounded-[22px]
                          bg-gradient-to-br from-black/80 via-[#0a0a1a]/90 to-black/80
                          backdrop-blur-2xl border border-white/10
                          shadow-2xl shadow-black/50
                          p-6 md:p-8">
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-[22px]
                            bg-gradient-to-br from-blue-500/5 to-transparent
                            pointer-events-none" />

            <form onSubmit={handleSearch} className="relative">
              {/* Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Location */}
                <div className="relative group">
                  <label className="block text-white/50 text-sm mb-2 ml-1">Lokasi</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 rounded-xl
                                 bg-white/5 border border-white/10
                                 text-white placeholder-white/30
                                 focus:border-blue-500/50 focus:bg-white/10
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                 transition-all duration-300
                                 appearance-none cursor-pointer
                                 group-hover:border-white/20"
                    >
                      <option value="" className="bg-[#0a0a1a]">Pilih Lokasi</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc} className="bg-[#0a0a1a]">
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                </div>

                {/* Start Date */}
                <div className="relative group">
                  <label className="block text-white/50 text-sm mb-2 ml-1">Tanggal Ambil</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl
                                 bg-white/5 border border-white/10
                                 text-white
                                 focus:border-blue-500/50 focus:bg-white/10
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                 transition-all duration-300
                                 group-hover:border-white/20
                                 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div className="relative group">
                  <label className="block text-white/50 text-sm mb-2 ml-1">Tanggal Kembali</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full pl-12 pr-4 py-4 rounded-xl
                                 bg-white/5 border border-white/10
                                 text-white
                                 focus:border-blue-500/50 focus:bg-white/10
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                 transition-all duration-300
                                 group-hover:border-white/20
                                 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="relative group">
                  <label className="block text-white/50 text-sm mb-2 ml-1">Kategori</label>
                  <div className="relative">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 rounded-xl
                                 bg-white/5 border border-white/10
                                 text-white
                                 focus:border-blue-500/50 focus:bg-white/10
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                 transition-all duration-300
                                 appearance-none cursor-pointer
                                 group-hover:border-white/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#0a0a1a]">
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <div className="mt-6 flex justify-center">
                <button
                  type="submit"
                  className="relative px-10 py-4 rounded-xl overflow-hidden group"
                >
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600
                                  group-hover:from-blue-500 group-hover:to-purple-500
                                  transition-all duration-300" />

                  {/* Glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100
                                  bg-gradient-to-r from-blue-600 to-purple-600
                                  blur-xl transition-opacity duration-300" />

                  {/* Button content */}
                  <span className="relative flex items-center gap-2 text-white font-semibold text-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Cari Mobil
                  </span>

                  {/* Scale effect on click */}
                  <div className="absolute inset-0 scale-0 rounded-xl
                                  bg-white/20 group-active:scale-100
                                  transition-transform duration-150" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
