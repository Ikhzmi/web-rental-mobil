import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileCheck, FileWarning, Upload, KeyRound, Car, Calendar, ChevronRight, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, type StatusBooking } from '../lib/api';
import { formatRupiah } from '../lib/pricing';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useTheme } from '../hooks/useTheme';
import { lookupKodepos, type KodeposResult } from '../lib/kodepos';
import { formatWibTanggalShort } from '../lib/dates';

const STATUS_LABEL: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'Menunggu Bayar',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const STATUS_BADGE_DARK: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  dikonfirmasi: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  berjalan: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  selesai: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  dibatalkan: 'bg-white/10 text-white/40 border border-white/10',
};

const STATUS_BADGE_LIGHT: Record<StatusBooking, string> = {
  menunggu_pembayaran: 'bg-amber-100 text-amber-700 border border-amber-200',
  dikonfirmasi: 'bg-blue-100 text-blue-700 border border-blue-200',
  berjalan: 'bg-purple-100 text-purple-700 border border-purple-200',
  selesai: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  dibatalkan: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const formatTanggal = formatWibTanggalShort;

// Cocok persis dengan limit yang dipasang di level bucket Supabase
// Storage (dokumen-penyewa) — sebelumnya bucket ini TIDAK punya batas
// ukuran atau tipe file sama sekali.
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Format file harus JPG, PNG, atau PDF');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file maksimal 5MB');
      return;
    }

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
    <div className="space-y-1.5">
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
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{tipe.toUpperCase()}</p>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              {currentPath ? 'Sudah diunggah' : 'Belum diunggah'}
              {' · '}
              <span className={isDark ? 'text-white/30' : 'text-slate-400'}>JPG/PNG/PDF · Maks 5MB</span>
            </p>
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
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-xs px-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
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

  const { data: bookings, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: api.listMyBookings,
  });

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [noKtp, setNoKtp] = useState('');
  const [noSim, setNoSim] = useState('');
  const [kodePos, setKodePos] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kota, setKota] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [alamatJalan, setAlamatJalan] = useState('');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [isSearchingKodepos, setIsSearchingKodepos] = useState(false);
  const [kodeposSuggestions, setKodeposSuggestions] = useState<KodeposResult[]>([]);
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // Bank account fields for refund
  const [namaBank, setNamaBank] = useState('');
  const [nomorRekening, setNomorRekening] = useState('');
  const [namaPemilikRekening, setNamaPemilikRekening] = useState('');
  const [bankSaved, setBankSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setNama(profile.nama);
      setNoHp(profile.noHp);
      setNoKtp(profile.noKtp ?? '');
      setNoSim(profile.noSim ?? '');
      if (profile.alamat) {
        setAlamatLengkap(profile.alamat);
        setAlamatJalan(profile.alamat);
      }
      setNamaBank(profile.namaBank ?? '');
      setNomorRekening(profile.nomorRekening ?? '');
      setNamaPemilikRekening(profile.namaPemilikRekening ?? '');
    }
  }, [profile]);

  const handleKodePosChange = async (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 5);
    setKodePos(clean);

    if (clean.length === 5) {
      setIsSearchingKodepos(true);
      try {
        const results = await lookupKodepos(clean);
        setKodeposSuggestions(results);
        if (results.length > 0) {
          const first = results[0];
          setProvinsi(first.provinsi);
          setKota(first.kabupaten);
          setKecamatan(first.kecamatan);
          setKelurahan(first.kelurahan);
        }
      } catch (err) {
        console.error('Kodepos lookup error:', err);
      } finally {
        setIsSearchingKodepos(false);
      }
    } else {
      setKodeposSuggestions([]);
    }
  };

  const handleSelectKodeposSuggestion = (sug: KodeposResult) => {
    setProvinsi(sug.provinsi);
    setKota(sug.kabupaten);
    setKecamatan(sug.kecamatan);
    setKelurahan(sug.kelurahan);
    setKodeposSuggestions([]);
  };

  useEffect(() => {
    const parts = [
      alamatJalan.trim(),
      kelurahan ? `Kel. ${kelurahan}` : '',
      kecamatan ? `Kec. ${kecamatan}` : '',
      kota,
      provinsi,
      kodePos ? `Kode Pos ${kodePos}` : '',
    ].filter(Boolean);

    if (parts.length > 0) {
      setAlamatLengkap(parts.join(', '));
    }
  }, [alamatJalan, kelurahan, kecamatan, kota, provinsi, kodePos]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateMyProfile({ nama, noHp, noKtp, noSim, alamat: alamatLengkap }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: () => api.updateMyProfile({ namaBank: namaBank.trim(), nomorRekening: nomorRekening.trim(), namaPemilikRekening: namaPemilikRekening.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setBankSaved(true);
      setTimeout(() => setBankSaved(false), 2500);
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
      ? 'bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-white/30'
      : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20'
  }`;

  const cardClass = isDark
    ? 'rounded-2xl bg-white/[0.04] border border-white/10 p-6'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-6';

  if (isLoading || !profile) {
    return (
      <main className={`min-h-screen flex items-center justify-center gap-2 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]'
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
        ? 'bg-[#0a0a0a]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Akun Saya</p>
          <h1 className={`font-playfair italic text-4xl sm:text-5xl mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Profil</h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Kelola data diri, unggahan dokumen identitas, dan riwayat pesanan Anda di satu tempat.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className={`flex flex-col gap-4 ${cardClass}`}
        >
          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Email</label>
            <input value={profile.email} disabled className={inputClass + ' opacity-50 cursor-not-allowed'} />
          </div>

          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nama Lengkap</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} placeholder="Nama sesuai identitas" />
          </div>

          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>No. HP / WhatsApp</label>
            <input value={noHp} onChange={(e) => setNoHp(e.target.value)} className={inputClass} placeholder="08xxxxxxxxxx" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                No. KTP <span className="text-red-400">*</span>
              </label>
              <input value={noKtp} onChange={(e) => setNoKtp(e.target.value)} className={inputClass} placeholder="16 digit NIK" />
            </div>
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                No. SIM A <span className="text-[10px] opacity-60">(Wajib jika Lepas Kunci)</span>
              </label>
              <input value={noSim} onChange={(e) => setNoSim(e.target.value)} className={inputClass} placeholder="Nomor SIM A Anda" />
            </div>
          </div>

          {/* Section Detail Lokasi & Kode Pos */}
          <div className={`pt-4 border-t border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <MapPin size={14} className="text-orange-500" />
                Detail Lokasi & Alamat Domisili
              </label>
              <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                Isi Kode Pos untuk auto-fill
              </span>
            </div>

            {/* Kode Pos Paling Atas */}
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Kode Pos (5 Digit)</label>
              <div className="relative">
                <input
                  type="text"
                  value={kodePos}
                  onChange={(e) => handleKodePosChange(e.target.value)}
                  placeholder="Contoh: 50123"
                  maxLength={5}
                  className={`${inputClass} font-mono font-semibold tracking-wider`}
                />
                {isSearchingKodepos && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-orange-500">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                )}
              </div>

              {kodeposSuggestions.length > 1 && (
                <div className={`mt-2 p-2 rounded-xl border space-y-1 ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={`text-[10px] font-medium ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Pilih Wilayah:</p>
                  <div className="flex flex-wrap gap-1">
                    {kodeposSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectKodeposSuggestion(sug)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                          kelurahan === sug.kelurahan
                            ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                            : isDark
                            ? 'bg-white/10 border-white/15 text-white/80'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        Kel. {sug.kelurahan}, {sug.kecamatan}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Provinsi</label>
                <input value={provinsi} onChange={(e) => setProvinsi(e.target.value)} className={inputClass} placeholder="Provinsi" />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Kabupaten / Kota</label>
                <input value={kota} onChange={(e) => setKota(e.target.value)} className={inputClass} placeholder="Kota/Kabupaten" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Kecamatan</label>
                <input value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} className={inputClass} placeholder="Kecamatan" />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Kelurahan / Desa</label>
                <input value={kelurahan} onChange={(e) => setKelurahan(e.target.value)} className={inputClass} placeholder="Kelurahan" />
              </div>
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Alamat Jalan / Patokan</label>
              <textarea
                value={alamatJalan}
                onChange={(e) => setAlamatJalan(e.target.value)}
                rows={2}
                placeholder="Jl. Merdeka No. 123, RT 02/RW 05..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {alamatLengkap && (
              <div className={`p-2.5 rounded-xl border text-xs ${
                isDark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <p className="font-semibold text-[10px] text-orange-500 mb-0.5">Alamat Lengkap Tersimpan:</p>
                <p>{alamatLengkap}</p>
              </div>
            )}
          </div>

          {updateMutation.isError && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              isDark
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              Gagal menyimpan perubahan. Silakan periksa kembali isian Anda.
            </p>
          )}
          {saved && <p className="text-emerald-500 text-xs font-medium">✓ Perubahan profil berhasil disimpan.</p>}

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className={`text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
              isDark
                ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                : 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-lg shadow-black/10'
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
          className={cardClass}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Dokumen KTP & SIM
          </h2>
          <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
            KTP wajib diunggah untuk semua jenis sewa. SIM A wajib jika Anda menyewa secara <span className="font-semibold text-emerald-500">Lepas Kunci</span>, dan opsional jika dengan <span className="font-semibold text-sky-500">Sopir</span>. Dokumen yang diunggah akan otomatis tersimpan dan digunakan untuk booking Anda.
            {profile.dokumenVerified && (
              <span className="text-emerald-500 block mt-1 font-medium">✓ Dokumen Anda telah diverifikasi oleh admin.</span>
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

        {/* Rekening Bank untuk Refund */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className={cardClass}
        >
          <h2 className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Data Rekening Bank
          </h2>
          <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
            Digunakan untuk proses refund jika terjadi pembatalan pesanan yang sudah dikonfirmasi.
            Potongan administrasi <span className="font-semibold text-amber-500">3%</span> berlaku untuk refund pesanan dikonfirmasi.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nama Bank</label>
              <input
                value={namaBank}
                onChange={(e) => setNamaBank(e.target.value)}
                placeholder="Contoh: BCA, BRI, Mandiri, BNI"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nomor Rekening</label>
              <input
                value={nomorRekening}
                onChange={(e) => setNomorRekening(e.target.value.replace(/\D/g, ''))}
                placeholder="Nomor rekening bank"
                className={`${inputClass} font-mono tracking-wider`}
              />
            </div>
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Nama Pemilik Rekening</label>
              <input
                value={namaPemilikRekening}
                onChange={(e) => setNamaPemilikRekening(e.target.value)}
                placeholder="Sesuai buku tabungan"
                className={inputClass}
              />
            </div>

            {updateBankMutation.isError && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                Gagal menyimpan rekening. Silakan coba lagi.
              </p>
            )}
            {bankSaved && <p className="text-emerald-500 text-xs font-medium">✓ Data rekening berhasil disimpan.</p>}

            <button
              type="button"
              onClick={() => updateBankMutation.mutate()}
              disabled={updateBankMutation.isPending}
              className={`text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                isDark ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-lg shadow-black/10'
              }`}
            >
              {updateBankMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Simpan Rekening
            </button>
          </div>
        </motion.div>

        {/* Riwayat Pesanan Saya */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cardClass}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Riwayat Pesanan Saya
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                Pantau status sewa dan detail invoice kendaraan Anda
              </p>
            </div>
            {bookings && bookings.length > 0 && (
              <Link
                to="/akun/pesanan"
                className={`text-xs font-medium hover:underline flex items-center gap-1 ${
                  isDark ? 'text-white/70 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lihat Semua ({bookings.length})
                <ChevronRight size={13} />
              </Link>
            )}
          </div>

          {isBookingsLoading && (
            <div className={`flex items-center justify-center gap-2 py-8 text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              <Loader2 size={16} className="animate-spin" /> Memuat riwayat pesanan...
            </div>
          )}

          {!isBookingsLoading && bookings && bookings.length === 0 && (
            <div className={`text-center py-8 px-4 rounded-xl border border-dashed ${
              isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <Car size={32} className={`mx-auto mb-2 opacity-30 ${isDark ? 'text-white' : 'text-slate-700'}`} />
              <p className={`text-xs font-medium mb-1 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Belum ada riwayat pesanan
              </p>
              <p className={`text-[11px] mb-3 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                Kendaraan impian Anda siap menemani perjalanan berikutnya.
              </p>
              <Link
                to="/armada"
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full transition-all ${
                  isDark
                    ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                    : 'bg-zinc-800 text-white hover:bg-zinc-900 shadow-md'
                }`}
              >
                Jelajahi Armada
              </Link>
            </div>
          )}

          {!isBookingsLoading && bookings && bookings.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {bookings.slice(0, 5).map((booking) => {
                const badgeClass = (isDark ? STATUS_BADGE_DARK : STATUS_BADGE_LIGHT)[booking.status];
                return (
                  <Link
                    key={booking.id}
                    to={`/akun/pesanan/${booking.id}`}
                    className={`group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
                      isDark
                        ? 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                        : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                        isDark ? 'bg-white/5' : 'bg-slate-100'
                      }`}>
                        {booking.car?.images?.[0] ? (
                          <img
                            src={booking.car.images[0].url}
                            alt={booking.car.nama}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Car size={20} className="opacity-40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {booking.car?.nama ?? 'Kendaraan Rental'}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeClass}`}>
                            {STATUS_LABEL[booking.status]}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                          <Calendar size={12} className="shrink-0 opacity-70" />
                          <span className="truncate">
                            {formatTanggal(booking.tanggalMulai)} — {formatTanggal(booking.tanggalSelesai)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="hidden sm:block">
                        <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {formatRupiah(Number(booking.totalHarga))}
                        </p>
                      </div>
                      <ChevronRight size={15} className={`transition-transform group-hover:translate-x-0.5 ${
                        isDark ? 'text-white/40 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-700'
                      }`} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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