import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileCheck, FileWarning, Upload, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useTheme } from '../hooks/useTheme';

async function uploadDokumen(userId: string, tipe: 'ktp' | 'sim', file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${tipe}.${ext}`;

  const { error } = await supabase.storage
    .from('dokumen-penyewa')
    .upload(path, file, { upsert: true });
  if (error) throw error;

  return path;
}

function DokumenUploadRow({
  tipe,
  currentPath,
  userId,
  onUploaded,
  isDark,
}: {
  tipe: 'ktp' | 'sim';
  currentPath: string | null;
  userId: string;
  onUploaded: () => void;
  isDark: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setError(null);
    try {
      const path = await uploadDokumen(userId, tipe, file);
      await api.saveDokumenReference(tipe, path);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!currentPath) return;
    const { data, error: signError } = await supabase.storage
      .from('dokumen-penyewa')
      .createSignedUrl(currentPath, 60);
    if (signError) {
      setError('Gagal memuat pratinjau dokumen');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all ${
      isDark
        ? 'bg-white/5 border border-white/10'
        : 'bg-white/80 backdrop-blur-md border border-white/60 shadow-sm'
    }`}>
      <div className="flex items-center gap-2.5">
        {currentPath ? (
          <FileCheck size={16} className="text-emerald-500 shrink-0" />
        ) : (
          <FileWarning size={16} className="text-amber-500 shrink-0" />
        )}
        <div>
          <p className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{tipe.toUpperCase()}</p>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{currentPath ? 'Sudah diunggah' : 'Belum diunggah'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {currentPath && (
          <button
            onClick={handlePreview}
            className={`text-xs underline underline-offset-2 transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lihat
          </button>
        )}
        <label className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {currentPath ? 'Ganti' : 'Unggah'}
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && <p className="text-red-500 text-xs w-full">{error}</p>}
    </div>
  );
}

export default function AkunProfilPage() {
  const { session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: api.getMyProfile,
  });

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [noKtp, setNoKtp] = useState('');
  const [noSim, setNoSim] = useState('');
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (profile) {
      setNama(profile.nama);
      setNoHp(profile.noHp);
      setNoKtp(profile.noKtp ?? '');
      setNoSim(profile.noSim ?? '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateMyProfile({ nama, noHp, noKtp, noSim }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const handleResetPassword = async () => {
    if (!session?.user.email) return;
    await supabase.auth.resetPasswordForEmail(session.user.email);
    setResetSent(true);
  };

  const inputClass = `w-full text-sm rounded-xl px-3.5 py-2.5 transition-all focus:outline-none ${
    isDark
      ? 'bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-blue-500/50'
      : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
  }`;

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] border border-white/10 p-6'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-6';

  if (isLoading || !profile) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`}>
        <Loader2 size={18} className="animate-spin" />
        <span className={isDark ? 'text-white/50' : 'text-slate-500'}>Memuat profil...</span>
      </main>
    );
  }

  return (
    <main className={`min-h-screen pt-28 pb-20 px-5 sm:px-10 md:px-14 transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Akun Saya</p>
          <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>Profil</h1>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className={`flex flex-col gap-4 mb-5 ${cardClass}`}
        >
          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Email</label>
            <input value={profile.email} disabled className={inputClass + ' opacity-50'} />
          </div>

          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nama Lengkap</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. HP</label>
            <input value={noHp} onChange={(e) => setNoHp(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. KTP</label>
              <input value={noKtp} onChange={(e) => setNoKtp(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. SIM</label>
              <input value={noSim} onChange={(e) => setNoSim(e.target.value)} className={inputClass} />
            </div>
          </div>

          {updateMutation.isError && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              isDark
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              Gagal menyimpan perubahan.
            </p>
          )}
          {saved && <p className="text-emerald-500 text-xs">Perubahan tersimpan.</p>}

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className={`text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Simpan Perubahan
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`mb-5 ${cardClass}`}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Dokumen KTP & SIM
          </h2>
          <p className={`text-xs mb-4 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
            Wajib diunggah sebelum booking pertama disetujui admin.
            {profile.dokumenVerified && (
              <span className="text-emerald-500"> Sudah diverifikasi admin.</span>
            )}
          </p>
          <div className="flex flex-col gap-2.5">
            <DokumenUploadRow
              tipe="ktp"
              currentPath={profile.dokumenKtpUrl}
              userId={profile.id}
              onUploaded={() => queryClient.invalidateQueries({ queryKey: ['my-profile'] })}
              isDark={isDark}
            />
            <DokumenUploadRow
              tipe="sim"
              currentPath={profile.dokumenSimUrl}
              userId={profile.id}
              onUploaded={() => queryClient.invalidateQueries({ queryKey: ['my-profile'] })}
              isDark={isDark}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cardClass}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Password</h2>
          <button
            onClick={handleResetPassword}
            disabled={resetSent}
            className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-full transition-colors disabled:opacity-60 ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <KeyRound size={14} />
            {resetSent ? 'Email terkirim' : 'Kirim Email Reset Password'}
          </button>
          {resetSent && (
            <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Cek email {profile.email} untuk tautan reset password.
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
