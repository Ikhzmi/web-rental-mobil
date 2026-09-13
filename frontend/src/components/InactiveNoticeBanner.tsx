import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, Phone } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../hooks/useTheme';

export default function InactiveNoticeBanner() {
  const { profile } = useProfile();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isDismissed, setIsDismissed] = useState(false);

  if (!profile || profile.aktif !== false) {
    return null;
  }

  return (
    <>
      {/* Sticky Notice Banner at top */}
      <div className={`w-full py-3 px-4 flex items-center justify-between gap-3 border-b z-50 sticky top-0 shadow-md ${
        isDark
          ? 'bg-rose-950/90 border-rose-800/50 text-rose-200 backdrop-blur-xl'
          : 'bg-rose-50 border-rose-200 text-rose-800 backdrop-blur-md'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertOctagon size={18} className="shrink-0 text-rose-500 animate-pulse" />
          <p className="text-xs sm:text-sm font-semibold truncate">
            Akun Anda telah dinonaktifkan. Silakan hubungi KerenTal Kita untuk bantuan.
          </p>
        </div>
        <a
          href="https://wa.me/6281234567890?text=Halo%20KerenTal%20Kita,%20akun%20saya%20terindikasi%20dinonaktifkan."
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Phone size={13} />
          <span>Hubungi Kami</span>
        </a>
      </div>

      {/* Initial Modal Popup for inactive user */}
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsDismissed(true)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-3xl p-6 shadow-2xl text-center space-y-4 border ${
                isDark
                  ? 'bg-zinc-950/95 border-rose-500/30 text-white'
                  : 'bg-white border-rose-200 text-slate-900'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
                <AlertOctagon size={32} />
              </div>

              <div>
                <h3 className="text-lg font-bold">Akun Dinonaktifkan</h3>
                <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Akun Anda saat ini dinonaktifkan oleh administrator. Anda hanya dapat melihat riwayat pemesanan / mengeksport laporan dan tidak dapat melakukan reservasi baru.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
                Silakan hubungi KerenTal Kita untuk mengaktifkan kembali akun Anda.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  Saya Mengerti
                </button>
                <a
                  href="https://wa.me/6281234567890?text=Halo%20KerenTal%20Kita,%20akun%20saya%20terindikasi%20dinonaktifkan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
                >
                  <Phone size={14} />
                  Hubungi Admin
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
