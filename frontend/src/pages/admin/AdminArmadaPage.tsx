import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Car as CarIcon, Plus, Trash2, ImagePlus, Pencil, X, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type Car, type Kategori, type Transmisi, type StatusMobil, type TipeSewa } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { supabase } from '../../lib/supabase';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getCarStatusConfig, getApprovalStatusConfig } from '../../lib/statusConfig';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const KATEGORI_LABELS: Record<string, string> = {
  city_car: 'City Car', hatchback: 'Hatchback', suv: 'SUV', mpv: 'MPV',
  minibus: 'Minibus', pickup: 'Pickup', mewah: 'Mewah', electric: 'Electric',
};

const KATEGORI_OPTIONS: Kategori[] = ['city_car', 'hatchback', 'suv', 'mpv', 'minibus', 'pickup', 'mewah', 'electric'];
const TRANSMISI_OPTIONS: Transmisi[] = ['manual', 'matic'];

// Cocok persis dengan limit yang dipasang di level bucket Supabase
// Storage (car-photos) — sebelumnya bucket ini TIDAK punya batas ukuran
// atau tipe file sama sekali. Pengecekan di sini cuma untuk UX (kasih
// tahu user instan, tanpa nunggu round-trip network gagal); penegakan
// sesungguhnya tetap di level storage, tidak bisa dilewati dari client.
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadCarPhoto(carId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${carId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('car-photos').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('car-photos').getPublicUrl(path);
  return data.publicUrl;
}

function PhotoManager({ car, isDark }: { car: Car; isDark: boolean }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteCarImage(car.id, imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-cars'] }),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Format file harus JPG, PNG, atau WebP');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Ukuran file maksimal 5MB');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadCarPhoto(car.id, file);
      await api.addCarImage(car.id, { url, urutan: (car.images ?? []).length });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className={`text-xs mb-2 block ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Foto</label>
      <div className="flex flex-wrap gap-2">
        {(car.images ?? []).map((img) => (
          <div key={img.id} className={`relative w-16 h-16 overflow-hidden border rounded-xl group ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <img src={img.url} alt="" className="object-cover w-full h-full" />
            <button
              onClick={() => deleteMutation.mutate(img.id)}
              disabled={deleteMutation.isPending}
              className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 bg-black/60 group-hover:opacity-100"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        ))}
        <label className={`flex items-center justify-center w-16 h-16 transition-colors border border-dashed rounded-xl cursor-pointer ${
          isDark ? 'border-white/20 hover:border-white/40 text-white/40' : 'border-slate-300 hover:border-slate-400 text-slate-400'
        }`}>
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ImagePlus size={16} />
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
      </div>
      {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
    </div>
  );
}

function EditCarModal({ car, onClose, isDark }: { car: Car; onClose: () => void; isDark: boolean }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusMobil>(car.status);
  const [tipeSewa, setTipeSewa] = useState<TipeSewa>(car.tipeSewa);
  const [hargaPerHari, setHargaPerHari] = useState(car.hargaPerHari);
  const [hargaSopirPerHari, setHargaSopirPerHari] = useState(car.hargaSopirPerHari ?? '');

  const mutation = useMutation({
    mutationFn: () => api.updateAdminCar(car.id, {
      status, tipeSewa, hargaPerHari: Number(hargaPerHari),
      hargaSopirPerHari: tipeSewa === 'lepas_kunci' ? null : hargaSopirPerHari ? Number(hargaSopirPerHari) : null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-cars'] }); onClose(); },
  });

  const inputClass = `w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all ${
    isDark
      ? 'bg-white/5 border border-white/15 text-white focus:border-white/30 focus:ring-2 focus:ring-blue-500/20 [&>option]:bg-[#0a0f1a]'
      : 'bg-white border border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 [&>option]:bg-white'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl p-5 sm:p-6 ${isDark ? 'login-card-dark' : 'login-card-light'}`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <PhotoManager car={car} isDark={isDark} />
          <div>
            <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusMobil)} className={inputClass}>
              <option value="tersedia">Tersedia</option>
              <option value="maintenance">Maintenance</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
          <div>
            <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Tipe Sewa</label>
            <select value={tipeSewa} onChange={(e) => setTipeSewa(e.target.value as TipeSewa)} className={inputClass}>
              <option value="lepas_kunci">Lepas Kunci</option>
              <option value="dengan_sopir">Dengan Sopir</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Harga/Hari (Rp)</label>
              <input type="number" value={hargaPerHari} onChange={(e) => setHargaPerHari(e.target.value)} className={inputClass} />
            </div>
            {tipeSewa !== 'lepas_kunci' && (
              <div>
                <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Harga Sopir (Rp)</label>
                <input type="number" value={hargaSopirPerHari} onChange={(e) => setHargaSopirPerHari(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>
          {mutation.isError && <p className={`text-xs rounded-lg p-3 ${
            isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>Gagal menyimpan.</p>}
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className={`w-full px-4 py-3 font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white shadow-black/20'
                : 'bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white shadow-black/20'
            }`}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Simpan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateCarModal({ onClose, onCreated, isDark }: { onClose: () => void; onCreated: (car: Car) => void; isDark: boolean }) {
  const queryClient = useQueryClient();
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<Kategori>('city_car');
  const [transmisi, setTransmisi] = useState<Transmisi>('manual');
  const [tipeSewa, setTipeSewa] = useState<TipeSewa>('lepas_kunci');
  const [kapasitasKursi, setKapasitasKursi] = useState('5');
  const [hargaPerHari, setHargaPerHari] = useState('');
  const [hargaSopirPerHari, setHargaSopirPerHari] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.createAdminCar({
      nama, kategori, transmisi, tipeSewa, kapasitasKursi: Number(kapasitasKursi),
      hargaPerHari: Number(hargaPerHari),
      hargaSopirPerHari: tipeSewa === 'lepas_kunci' ? null : hargaSopirPerHari ? Number(hargaSopirPerHari) : null,
      status: 'tersedia', deskripsi: deskripsi || undefined,
    }),
    onSuccess: (car) => { queryClient.invalidateQueries({ queryKey: ['admin-cars'] }); onCreated(car); },
  });

  const butuhHargaSopir = tipeSewa !== 'lepas_kunci';

  const handleSubmit = () => {
    setFormError(null);
    if (!nama.trim() || !hargaPerHari || !kapasitasKursi) {
      setFormError('Lengkapi nama, kapasitas kursi, dan harga');
      return;
    }
    if (butuhHargaSopir && !hargaSopirPerHari) {
      setFormError('Harga sopir wajib untuk tipe sewa ini');
      return;
    }
    mutation.mutate();
  };

  const inputClass = `w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all ${
    isDark
      ? 'bg-white/5 border border-white/15 text-white focus:border-white/30 focus:ring-2 focus:ring-blue-500/20 [&>option]:bg-[#0a0f1a]'
      : 'bg-white border border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 [&>option]:bg-white'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl p-5 sm:p-6 my-10 ${isDark ? 'login-card-dark' : 'login-card-light'}`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tambah Mobil</h3>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Nama Mobil</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Toyota Avanza 2023" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Kategori</label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value as Kategori)} className={inputClass}>
                {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{KATEGORI_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Transmisi</label>
              <select value={transmisi} onChange={(e) => setTransmisi(e.target.value as Transmisi)} className={inputClass}>
                {TRANSMISI_OPTIONS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Tipe Sewa</label>
            <select value={tipeSewa} onChange={(e) => setTipeSewa(e.target.value as TipeSewa)} className={inputClass}>
              <option value="lepas_kunci">Lepas Kunci</option>
              <option value="dengan_sopir">Dengan Sopir</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Kapasitas Kursi</label>
              <input type="number" value={kapasitasKursi} onChange={(e) => setKapasitasKursi(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Harga/Hari (Rp)</label>
              <input type="number" value={hargaPerHari} onChange={(e) => setHargaPerHari(e.target.value)} className={inputClass} />
            </div>
          </div>
          {butuhHargaSopir && (
            <div>
              <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Harga Sopir/Hari (Rp)</label>
              <input type="number" value={hargaSopirPerHari} onChange={(e) => setHargaSopirPerHari(e.target.value)} className={inputClass} />
            </div>
          )}
          <div>
            <label className={`text-sm mb-1.5 block ${isDark ? 'text-white/70' : 'text-slate-700'}`}>Deskripsi (opsional)</label>
            <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
          </div>
          {(formError || mutation.isError) && (
            <p className={`text-xs rounded-lg p-3 ${
              isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
            }`}>{formError ?? 'Gagal membuat mobil.'}</p>
          )}
          <button onClick={handleSubmit} disabled={mutation.isPending}
            className={`w-full px-4 py-3 font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white shadow-black/20'
                : 'bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white shadow-black/20'
            }`}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Buat & Lanjut Tambah Foto
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CarCard({ car, onEdit, isDark }: { car: Car; onEdit: () => void; isDark: boolean }) {
  const statusCfg = getCarStatusConfig(car.status, isDark);
  const approvalCfg = getApprovalStatusConfig(car.statusApproval ?? 'disetujui', isDark);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`group rounded-2xl overflow-hidden transition-all duration-300 ${getGlassCardClass(isDark)}`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className={`w-full sm:w-40 h-40 sm:h-auto flex items-center justify-center overflow-hidden ${
          isDark ? 'bg-gradient-to-br from-[#0d1424] to-[#0a0f1a]' : 'bg-gradient-to-br from-slate-100 to-slate-50'
        }`}>
          {car.images?.[0]?.url ? (
            <img src={car.images[0].url} alt={car.nama} className="w-full h-full object-cover" />
          ) : (
            <CarIcon size={48} className={isDark ? 'text-white/20' : 'text-slate-300'} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className={`font-semibold text-sm sm:text-base mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{KATEGORI_LABELS[car.kategori] ?? car.kategori} • {car.transmisi}</p>
            </div>
            <button
              onClick={onEdit}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Pencil size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${statusCfg.bg}`}>{statusCfg.label}</span>
            <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${approvalCfg.bg}`}>{approvalCfg.label}</span>
            <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${isDark ? 'bg-white/5 text-white/50' : 'bg-slate-100 text-slate-500'}`}>{car.kapasitasKursi} Kursi</span>
          </div>

          <div className="flex items-center justify-between">
            <p className={`font-bold text-sm sm:text-base ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{formatRupiah(Number(car.hargaPerHari))}/hari</p>
            {car.tipeSewa !== 'lepas_kunci' && (
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>+Sopir</p>
            )}
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

      {/* List */}
      {isLoading ? (
        <SkeletonList count={4} />
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center py-16 sm:py-20 rounded-2xl ${getGlassCardClass(isDark)}`}>
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
              <CarCard key={car.id} car={car} onEdit={() => setEditingCar(car)} isDark={isDark} />
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
        {editingCar && <EditCarModal car={editingCar} onClose={() => setEditingCar(null)} isDark={isDark} />}
        {creating && (
          <CreateCarModal
            onClose={() => setCreating(false)}
            onCreated={(car) => { setCreating(false); setEditingCar(car); }}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}