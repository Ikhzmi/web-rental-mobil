import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Sun, Moon, LogOut, Save, Check, Building2, Percent, Lock, Eye, EyeOff, KeyRound, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
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

  const { data: instansiProfile } = useQuery({
    queryKey: ['my-instansi-profile'],
    queryFn: () => api.getInstansiProfile(),
  });

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');

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

  // Ubah Password state & handler
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasiPassword, setShowKonfirmasiPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUbahPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (passwordBaru.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter');
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordBaru });
      if (error) throw error;

      setPasswordBaru('');
      setKonfirmasiPassword('');
      showToast('success', 'Berhasil', 'Kata sandi akun berhasil diperbarui');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui kata sandi';
      setPasswordError(msg);
      showToast('error', 'Gagal', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const glassCard = getGlassCardClass(isDark);
  const labelClass = `text-xs font-medium mb-1.5 block ${isDark ? 'text-white/50' : 'text-slate-500'}`;
  const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${
    isDark
      ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
      : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
  }`;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pengaturan & Akun</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Kelola profil instansi, preferensi sistem, tim admin, dan keamanan akun Anda
        </p>
      </div>

      {/* Responsive 2-Column Grid Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Main Settings & Team Management - 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Profil Admin */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 sm:p-6 rounded-3xl ${glassCard}`}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/[0.06] text-white' : 'bg-slate-900 text-white'}`}>
                <User size={18} />
              </div>
              <div>
                <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Profil Pengguna</h2>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Informasi data diri Anda sebagai pengelola instansi</p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
                <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label className={labelClass}>Nomor HP / WhatsApp</label>
                    <input
                      type="text"
                      value={noHp}
                      onChange={(e) => setNoHp(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email Login</label>
                    <p className={`text-sm px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/10 text-white/60' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      {profile?.email}
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Role Peran</label>
                    <p className={`text-sm px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/10 text-white/60' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      {profile ? ROLE_LABEL[profile.role] ?? profile.role : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3">
                  <p className={`text-xs ${isDark ? 'text-white/35' : 'text-slate-400'}`}>
                    * Email dan peran dikelola oleh Super Admin platform.
                  </p>
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={!isDirty || updateMutation.isPending}
                    className={`inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shrink-0 ${
                      !isDirty
                        ? isDark ? 'bg-white/[0.03] text-white/25 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : isDark ? 'bg-white text-slate-900 hover:bg-white/90 shadow-lg' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                    }`}
                  >
                    {updateMutation.isSuccess && !isDirty ? <Check size={16} /> : <Save size={16} />}
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Card 2: Instansi & Komisi */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className={`p-5 sm:p-6 rounded-3xl ${glassCard}`}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                <Building2 size={18} />
              </div>
              <div>
                <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Instansi Rental</h2>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Data instansi terdaftar dan skema potongan komisi platform</p>
              </div>
            </div>

            {!instansiProfile ? (
              <div className={`h-16 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nama Instansi</label>
                  <p className={`text-sm font-semibold px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                    {instansiProfile.namaInstansi}
                  </p>
                </div>
                <div>
                  <label className={`${labelClass} flex items-center gap-1`}>
                    <Percent size={12} />
                    Rate Komisi Platform
                  </label>
                  <p className={`text-sm font-extrabold px-4 py-2.5 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    {Number(instansiProfile.komisiPlatformPersen)}% per transaksi
                  </p>
                </div>
              </div>
            )}
            <p className={`text-xs mt-3 leading-relaxed ${isDark ? 'text-white/35' : 'text-slate-400'}`}>
              Rate komisi dipotong secara otomatis dari tiap total pendapatan booking saat dilakukan pencairan dana instansi.
            </p>
          </motion.div>

          {/* Card 3: Tambah Admin Instansi Baru */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={`p-5 sm:p-6 rounded-3xl ${glassCard}`}
          >
            <div className="flex items-center justify-between gap-2.5 mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Tim Admin Instansi</h2>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    Tambahkan anggota admin baru untuk mengelola instansi {instansiProfile?.namaInstansi ?? 'Anda'}
                  </p>
                </div>
              </div>
            </div>

            <TambahAdminForm isDark={isDark} instansiName={instansiProfile?.namaInstansi} />
          </motion.div>

        </div>

        {/* Right Column (Preferences & Security Cards - 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Card 4: Tampilan & Mode Gelap */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`p-5 sm:p-6 rounded-3xl ${glassCard}`}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/[0.06] text-amber-400' : 'bg-slate-100 text-slate-700'}`}>
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Preferensi Tema</h2>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Atur tema visual dashboard admin</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-white/[0.02] border-white/10">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Mode Gelap (Dark Mode)</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  Tampilan kontras tinggi yang nyaman di mata
                </p>
              </div>
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle mode gelap"
                className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`absolute top-1 w-5 h-5 rounded-full ${isDark ? 'right-1 bg-slate-950 shadow' : 'left-1 bg-white shadow'}`}
                />
              </button>
            </div>
          </motion.div>

          {/* Card 5: Keamanan & Ubah Kata Sandi */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-5 sm:p-6 rounded-3xl ${glassCard}`}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                <KeyRound size={18} />
              </div>
              <div>
                <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Ubah Kata Sandi</h2>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Perbarui sandi login akun admin Anda</p>
              </div>
            </div>

            <form onSubmit={handleUbahPassword} className="space-y-3.5">
              <div>
                <label className={labelClass}>Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showPasswordBaru ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordBaru(!showPasswordBaru)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {showPasswordBaru ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Konfirmasi Kata Sandi</label>
                <div className="relative">
                  <input
                    type={showKonfirmasiPassword ? 'text' : 'password'}
                    placeholder="Ulangi kata sandi baru"
                    value={konfirmasiPassword}
                    onChange={(e) => setKonfirmasiPassword(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKonfirmasiPassword(!showKonfirmasiPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {showKonfirmasiPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword || !passwordBaru || !konfirmasiPassword}
                className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                {isChangingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
              </button>
            </form>
          </motion.div>

          {/* Card 6: Keluar Sesi Akun */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={`p-5 sm:p-6 rounded-3xl ${glassCard}`}
          >
            <h2 className={`font-bold text-base mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Sesi & Logout</h2>
            <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Keluar dari akun admin pada perangkat ini
            </p>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-all ${
                isDark ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <LogOut size={15} />
              Keluar dari Akun Admin
            </button>
          </motion.div>

        </div>

      </div>
    </div>
  );
}

function TambahAdminForm({ isDark, instansiName }: { isDark: boolean; instansiName?: string }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    setLoading(true);
    try {
      await api.createAdminUser({ email, password, nama, noHp });
      showToast('success', 'Berhasil', `Admin baru untuk ${instansiName ?? 'instansi Anda'} berhasil dibuat`);
      setEmail('');
      setPassword('');
      setNama('');
      setNoHp('');
    } catch (err: any) {
      const msg = err?.message || 'Gagal menambahkan admin';
      setError(msg);
      showToast('error', 'Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const labelClass = `text-xs font-medium mb-1.5 block ${isDark ? 'text-white/50' : 'text-slate-500'}`;
  const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${
    isDark
      ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
      : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
  }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nama Admin</label>
          <input
            type="text"
            required
            placeholder="Misal: Ahmad Zaky"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>No. Telepon / WhatsApp</label>
          <input
            type="text"
            required
            placeholder="081234567890"
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Email Login</label>
          <input
            type="email"
            required
            placeholder="admin.baru@instansi.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Password Admin</label>
          <input
            type="password"
            required
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3">
        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          * Admin yang ditambahkan otomatis terdaftar di bawah instansi {instansiName ?? 'Anda'}.
        </p>
        <button
          type="submit"
          disabled={loading || !email || !password || !nama || !noHp}
          className={`inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
            isDark ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{loading ? 'Menambahkan...' : 'Tambah Admin'}</span>
        </button>
      </div>
    </form>
  );
}