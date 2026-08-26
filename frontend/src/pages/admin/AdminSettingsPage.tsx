import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Sun, Moon, LogOut, Save, Check } from 'lucide-react';
import { api, type Profile } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { getGlassCardClass } from '../../hooks/useGlassStyles';
import { useNavigate } from 'react-router-dom';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin Instansi',
  super_admin: 'Super Admin',
  customer: 'Pelanggan',
};

export default function AdminSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['my-profile'],
    queryFn: () => api.getMyProfile(),
  });

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');

  // Sinkronkan form begitu data profil asli datang dari server
  useEffect(() => {
    if (profile) {
      setNama(profile.nama);
      setNoHp(profile.noHp);
    }
  }, [profile]);

  const isDirty = profile ? (nama !== profile.nama || noHp !== profile.noHp) : false;

  const updateMutation = useMutation({
    mutationFn: () => api.updateMyProfile({ nama, noHp }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-profile'], updated);
      showToast('success', 'Tersimpan', 'Profil berhasil diperbarui');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan profil';
      showToast('error', 'Gagal', message);
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const glassCard = getGlassCardClass(isDark);
  const labelClass = `text-xs font-medium mb-1.5 block ${isDark ? 'text-white/50' : 'text-slate-500'}`;
  const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${
    isDark
      ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
      : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
  }`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pengaturan</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Kelola profil akun dan preferensi tampilan
        </p>
      </div>

      {/* Profil */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 sm:p-6 rounded-2xl ${glassCard}`}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-slate-900/[0.05]'}`}>
            <User size={16} className={isDark ? 'text-white/70' : 'text-slate-600'} />
          </div>
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Profil</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
            <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nomor HP</label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Email</label>
                <p className={`text-sm px-4 py-2.5 rounded-xl ${isDark ? 'bg-white/[0.03] text-white/50' : 'bg-slate-50 text-slate-500'}`}>
                  {profile?.email}
                </p>
              </div>
              <div>
                <label className={labelClass}>Peran</label>
                <p className={`text-sm px-4 py-2.5 rounded-xl ${isDark ? 'bg-white/[0.03] text-white/50' : 'bg-slate-50 text-slate-500'}`}>
                  {profile ? ROLE_LABEL[profile.role] ?? profile.role : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className={`text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                Email dan peran tidak bisa diubah sendiri — hubungi Super Admin bila perlu.
              </p>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!isDirty || updateMutation.isPending}
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all shrink-0 ml-3 ${
                  !isDirty
                    ? isDark ? 'bg-white/[0.03] text-white/25 cursor-not-allowed' : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                    : isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {updateMutation.isSuccess && !isDirty ? <Check size={14} /> : <Save size={14} />}
                Simpan
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tampilan */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`p-5 sm:p-6 rounded-2xl ${glassCard}`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-slate-900/[0.05]'}`}>
            {isDark ? <Moon size={16} className="text-white/70" /> : <Sun size={16} className="text-slate-600" />}
          </div>
          <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Tampilan</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Mode Gelap</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Berlaku untuk seluruh dashboard admin
            </p>
          </div>
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle mode gelap"
            className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-white/20' : 'bg-slate-200'}`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`absolute top-1 w-5 h-5 rounded-full ${isDark ? 'right-1 bg-white' : 'left-1 bg-white shadow'}`}
            />
          </button>
        </div>
      </motion.div>

      {/* Akun */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-5 sm:p-6 rounded-2xl ${glassCard}`}
      >
        <h2 className={`font-semibold text-sm mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Akun</h2>
        <button
          onClick={handleLogout}
          className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors ${
            isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          <LogOut size={15} />
          Keluar dari Akun
        </button>
      </motion.div>
    </div>
  );
}