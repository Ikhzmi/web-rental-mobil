import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileCheck, FileWarning, Upload, KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';

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
}: {
  tipe: 'ktp' | 'sim';
  currentPath: string | null;
  userId: string;
  onUploaded: () => void;
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
      <div className="flex items-center gap-2.5">
        {currentPath ? (
          <FileCheck size={16} className="text-emerald-400 shrink-0" />
        ) : (
          <FileWarning size={16} className="text-amber-400 shrink-0" />
        )}
        <div>
          <p className="text-white text-sm">{tipe.toUpperCase()}</p>
          <p className="text-white/40 text-xs">{currentPath ? 'Sudah diunggah' : 'Belum diunggah'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {currentPath && (
          <button
            onClick={handlePreview}
            className="text-white/50 hover:text-white text-xs underline underline-offset-2"
          >
            Lihat
          </button>
        )}
        <label className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors">
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

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export default function AkunProfilPage() {
  const { session } = useSession();
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

  const inputClass =
    'w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-white/40';

  if (isLoading || !profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 flex items-center justify-center gap-2 text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Memuat profil...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#070b10] pt-28 pb-20 px-5 sm:px-10 md:px-14">
      <div className="max-w-lg mx-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Akun Saya</p>
        <h1 className="font-playfair italic text-white text-4xl sm:text-5xl mb-8">Profil</h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 flex flex-col gap-4 mb-5"
        >
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Email</label>
            <input value={profile.email} disabled className={inputClass + ' opacity-50'} />
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Nama Lengkap</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">No. HP</label>
            <input value={noHp} onChange={(e) => setNoHp(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">No. KTP</label>
              <input value={noKtp} onChange={(e) => setNoKtp(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">No. SIM</label>
              <input value={noSim} onChange={(e) => setNoSim(e.target.value)} className={inputClass} />
            </div>
          </div>

          {updateMutation.isError && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Gagal menyimpan perubahan.
            </p>
          )}
          {saved && <p className="text-emerald-400 text-xs">Perubahan tersimpan.</p>}

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2"
          >
            {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Simpan Perubahan
          </button>
        </form>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 mb-5">
          <h2 className="text-white/50 text-xs uppercase tracking-wider mb-1">
            Dokumen KTP & SIM
          </h2>
          <p className="text-white/30 text-xs mb-4">
            Wajib diunggah sebelum booking pertama disetujui admin.
            {profile.dokumenVerified && (
              <span className="text-emerald-400"> Sudah diverifikasi admin.</span>
            )}
          </p>
          <div className="flex flex-col gap-2.5">
            <DokumenUploadRow
              tipe="ktp"
              currentPath={profile.dokumenKtpUrl}
              userId={profile.id}
              onUploaded={() => queryClient.invalidateQueries({ queryKey: ['my-profile'] })}
            />
            <DokumenUploadRow
              tipe="sim"
              currentPath={profile.dokumenSimUrl}
              userId={profile.id}
              onUploaded={() => queryClient.invalidateQueries({ queryKey: ['my-profile'] })}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
          <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3">Password</h2>
          <button
            onClick={handleResetPassword}
            disabled={resetSent}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white text-sm px-4 py-2.5 rounded-full transition-colors"
          >
            <KeyRound size={14} />
            {resetSent ? 'Email terkirim' : 'Kirim Email Reset Password'}
          </button>
          {resetSent && (
            <p className="text-white/40 text-xs mt-2">
              Cek email {profile.email} untuk tautan reset password.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}