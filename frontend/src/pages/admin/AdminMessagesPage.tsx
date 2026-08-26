import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, MessageCircle, Mail, Phone, Car, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';
import { getBookingStatusWithIcon } from '../../lib/statusConfig';
import { SkeletonList } from '../../components/Skeleton';

/**
 * Halaman ini SENGAJA tidak dibuat sebagai kotak chat/inbox pesan, karena
 * backend belum punya model percakapan (lihat prisma/schema.prisma — tidak
 * ada tabel Message). Membuat UI chat dengan bubble percakapan palsu hanya
 * akan mengulang masalah "data rekaan" yang sudah dibersihkan di dashboard.
 *
 * Sebagai gantinya: pusat kontak cepat berbasis data pemesan ASLI, supaya
 * admin bisa langsung menghubungi pelanggan lewat WhatsApp/telepon/email
 * terkait pesanan mereka — fungsional hari ini tanpa berpura-pura ada
 * sistem chat internal yang sebenarnya belum ada.
 */
export default function AdminMessagesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-messages-bookings'],
    queryFn: () => api.listAdminBookings({ limit: 50 }),
  });

  const bookings = data?.data ?? [];

  // Satu pelanggan bisa punya beberapa pesanan — tampilkan sekali per
  // pelanggan, dengan pesanan terbarunya sebagai konteks.
  const contacts = useMemo(() => {
    const map = new Map<string, (typeof bookings)[number]>();
    for (const b of bookings) {
      const key = b.profile?.email ?? b.userId;
      const existing = map.get(key);
      if (!existing || new Date(b.createdAt) > new Date(existing.createdAt)) {
        map.set(key, b);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookings]);

  const filtered = contacts.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.profile?.nama?.toLowerCase().includes(q) ||
      c.profile?.email?.toLowerCase().includes(q) ||
      c.car?.nama?.toLowerCase().includes(q)
    );
  });

  const glassCard = getGlassCardClass(isDark);

  const waLink = (noHp: string, carNama: string) => {
    const digits = noHp.replace(/\D/g, '').replace(/^0/, '62');
    const msg = encodeURIComponent(`Halo, saya dari tim admin terkait pesanan ${carNama} Anda.`);
    return `https://wa.me/${digits}?text=${msg}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Kontak Pelanggan</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Hubungi pemesan langsung terkait pesanan mereka
        </p>
      </div>

      <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs ${isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          Belum ada sistem chat internal di aplikasi ini — daftar di bawah menghubungkan Anda
          langsung ke WhatsApp/email pelanggan berdasarkan data pesanan asli.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, email, atau mobil..."
          className={`w-full rounded-full pl-10 pr-4 py-2.5 text-sm outline-none transition-all ${
            isDark
              ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
          }`}
        />
      </div>

      {isLoading ? (
        <SkeletonList count={5} isDark={isDark} />
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${glassCard}`}>
          <MessageCircle size={26} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            {query ? 'Tidak ada pelanggan yang cocok.' : 'Belum ada pesanan masuk.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((b, i) => {
            const statusCfg = getBookingStatusWithIcon(b.status, isDark);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={`p-4 rounded-2xl flex items-center gap-3 ${glassCard}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
                  isDark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600'
                }`}>
                  {(b.profile?.nama ?? '?').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {b.profile?.nama ?? '-'}
                    </p>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 flex items-center gap-1 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>
                    <Car size={11} /> {b.car?.nama ?? '-'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {b.profile?.noHp && (
                    <a
                      href={waLink(b.profile.noHp, b.car?.nama ?? 'mobil')}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Chat WhatsApp"
                      className={`p-2 rounded-full transition-colors ${
                        isDark ? 'bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                  {b.profile?.noHp && (
                    <a
                      href={`tel:${b.profile.noHp}`}
                      aria-label="Telepon"
                      className={`p-2 rounded-full transition-colors ${
                        isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Phone size={15} />
                    </a>
                  )}
                  {b.profile?.email && (
                    <a
                      href={`mailto:${b.profile.email}`}
                      aria-label="Email"
                      className={`p-2 rounded-full transition-colors ${
                        isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Mail size={15} />
                    </a>
                  )}
                  <Link
                    to={`/admin/pesanan/${b.id}`}
                    className={`text-xs font-medium px-3 py-2 rounded-full transition-colors whitespace-nowrap ${
                      isDark ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
                    }`}
                  >
                    Detail
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}