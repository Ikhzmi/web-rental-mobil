import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car as CarIcon, Plus, Trash2, ImagePlus, Pencil, X, Loader2, Search,
  ChevronLeft, ChevronRight, AlertCircle, Key, UserCheck, Camera, Users, Clock, CheckCircle2, Layers, XCircle, Calendar as CalendarIcon
} from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { api, type Car, type CarImage, type Kategori, type Transmisi, type BahanBakar, type StatusMobil, type TipeSewa } from '../../lib/api';
import { formatRupiah, formatCompactRupiah } from '../../lib/pricing';
import { supabase } from '../../lib/supabase';
import { Skeleton, SkeletonCarGrid } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';
import { compressImage, isImageFile } from '../../lib/imageCompression';
import { parseWibDate } from '../../lib/dates';

const KATEGORI_LABELS: Record<string, string> = {
  city_car: 'City Car', hatchback: 'Hatchback', suv: 'SUV', mpv: 'MPV',
  minibus: 'Minibus', pickup: 'Pickup', mewah: 'Mewah', electric: 'Electric',
};

const KATEGORI_OPTIONS: Kategori[] = ['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric'];
const TRANSMISI_OPTIONS: Transmisi[] = ['manual', 'matic'];

async function uploadCarPhoto(carId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${carId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('car-photos').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('car-photos').getPublicUrl(path);
  return data.publicUrl;
}

function PhotoManager({ car, isDark }: { car: Car; isDark: boolean }) {
  const queryClient = useQueryClient();
  const fileInputId = `photo-upload-${car.id}`;
  const [images, setImages] = useState<CarImage[]>(car.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setImages(car.images ?? []);
  }, [car.images]);

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteCarImage(car.id, imageId),
    onSuccess: (_, imageId) => {
      setImages(prev => prev.filter(img => img.id !== imageId));
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    },
  });

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isImageFile(file)) {
        setUploadError(`Format file "${file.name}" tidak didukung. Harap pilih JPG, PNG, atau WebP.`);
        continue;
      }

      try {
        setUploadProgress(`Mengoptimasi & mengunggah ${i + 1}/${files.length}...`);
        const optimizedFile = await compressImage(file);
        const url = await uploadCarPhoto(car.id, optimizedFile);
        const newImg = await api.addCarImage(car.id, { url, urutan: images.length + successCount });
        if (newImg) {
          setImages(prev => [...prev, newImg]);
        }
        successCount++;
      } catch (err) {
        console.error('Photo upload error:', err);
        setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah foto');
      }
    }

    queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    setUploading(false);
    setUploadProgress(null);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    handleFiles(files);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        id={fileInputId}
        type="file"
        accept="image/*"
        multiple
        onChange={onFileInputChange}
        disabled={uploading}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="flex items-center justify-between">
        <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          Foto Armada ({images.length})
        </label>
        <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          Maks. 5MB • Dioptimasi otomatis
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className={`relative aspect-square overflow-hidden border rounded-xl group transition-all ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <img src={img.url} alt={`Foto ${idx + 1}`} className="object-cover w-full h-full" />
            
            {/* Badge Foto Utama */}
            {idx === 0 && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/90 border border-white/15 text-white backdrop-blur-xs shadow-xs">
                Utama
              </span>
            )}

            {/* Tombol Hapus: Selalu terlihat di mobile untuk touch usability, hover di desktop */}
            <button
              type="button"
              onClick={() => deleteMutation.mutate(img.id)}
              disabled={deleteMutation.isPending}
              aria-label="Hapus foto"
              className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/65 hover:bg-red-600 active:scale-95 text-white transition-all shadow-md sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center"
            >
              <Trash2 size={13} className="text-red-300 group-hover:text-white" />
            </button>
          </div>
        ))}

        {/* Upload Card */}
        <label
          htmlFor={fileInputId}
          className={`aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-dashed transition-all cursor-pointer select-none touch-manipulation ${
            uploading
              ? isDark ? 'border-zinc-500/50 bg-zinc-500/10 cursor-not-allowed' : 'border-zinc-400 bg-zinc-50 cursor-not-allowed'
              : isDark
                ? 'border-white/20 hover:border-white/40 active:border-white/60 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/60 hover:text-white'
                : 'border-slate-300 hover:border-slate-400 active:border-slate-500 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          onClick={uploading ? (e) => e.preventDefault() : undefined}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin text-zinc-400 mb-1" />
              <span className="text-[10px] text-center leading-tight text-zinc-400 font-medium">
                {uploadProgress || 'Mengunggah...'}
              </span>
            </>
          ) : (
            <>
              <div className="p-2 rounded-full bg-zinc-500/10 text-zinc-400 mb-1">
                <ImagePlus size={18} />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">
                Tambah Foto
              </span>
              <span className="text-[9px] opacity-60 text-center mt-0.5">
                Galeri / Kamera
              </span>
            </>
          )}
        </label>
      </div>

      {uploadError && (
        <div className={`text-xs px-3 py-2 rounded-xl flex items-start gap-2 ${
          isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}

function EditCarModal({ car, onClose, isDark: propIsDark }: { car: Car; onClose: () => void; isDark?: boolean }) {
  const { theme } = useTheme();
  const themeIsDark = theme === 'dark';
  const isDark = propIsDark ?? themeIsDark;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusMobil>(car.status);
  const [nomorPlat, setNomorPlat] = useState(car.nomorPlat ?? '');
  const [tipeSewa, setTipeSewa] = useState<TipeSewa>(car.tipeSewa);
  const [bahanBakar, setBahanBakar] = useState<BahanBakar>(car.bahanBakar ?? 'bensin');
  const [hargaPerHari, setHargaPerHari] = useState(car.hargaPerHari);
  const [hargaSopirPerHari, setHargaSopirPerHari] = useState(car.hargaSopirPerHari ?? '');
  const [hargaAntarJemput, setHargaAntarJemput] = useState(car.hargaAntarJemput ?? '');

  const mutation = useMutation({
    mutationFn: () => api.updateAdminCar(car.id, {
      status,
      nomorPlat: nomorPlat.trim().toUpperCase() || undefined,
      tipeSewa,
      bahanBakar,
      hargaPerHari: Number(hargaPerHari),
      hargaSopirPerHari: tipeSewa === 'lepas_kunci' ? null : hargaSopirPerHari ? Number(hargaSopirPerHari) : null,
      hargaAntarJemput: hargaAntarJemput ? Number(hargaAntarJemput) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      onClose();
    },
  });

  const inputClass = `w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all ${
    isDark
      ? 'bg-white/[0.05] border border-white/15 text-white placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/10 focus:bg-white/[0.08]'
      : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          isDark
            ? 'border border-white/15 bg-zinc-950/85 backdrop-blur-2xl text-white shadow-black/80'
            : 'border border-slate-200 bg-white text-slate-900 shadow-slate-300/50'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div>
            <h2 className={`font-bold text-lg sm:text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Kelola {car.nama}</h2>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Perbarui status operasional, harga sewa, atau foto armada
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {/* Photo Management Section */}
          <PhotoManager car={car} isDark={isDark} />

          <div className="border-t border-white/10 pt-4" />

          {/* Nomor Plat */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block text-white/70">
              Nomor Plat
            </label>
            <input
              type="text"
              value={nomorPlat}
              onChange={(e) => setNomorPlat(e.target.value.toUpperCase())}
              placeholder="Contoh: BK 1234 XYZ"
              maxLength={12}
              className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all bg-white/[0.05] border border-white/15 text-white placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/10 focus:bg-white/[0.08] font-mono tracking-widest"
            />
          </div>

          {/* Operational Status (Tersedia / Tidak Tersedia toggle - no dropdown) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-white/70">
              Status Operasional
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('tersedia')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  status === 'tersedia'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  status === 'tersedia' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                }`}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold">Tersedia</div>
                  <div className="text-[10px] opacity-70">Siap disewa</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('nonaktif')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  status !== 'tersedia'
                    ? 'bg-rose-500/15 border-rose-500/60 text-rose-300 ring-2 ring-rose-500/25 shadow-lg shadow-rose-500/10'
                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  status !== 'tersedia' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-white/40'
                }`}>
                  <XCircle size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold">Tidak Tersedia</div>
                  <div className="text-[10px] opacity-70">Disembunyikan</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block text-white/70">
              Tipe Sewa
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipeSewa('lepas_kunci')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipeSewa === 'lepas_kunci'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                }`}
              >
                <Key size={16} className={`mb-1.5 ${tipeSewa === 'lepas_kunci' ? 'text-amber-400' : 'text-white/30'}`} />
                <div className="text-xs font-semibold">Lepas Kunci</div>
                <div className="text-[10px] opacity-70">Tanpa sopir</div>
              </button>
              <button
                type="button"
                onClick={() => setTipeSewa('dengan_sopir')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipeSewa === 'dengan_sopir'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                }`}
              >
                <UserCheck size={16} className={`mb-1.5 ${tipeSewa === 'dengan_sopir' ? 'text-amber-400' : 'text-white/30'}`} />
                <div className="text-xs font-semibold">Dengan Sopir</div>
                <div className="text-[10px] opacity-70">Wajib sopir</div>
              </button>
              <button
                type="button"
                onClick={() => setTipeSewa('keduanya')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipeSewa === 'keduanya'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                }`}
              >
                <Layers size={16} className={`mb-1.5 ${tipeSewa === 'keduanya' ? 'text-amber-400' : 'text-white/30'}`} />
                <div className="text-xs font-semibold">Keduanya</div>
                <div className="text-[10px] opacity-70">Lepas kunci & sopir</div>
              </button>
            </div>
          </div>

          {/* Bahan Bakar */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block text-white/70">
              Bahan Bakar
            </label>
            <select
              value={bahanBakar}
              onChange={(e) => setBahanBakar(e.target.value as BahanBakar)}
              className={inputClass}
            >
              <option value="bensin">Bensin</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric (EV)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block text-white/70">
                Harga Sewa/Hari (Rp)
              </label>
              <input
                type="number"
                value={hargaPerHari}
                onChange={(e) => setHargaPerHari(e.target.value)}
                placeholder="Contoh: 350000"
                className={inputClass}
              />
            </div>
            {tipeSewa !== 'lepas_kunci' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block text-white/70">
                  Harga Sopir/Hari (Rp)
                </label>
                <input
                  type="number"
                  value={hargaSopirPerHari}
                  onChange={(e) => setHargaSopirPerHari(e.target.value)}
                  placeholder="Contoh: 150000"
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {/* Biaya Antar/Jemput */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block text-white/70">
              Biaya Antar/Jemput ke Rumah (Rp) <span className="text-white/30 normal-case font-normal">opsional</span>
            </label>
            <input
              type="number"
              value={hargaAntarJemput}
              onChange={(e) => setHargaAntarJemput(e.target.value)}
              placeholder="Contoh: 50000"
              className={inputClass}
            />
            <p className="text-[10px] text-white/30 mt-1">Jika diisi, biaya ini otomatis dikenakan saat pelanggan memilih jemput ke rumah.</p>
          </div>

          {mutation.isError && (
            <div className="text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Gagal menyimpan perubahan armada. Silakan coba lagi.</span>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 shrink-0 bg-black/60 backdrop-blur-md">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full py-3 px-4 font-semibold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-white/15 text-white shadow-black/40 active:scale-98"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Simpan Perubahan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}function AvailabilityModal({ car, onClose, isDark: propIsDark }: { car: Car; onClose: () => void; isDark?: boolean }) {
  const { theme } = useTheme();
  const themeIsDark = theme === 'dark';
  const isDark = propIsDark ?? themeIsDark;
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DateRange | undefined>();
  const [alasan, setAlasan] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: blockedDates = [], isLoading: isLoadingBlocked } = useQuery({
    queryKey: ['admin-car-blocked-dates', car.id],
    queryFn: () => api.listCarBlockedDates(car.id),
  });

  // Sumber tunggal untuk disabled dates di kalender:
  // getCarAvailability sudah menggabungkan booking aktif + manual block
  const { data: availabilityRanges = [] } = useQuery({
    queryKey: ['car-availability', car.id],
    queryFn: () => api.getCarAvailability(car.id),
  });

  const addMutation = useMutation({
    mutationFn: (payload: { tanggalMulai: string; tanggalSelesai: string; alasan?: string }) =>
      api.addCarBlockedDate(car.id, payload),
    onSuccess: () => {
      setRange(undefined);
      setAlasan('');
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['admin-car-blocked-dates', car.id] });
      queryClient.invalidateQueries({ queryKey: ['car-availability', car.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Gagal menambah blokir tanggal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (blockedId: string) => api.deleteCarBlockedDate(car.id, blockedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-car-blocked-dates', car.id] });
      queryClient.invalidateQueries({ queryKey: ['car-availability', car.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    },
  });

  const toDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!range?.from) {
      setErrorMsg('Harap pilih tanggal pada kalender datepicker');
      return;
    }

    const startDate = range.from;
    const endDate = range.to || range.from;

    const tanggalMulai = toDateString(startDate);
    const tanggalSelesai = toDateString(endDate);

    setErrorMsg(null);
    addMutation.mutate({ tanggalMulai, tanggalSelesai, alasan: alasan.trim() || undefined });
  };

  const QUICK_REASONS = [
    'Servis Rutin',
    'Sewa Offline',
    'Perbaikan',
    'Libur Operasional',
  ];

  // Helper: parse tanggal booking backend ke tanggal kalender WIB
  // (lihat penjelasan di lib/dates.ts — parse mentah YYYY-MM-DD dari ISO
  // UTC menggeser blokir 1 hari lebih awal untuk jadwal 01:00 WIB).
  const parseLocalDate = (dateStr: string) => parseWibDate(dateStr);

  const blockedMatchers = availabilityRanges.map((a) => ({
    from: parseLocalDate(a.tanggalMulai),
    to: parseLocalDate(a.tanggalSelesai),
  }));

  // Tanggal sebelum hari ini tidak bisa diblokir
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const totalDays = range?.from
    ? Math.round(
        Math.abs(
          ((range.to ? range.to.getTime() : range.from.getTime()) - range.from.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ) + 1
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-3xl border p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto ${
          isDark
            ? 'border-white/15 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-black/90'
            : 'border-slate-200 bg-white text-slate-900 shadow-slate-300/50'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
              isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-700'
            }`}>
              <CalendarIcon size={22} />
            </div>
            <div>
              <h3 className={`font-bold text-lg sm:text-xl flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Kelola Kalender Ketersediaan
              </h3>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                Pilih tanggal pada datepicker untuk memblokir ketersediaan <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{car.nama}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* 2-Column Responsive Layout: Left Calendar / Right Actions & List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive DayPicker Calendar */}
          <div className={`lg:col-span-7 flex flex-col justify-between p-4 sm:p-5 rounded-2xl border ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  <CalendarIcon size={14} /> Kalender Datepicker
                </span>
                <span className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                  Klik tanggal mulai & selesai
                </span>
              </div>

              <div className="kerental-daypicker">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  disabled={{ before: todayMidnight }}
                  modifiers={{
                    blocked: blockedMatchers,
                  }}
                  modifiersClassNames={{
                    blocked: '!bg-rose-500/25 !text-rose-400 font-bold border !border-rose-500/50',
                  }}
                  classNames={{
                    months: 'flex flex-col w-full',
                    month: 'w-full',
                    month_caption: `flex items-center justify-between w-full font-bold text-sm mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`,
                    nav: 'flex items-center gap-1',
                    month_grid: 'w-full border-collapse',
                    weekdays: 'w-full',
                    weekday: `text-[10px] uppercase font-bold tracking-wider text-center pb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`,
                    weeks: 'w-full',
                    week: 'w-full',
                    day: 'transition-all duration-150 p-0.5',
                    day_button: `w-full h-full aspect-square rounded-xl flex items-center justify-center text-xs font-semibold transition-all ${
                      isDark ? 'hover:bg-white/15 text-white/90' : 'hover:bg-slate-200 text-slate-800'
                    }`,
                    selected: '!bg-amber-500 !text-black !font-bold rounded-xl shadow-md',
                    range_middle: '!bg-amber-500/20 !text-amber-300 rounded-none',
                    range_start: '!bg-amber-500 !text-black !font-bold rounded-r-none rounded-l-xl',
                    range_end: '!bg-amber-500 !text-black !font-bold rounded-l-none rounded-r-xl',
                    today: `underline ring-1 rounded-xl ${isDark ? 'ring-white/60' : 'ring-slate-400'}`,
                    outside: isDark ? 'text-white/15 opacity-30' : 'text-slate-300 opacity-30',
                  }}
                />
              </div>
            </div>

            {/* Calendar Legend */}
            <div className={`mt-4 pt-3 border-t flex flex-wrap items-center gap-4 text-[11px] ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-md border ${isDark ? 'bg-white/10 border-white/20' : 'bg-slate-100 border-slate-300'}`} />
                <span className={isDark ? 'text-white/70' : 'text-slate-600'}>Tersedia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 text-black font-bold flex items-center justify-center text-[8px]">✓</span>
                <span className={isDark ? 'text-white/90' : 'text-slate-800'}>Dipilih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500/30 border border-rose-500/50" />
                <span className="text-rose-500 font-medium">Tidak Tersedia / Diblokir</span>
              </div>
            </div>
          </div>

          {/* Right Column: Date Selection Details & Manual Block Form */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Form Box */}
            <form onSubmit={handleSave} className={`p-4 rounded-2xl border space-y-3.5 ${
              isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                Atur Blokir Tanggal
              </h4>

              {/* Selected Dates Display */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  Rentang Terpilih
                </div>
                {range?.from ? (
                  <div className={`text-xs font-bold flex items-center justify-between ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}>
                    <span>
                      {range.from.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {range.to && range.to.getTime() !== range.from.getTime() && (
                        <> — {range.to.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {totalDays} Hari
                    </span>
                  </div>
                ) : (
                  <div className={`text-xs italic ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                    Belum memilih tanggal di kalender
                  </div>
                )}
              </div>

              {/* Reason / Keterangan */}
              <div>
                <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                  Keterangan / Alasan
                </label>
                <input
                  type="text"
                  placeholder="Misal: Servis Rutin, Perbaikan Bengkel..."
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className={`w-full text-xs rounded-xl px-3 py-2.5 focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/15 text-white placeholder:text-white/30 focus:border-amber-500'
                      : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-600'
                  }`}
                />
              </div>

              {/* Quick Preset Reason Tags */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setAlasan(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                      alasan === reason
                        ? isDark
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-amber-100 border-amber-300 text-amber-800'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!range?.from || addMutation.isPending}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
              >
                {addMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Blokir Tanggal Ini
              </button>
            </form>

            {/* Existing Blocked Dates Management List */}
            <div className={`p-4 rounded-2xl border space-y-2 flex-1 overflow-hidden flex flex-col ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                  Daftar Blokir Manual ({blockedDates.length})
                </h4>
              </div>

              {isLoadingBlocked ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-xl" />
                  ))}
                </div>
              ) : blockedDates.length === 0 ? (
                <div className={`py-6 text-center text-xs italic ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  Belum ada tanggal yang diblokir manual
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {blockedDates.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                        isDark
                          ? 'bg-white/[0.04] border-white/10 hover:border-white/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="font-semibold text-rose-500 flex items-center gap-1.5 truncate">
                          <Clock size={11} className="shrink-0" />
                          <span>
                            {new Date(item.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {new Date(item.tanggalMulai).getTime() !== new Date(item.tanggalSelesai).getTime() && (
                              <> — {new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                            )}
                          </span>
                        </div>
                        {item.alasan && (
                          <div className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            {item.alasan}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-all shrink-0"
                        title="Buka blokir tanggal ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateCarModal({ onClose, onCreated, isDark }: { onClose: () => void; onCreated: (car: Car) => void; isDark: boolean }) {
  const queryClient = useQueryClient();
  const [nama, setNama] = useState('');
  const [nomorPlat, setNomorPlat] = useState('');
  const [kategori, setKategori] = useState<Kategori>('city_car');
  const [transmisi, setTransmisi] = useState<Transmisi>('manual');
  const [bahanBakar, setBahanBakar] = useState<BahanBakar>('bensin');
  const [tipeSewa, setTipeSewa] = useState<TipeSewa>('lepas_kunci');
  const [kapasitasKursi, setKapasitasKursi] = useState('5');
  const [hargaPerHari, setHargaPerHari] = useState('');
  const [hargaSopirPerHari, setHargaSopirPerHari] = useState('');
  const [hargaAntarJemput, setHargaAntarJemput] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const butuhHargaSopir = tipeSewa !== 'lepas_kunci';

  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (!isImageFile(file)) {
        setFormError(`Format file "${file.name}" tidak didukung. Harap pilih gambar JPG, PNG, atau WebP.`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedPhotos(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeSelectedPhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nama.trim() || !hargaPerHari || !kapasitasKursi) {
      setFormError('Lengkapi nama mobil, kapasitas kursi, dan harga sewa.');
      return;
    }
    if (!nomorPlat.trim()) {
      setFormError('Nomor plat kendaraan wajib diisi.');
      return;
    }
    if (butuhHargaSopir && !hargaSopirPerHari) {
      setFormError('Harga sopir per hari wajib diisi untuk tipe sewa ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      setSavingStatus('Menyimpan data mobil...');
      const createdCar = await api.createAdminCar({
        nama,
        nomorPlat: nomorPlat.trim().toUpperCase(),
        kategori,
        transmisi,
        bahanBakar,
        tipeSewa,
        kapasitasKursi: Number(kapasitasKursi),
        hargaPerHari: Number(hargaPerHari),
        hargaSopirPerHari: tipeSewa === 'lepas_kunci' ? null : hargaSopirPerHari ? Number(hargaSopirPerHari) : null,
        hargaAntarJemput: hargaAntarJemput ? Number(hargaAntarJemput) : null,
        status: 'tersedia',
        deskripsi: deskripsi || undefined,
      });

      // Unggah foto jika ada yang dipilih
      if (selectedPhotos.length > 0) {
        for (let i = 0; i < selectedPhotos.length; i++) {
          setSavingStatus(`Mengunggah foto ${i + 1} dari ${selectedPhotos.length}...`);
          try {
            const optimized = await compressImage(selectedPhotos[i]);
            const url = await uploadCarPhoto(createdCar.id, optimized);
            await api.addCarImage(createdCar.id, { url, urutan: i });
          } catch (uploadErr) {
            console.error('Upload photo error during create:', uploadErr);
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      setSubmitSuccess(true);
      // Notify parent after short delay so success screen is visible
      setTimeout(() => onCreated(createdCar), 2200);
    } catch (err) {
      console.error('Create car error:', err);
      setFormError(err instanceof Error ? err.message : 'Gagal membuat armada baru.');
    } finally {
      setIsSubmitting(false);
      setSavingStatus(null);
    }
  };

  const inputClass = `w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all ${
    isDark
      ? 'bg-white/5 border border-white/15 text-white focus:border-white/30 focus:ring-2 focus:ring-white/10 [&>option]:bg-[#0a0f1a]'
      : 'bg-white border border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 [&>option]:bg-white'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl ${
          isDark
            ? 'login-card-dark border-t sm:border border-white/15'
            : 'bg-white border-t sm:border border-slate-200'
        }`}
      >
        {/* Mobile Pull Bar Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 sm:hidden mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}>
          <div>
            <h3 className={`font-semibold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tambah Armada Baru
            </h3>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Setelah disimpan, armada akan masuk antrian review Super Admin
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form (Scrollable) */}
        {submitSuccess ? (
          // ── Success screen ──────────────────────────────────────────────
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-12 text-center">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-2 ${
              isDark ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
            }`}>
              <CheckCircle2 size={38} />
            </div>
            <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Armada Berhasil Ditambahkan!
            </h4>
            <p className={`text-sm leading-relaxed max-w-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Mobil Anda kini masuk <strong className={isDark ? 'text-amber-400' : 'text-amber-700'}>antrian review</strong> Super Admin.
              Setelah disetujui, armada akan otomatis tampil di katalog publik.
            </p>
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium ${
              isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              <Clock size={14} />
              Menunggu persetujuan Super Admin
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Nama Mobil
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Toyota Avanza Veloz 2024"
              className={inputClass}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Nomor Plat
            </label>
            <input
              type="text"
              required
              value={nomorPlat}
              onChange={(e) => setNomorPlat(e.target.value.toUpperCase())}
              placeholder="Contoh: BK 1234 XYZ"
              maxLength={12}
              className={`${inputClass} font-mono tracking-widest`}
            />
            <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              Otomatis uppercase. Contoh: BK 1234 XYZ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Kategori
              </label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value as Kategori)} className={inputClass}>
                {KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>{KATEGORI_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Transmisi
              </label>
              <select value={transmisi} onChange={(e) => setTransmisi(e.target.value as Transmisi)} className={inputClass}>
                {TRANSMISI_OPTIONS.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Bahan Bakar
              </label>
              <select value={bahanBakar} onChange={(e) => setBahanBakar(e.target.value as BahanBakar)} className={inputClass}>
                <option value="bensin">Bensin</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric (EV)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Tipe Sewa
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipeSewa('lepas_kunci')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipeSewa === 'lepas_kunci'
                    ? isDark
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                      : 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/25 shadow-sm'
                    : isDark
                      ? 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Key size={16} className={`mb-1.5 ${tipeSewa === 'lepas_kunci' ? 'text-amber-400' : isDark ? 'text-white/30' : 'text-slate-400'}`} />
                <div className="text-xs font-semibold">Lepas Kunci</div>
                <div className="text-[10px] opacity-70">Tanpa sopir</div>
              </button>
              <button
                type="button"
                onClick={() => setTipeSewa('dengan_sopir')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipeSewa === 'dengan_sopir'
                    ? isDark
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                      : 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/25 shadow-sm'
                    : isDark
                      ? 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <UserCheck size={16} className={`mb-1.5 ${tipeSewa === 'dengan_sopir' ? 'text-amber-400' : isDark ? 'text-white/30' : 'text-slate-400'}`} />
                <div className="text-xs font-semibold">Dengan Sopir</div>
                <div className="text-[10px] opacity-70">Wajib sopir</div>
              </button>
              <button
                type="button"
                onClick={() => setTipeSewa('keduanya')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipeSewa === 'keduanya'
                    ? isDark
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                      : 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/25 shadow-sm'
                    : isDark
                      ? 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Layers size={16} className={`mb-1.5 ${tipeSewa === 'keduanya' ? 'text-amber-400' : isDark ? 'text-white/30' : 'text-slate-400'}`} />
                <div className="text-xs font-semibold">Keduanya</div>
                <div className="text-[10px] opacity-70">Lepas kunci & sopir</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Kapasitas Kursi
              </label>
              <input
                type="number"
                min={2}
                max={20}
                required
                value={kapasitasKursi}
                onChange={(e) => setKapasitasKursi(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Harga/Hari (Rp)
              </label>
              <input
                type="number"
                required
                value={hargaPerHari}
                onChange={(e) => setHargaPerHari(e.target.value)}
                placeholder="350000"
                className={inputClass}
              />
            </div>
          </div>

          {butuhHargaSopir && (
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Harga Sopir/Hari (Rp)
              </label>
              <input
                type="number"
                required
                value={hargaSopirPerHari}
                onChange={(e) => setHargaSopirPerHari(e.target.value)}
                placeholder="150000"
                className={inputClass}
              />
            </div>
          )}

          {/* Biaya Antar/Jemput */}
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Biaya Antar/Jemput ke Rumah (Rp) <span className="text-xs font-normal opacity-50">opsional</span>
            </label>
            <input
              type="number"
              value={hargaAntarJemput}
              onChange={(e) => setHargaAntarJemput(e.target.value)}
              placeholder="Contoh: 50000"
              className={inputClass}
            />
            <p className={`text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Jika diisi, biaya ini otomatis dikenakan saat pelanggan memilih jemput ke rumah.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                Foto Mobil ({selectedPhotos.length})
              </label>
              <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                Bisa pilih beberapa foto sekaligus
              </span>
            </div>

            <input
              id="create-car-photo-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              disabled={isSubmitting}
              className="sr-only"
            />

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {photoPreviews.map((previewUrl, idx) => (
                <div
                  key={previewUrl}
                  className={`relative aspect-square overflow-hidden border rounded-xl group transition-all ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <img src={previewUrl} alt={`Preview ${idx + 1}`} className="object-cover w-full h-full" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/90 border border-white/15 text-white backdrop-blur-xs shadow-xs">
                      Utama
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSelectedPhoto(idx)}
                    disabled={isSubmitting}
                    aria-label="Hapus foto"
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/65 hover:bg-red-600 active:scale-95 text-white transition-all shadow-md flex items-center justify-center"
                  >
                    <Trash2 size={13} className="text-red-300 group-hover:text-white" />
                  </button>
                </div>
              ))}

              <label
                htmlFor="create-car-photo-upload"
                className={`aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-dashed transition-all cursor-pointer select-none touch-manipulation ${
                  isSubmitting
                    ? 'cursor-not-allowed opacity-50'
                    : isDark
                      ? 'border-white/20 hover:border-white/40 active:border-white/60 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                      : 'border-slate-300 hover:border-slate-400 active:border-slate-500 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="p-2 rounded-full bg-zinc-500/10 text-zinc-400 mb-1">
                  <ImagePlus size={18} />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">
                  Pilih Foto
                </span>
                <span className="text-[9px] opacity-60 text-center mt-0.5">
                  Galeri / Kamera
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Deskripsi Fasilitas & Ketentuan (opsional)
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              placeholder="Contoh: AC double blower, audio bluetooth, kondisi bersih dan terawat..."
              className={inputClass + ' resize-none'}
            />
          </div>

          {formError && (
            <div className={`text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2 ${
              isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Approval info banner */}
          <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border text-xs ${
            isDark
              ? 'bg-amber-500/[0.07] border-amber-500/20 text-amber-200/80'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <Clock size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <span>
              Armada yang baru dibuat akan masuk <strong>antrian review Super Admin</strong> dan
              belum ditampilkan ke katalog publik sampai disetujui.
            </span>
          </div>

          {/* Hidden submit trigger */}
          <button type="submit" id="create-car-submit-btn" className="hidden" />
        </form>
        )}

        {!submitSuccess && (
        <div className={`p-4 sm:p-5 border-t shrink-0 ${
          isDark ? 'border-white/10 bg-[#0a0f1a]/80' : 'border-slate-100 bg-white/80'
        } backdrop-blur-md`}>
          <button
            type="button"
            onClick={() => {
              const formBtn = document.getElementById('create-car-submit-btn');
              formBtn?.click();
            }}
            disabled={isSubmitting}
            className="w-full py-3 px-4 font-semibold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white shadow-black/20 active:scale-98"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {savingStatus || 'Simpan Armada'}
          </button>
        </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function DeleteCarModal({
  car,
  onClose,
  onDeleted,
  isDark: propIsDark,
}: {
  car: Car;
  onClose: () => void;
  onDeleted: () => void;
  isDark?: boolean;
}) {
  const { theme } = useTheme();
  const themeIsDark = theme === 'dark';
  const isDark = propIsDark ?? themeIsDark;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAdminCar(car.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      queryClient.invalidateQueries({ queryKey: ['instansi-dashboard'] });
      onDeleted();
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal menghapus armada.');
    },
  });

  const mainImage = car.images?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-5 ${
          isDark
            ? 'border-white/15 bg-zinc-950/90 backdrop-blur-2xl text-white shadow-black/90'
            : 'border-slate-200 bg-white text-slate-900 shadow-slate-300/50'
        }`}
      >
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg ${
            isDark ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10' : 'bg-rose-100 border-rose-200 text-rose-600 shadow-rose-100'
          }`}>
            <Trash2 size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Hapus Armada?</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Konfirmasi tindakan penghapusan armada dari sistem rental Anda.
          </p>
        </div>

        {/* Car preview card */}
        <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
          isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          {mainImage ? (
            <img
              src={mainImage}
              alt={car.nama}
              className={`w-14 h-14 rounded-xl object-cover border shrink-0 ${
                isDark ? 'bg-black/40 border-white/10' : 'bg-slate-200 border-slate-300'
              }`}
            />
          ) : (
            <div className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 ${
              isDark ? 'bg-white/5 border-white/10 text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <CarIcon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h4>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{KATEGORI_LABELS[car.kategori] ?? car.kategori} • {formatRupiah(Number(car.hargaPerHari))}/hari</p>
          </div>
        </div>

        {/* Notice Info */}
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200/90' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div className="space-y-1">
            <p className="font-medium">Ketentuan Penghapusan:</p>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              Jika armada belum pernah disewa, akan dihapus permanen. Jika pernah memiliki riwayat pesanan, armada akan dinonaktifkan secara aman agar histori transaksi tetap terjaga.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className={`flex-1 py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
              isDark ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 size={15} />
                <span>Ya, Hapus Armada</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CarCard({ car, onEdit, onDelete, onManageAvailability, isDark }: {
  car: Car;
  onEdit: () => void;
  onDelete?: () => void;
  onManageAvailability: () => void;
  isDark: boolean;
}) {
  const imageUrl = car.images?.[0]?.url;
  const totalPhotos = car.images?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      className={`group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-500 ${
        isDark
          ? 'sa-glass-dark border border-white/25 hover:border-white/40 shadow-2xl shadow-black/60'
          : 'sa-glass-light border border-white hover:border-white shadow-xl shadow-slate-900/10'
      }`}
    >
      {/* Garis highlight atas agar kartu tegas sejak awal (tanpa perlu hover) */}
      <div className={`pointer-events-none absolute top-0 left-4 right-4 h-px z-20 bg-gradient-to-r from-transparent to-transparent ${
        isDark ? 'via-white/25' : 'via-white'
      }`} />
      {/* Dynamic Specular Sheen Sweep on Hover */}
      <div className="absolute -inset-full top-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none z-30" />

      {/* 16:9 Landscape Media Frame */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-950/20 dark:bg-black/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={car.nama}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106"
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center ${
              isDark
                ? 'bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-black text-white/30'
                : 'bg-gradient-to-br from-slate-100/90 via-slate-200/80 to-slate-100 text-slate-400'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-2 backdrop-blur-xl ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white/40'
                  : 'bg-white/60 border-slate-300/80 text-slate-500 shadow-sm'
              }`}
            >
              <CarIcon size={28} />
            </div>
            <span className={`text-xs font-medium tracking-wide ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              Belum ada foto
            </span>
          </div>
        )}

        {/* Top Vignette Gradient for Badges Legibility */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/25 via-transparent to-transparent opacity-60" />

        {/* Floating Badges (Top Bar) */}
        <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 z-10">
          {/* Status & Approval Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status Operasional Pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border shadow-md ${
                car.status === 'tersedia'
                  ? isDark
                    ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200'
                    : 'bg-emerald-500/90 border-emerald-300/60 text-white shadow-emerald-950/20'
                  : car.status === 'maintenance'
                    ? isDark
                      ? 'bg-amber-500/25 border-amber-400/40 text-amber-200'
                      : 'bg-amber-500/90 border-amber-300/60 text-white shadow-amber-950/20'
                    : isDark
                      ? 'bg-zinc-800/80 border-white/20 text-zinc-300'
                      : 'bg-slate-800/90 border-slate-700/60 text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  car.status === 'tersedia'
                    ? 'bg-emerald-400 animate-pulse'
                    : car.status === 'maintenance'
                      ? 'bg-amber-400'
                      : 'bg-zinc-400'
                }`}
              />
              <span className="capitalize">{car.status}</span>
            </div>

            {/* Approval Badge */}
            {car.statusApproval === 'menunggu_persetujuan' && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-xl border shadow-sm ${
                  isDark
                    ? 'bg-amber-500/25 border-amber-400/40 text-amber-200'
                    : 'bg-amber-500/90 border-amber-300/60 text-white'
                }`}
              >
                Review
              </span>
            )}
            {car.statusApproval === 'ditolak' && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-xl border shadow-sm ${
                  isDark
                    ? 'bg-red-500/25 border-red-400/40 text-red-200'
                    : 'bg-red-500/90 border-red-300/60 text-white'
                }`}
              >
                Ditolak
              </span>
            )}
          </div>

          {/* Right Floating Corner: Photo count & quick action */}
          <div className="flex items-center gap-1.5">
            {totalPhotos > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl bg-black/45 border border-white/25 text-white shadow-md">
                <Camera size={11} className="text-white/80" />
                <span>{totalPhotos}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onManageAvailability}
              aria-label={`Kelola ketersediaan ${car.nama}`}
              title="Kelola Tanggal Ketersediaan"
              className="p-1.5 rounded-xl backdrop-blur-xl bg-black/45 hover:bg-amber-500/80 border border-white/25 text-white transition-all duration-200 hover:scale-110 active:scale-95 group/btn shadow-md"
            >
              <CalendarIcon size={13} className="transition-transform group-hover/btn:scale-110" />
            </button>
          </div>
        </div>
      </div>

      {/* Liquid Glass Info Section (Below the 16:9 Image) */}
      <div
        className={`relative p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3.5 backdrop-blur-2xl transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-white/[0.04] via-zinc-900/30 to-black/40 border-t border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
            : 'bg-gradient-to-b from-white/80 via-white/50 to-white/70 border-t border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]'
        }`}
      >
        <div>
          {/* Specification Pills with Glass Capsules */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5 text-[11px] font-medium">
            <span
              className={`px-2.5 py-0.5 rounded-lg border backdrop-blur-xl transition-all ${
                isDark
                  ? 'bg-white/[0.06] hover:bg-white/[0.1] border-white/15 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-white/75 hover:bg-white/95 border-white/90 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_4px_rgba(0,0,0,0.03)]'
              }`}
            >
              {KATEGORI_LABELS[car.kategori] ?? car.kategori}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-lg border capitalize backdrop-blur-xl transition-all ${
                isDark
                  ? 'bg-white/[0.06] hover:bg-white/[0.1] border-white/15 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-white/75 hover:bg-white/95 border-white/90 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_4px_rgba(0,0,0,0.03)]'
              }`}
            >
              {car.transmisi}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-lg border flex items-center gap-1 backdrop-blur-xl transition-all ${
                isDark
                  ? 'bg-white/[0.06] hover:bg-white/[0.1] border-white/15 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-white/75 hover:bg-white/95 border-white/90 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_4px_rgba(0,0,0,0.03)]'
              }`}
            >
              <Users size={11} className={isDark ? 'text-white/60' : 'text-slate-500'} />
              {car.kapasitasKursi} Kursi
            </span>
          </div>

          {/* Car Name */}
          <h3
            className={`font-bold text-base sm:text-lg tracking-tight leading-snug line-clamp-1 transition-colors ${
              isDark
                ? 'text-white group-hover:text-blue-400'
                : 'text-slate-900 group-hover:text-blue-600'
            }`}
          >
            {car.nama}
          </h3>

          {/* Nomor Plat Badge */}
          {car.nomorPlat && (
            <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-semibold tracking-widest w-fit ${
              isDark
                ? 'bg-zinc-800/60 border-zinc-600/40 text-zinc-300'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}>
              {car.nomorPlat}
            </span>
          )}

          {/* Rental Type Badge (Tinted Liquid Glass) */}
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium">
            {car.tipeSewa === 'lepas_kunci' ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border backdrop-blur-md font-semibold text-[11px] ${
                  isDark
                    ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                    : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-800 shadow-xs'
                }`}
              >
                <Key size={11} /> Lepas Kunci
              </span>
            ) : car.tipeSewa === 'dengan_sopir' ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border backdrop-blur-md font-semibold text-[11px] ${
                  isDark
                    ? 'bg-sky-500/10 border-sky-400/25 text-sky-300'
                    : 'bg-sky-500/15 border-sky-400/30 text-sky-800 shadow-xs'
                }`}
              >
                <UserCheck size={11} /> Dengan Sopir
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border backdrop-blur-md font-semibold text-[11px] ${
                  isDark
                    ? 'bg-amber-500/10 border-amber-400/25 text-amber-300'
                    : 'bg-amber-500/15 border-amber-400/30 text-amber-800 shadow-xs'
                }`}
              >
                Lepas Kunci / Sopir
              </span>
            )}
            {car.hargaSopirPerHari && car.tipeSewa !== 'lepas_kunci' && (
              <span className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                (+{formatRupiah(Number(car.hargaSopirPerHari))})
              </span>
            )}
          </div>
        </div>

        {/* Specular Liquid Glass Divider */}
        <div
          className={`w-full h-px ${
            isDark
              ? 'bg-gradient-to-r from-transparent via-white/15 to-transparent'
              : 'bg-gradient-to-r from-transparent via-slate-300/70 to-transparent'
          }`}
        />

          {/* Price & Action Button Row */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`text-[11px] font-medium mb-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Harga Sewa
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-extrabold text-base sm:text-xl tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  <span className="hidden sm:inline">{formatRupiah(Number(car.hargaPerHari))}</span>
                  <span className="inline sm:hidden">{formatCompactRupiah(Number(car.hargaPerHari))}</span>
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>/hari</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 shrink-0">
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label={`Hapus ${car.nama}`}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center backdrop-blur-xl active:scale-95 shadow-md ${
                    isDark
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/35'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                  }`}
                  title="Hapus Armada"
                >
                  <Trash2 size={13} />
                </button>
              )}

              {/* Liquid Glass Manage Button */}
              <button
                type="button"
                onClick={onEdit}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 backdrop-blur-xl active:scale-95 shadow-md ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/35 shadow-black/40 hover:shadow-white/5'
                    : 'bg-slate-950/90 hover:bg-slate-950 text-white border border-white/30 shadow-slate-900/25 hover:shadow-slate-900/40'
                }`}
              >
                <Pencil size={12} />
                <span>Kelola</span>
              </button>
            </div>
          </div>
      </div>
    </motion.div>
  );
}

export default function AdminArmadaPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [deletingCar, setDeletingCar] = useState<Car | null>(null);
  const [availabilityCar, setAvailabilityCar] = useState<Car | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-cars', page, debouncedSearch],
    queryFn: () => api.listAdminCars({ page, limit: 12, cari: debouncedSearch || undefined }),
  });

  const cars = data?.data;
  const pagination = data?.pagination;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Kelola Armada</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-xl shadow-lg transition-all ${
            isDark
              ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-white shadow-black/20 hover:shadow-black/30'
              : 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-white shadow-black/20 hover:shadow-black/30'
          }`}
        >
          <Plus size={18} />
          Tambah Mobil
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Cari nama mobil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20'
          }`}
        />
      </div>

      {/* List — skeleton grid menyerupai kartu armada 16:9 */}
      {isLoading ? (
        <SkeletonCarGrid count={6} isDark={isDark} />
      ) : isError ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 sm:py-20">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
          }`}>
            <CarIcon size={32} className="text-red-500" />
          </div>
          <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Gagal memuat armada</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Silakan refresh halaman</p>
        </motion.div>
      ) : !cars?.length ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center py-16 sm:py-20 rounded-3xl border ${getGlassCardClass(isDark)} ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'
          }`}>
            <CarIcon size={32} className={isDark ? 'text-white/20' : 'text-slate-300'} />
          </div>
          <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Belum ada mobil</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Klik "Tambah Mobil" untuk mulai</p>
        </motion.div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onEdit={() => setEditingCar(car)}
                onDelete={() => setDeletingCar(car)}
                onManageAvailability={() => setAvailabilityCar(car)}
                isDark={isDark}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`p-2 rounded-xl transition-all disabled:opacity-30 ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              <div className={`px-4 py-2 rounded-xl ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <span className="font-medium">{pagination.page}</span>
                <span className="mx-1">/</span>
                <span>{pagination.totalPages}</span>
                <span className="ml-2 text-xs opacity-60">({pagination.total} total)</span>
              </div>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className={`p-2 rounded-xl transition-all disabled:opacity-30 ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {editingCar && (
          <EditCarModal
            car={editingCar}
            onClose={() => setEditingCar(null)}
            isDark={isDark}
          />
        )}
        {availabilityCar && (
          <AvailabilityModal
            car={availabilityCar}
            onClose={() => setAvailabilityCar(null)}
            isDark={isDark}
          />
        )}
        {deletingCar && (
          <DeleteCarModal
            car={deletingCar}
            onClose={() => setDeletingCar(null)}
            onDeleted={() => setDeletingCar(null)}
          />
        )}
        {creating && (
          <CreateCarModal
            onClose={() => setCreating(false)}
            onCreated={() => { setCreating(false); }}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}