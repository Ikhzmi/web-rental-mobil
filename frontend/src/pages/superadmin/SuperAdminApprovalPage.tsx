import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Building2,
  Users,
  Gauge,
  KeyRound,
  Calendar,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Car,
  ShieldAlert,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  X,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { SuperAdminCar } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../contexts/ToastContext';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const KATEGORI_LABELS: Record<string, string> = {
  city_car: 'City Car',
  hatchback: 'Hatchback',
  suv: 'SUV',
  mpv: 'MPV',
  minibus: 'Minibus',
  pickup: 'Pickup',
  mewah: 'Mewah',
  electric: 'Electric',
};

const TIPE_SEWA_LABELS: Record<string, string> = {
  lepas_kunci: 'Lepas Kunci',
  dengan_sopir: 'Dengan Sopir',
  keduanya: 'Lepas Kunci & Sopir',
};

const STATUS_MOBIL_LABELS: Record<string, { label: string; bg: string }> = {
  tersedia: {
    label: 'Tersedia',
    bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  nonaktif: {
    label: 'Nonaktif',
    bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
};

const PRESET_REASONS = [
  'Foto kendaraan kurang jelas atau buram',
  'Harga sewa harian tidak sesuai standar pasar',
  'Kategori atau tipe transmisi tidak sesuai',
  'Data spesifikasi kendaraan tidak lengkap',
  'Deskripsi kendaraan tidak memadai',
];

const PRESET_TAKEDOWN_REASONS = [
  'Laporan ketidaksesuaian unit fisik atau dokumen armada',
  'Harga sewa harian terindikasi tidak wajar / merugikan konsumen',
  'Foto armada melanggar hak cipta atau tidak representatif',
  'Pelanggaran standar operasional prosedur (SOP) platform',
  'Akun instansi rental dalam peninjauan / dibekukan sementara',
];

// ============================================================================
// MODAL: TAKEDOWN ARMADA
// ============================================================================
function TakedownModal({
  car,
  onClose,
  onConfirm,
  isDark,
  isProcessing,
}: {
  car: SuperAdminCar;
  onClose: () => void;
  onConfirm: (alasan: string) => void;
  isDark: boolean;
  isProcessing: boolean;
}) {
  const [alasan, setAlasan] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasan.trim()) return;
    onConfirm(alasan.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${
          isDark
            ? 'bg-zinc-900/95 border-rose-500/20 text-white shadow-rose-950/20'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Takedown Armada</h3>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                {car.nama} {car.nomorPlat ? `(${car.nomorPlat})` : ''} • <span className="font-semibold">{car.instansi?.namaInstansi}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-rose-400 shrink-0 mt-0.5" />
          <p className={`text-xs leading-relaxed ${isDark ? 'text-rose-200' : 'text-rose-800'}`}>
            Armada ini akan segera dicabut dari katalog publik. Pengguna tidak akan dapat mencari atau memesan unit ini hingga Anda memulihkannya kembali.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Pilih Alasan Takedown:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_TAKEDOWN_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAlasan(preset)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border text-left transition-all ${
                    alasan === preset
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm font-medium'
                      : isDark
                        ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
              Keterangan Tambahan:
            </label>
            <textarea
              rows={3}
              required
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Jelaskan alasan spesifik mengapa armada ini ditakedown agar instansi dapat memperbaikinya..."
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs resize-none focus:outline-none transition-all ${
                isDark
                  ? 'bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:border-rose-500/50'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400'
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!alasan.trim() || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-600/25 transition-all"
            >
              <ShieldAlert size={15} />
              {isProcessing ? 'Memproses...' : 'Konfirmasi Takedown'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// CARD: APPROVAL QUEUE ITEM
// ============================================================================
function ApprovalCard({
  car,
  index,
  onApprove,
  onReject,
  isDark,
  isProcessing,
}: {
  car: SuperAdminCar;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string, alasan: string) => void;
  isDark: boolean;
  isProcessing: boolean;
}) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const images = car.images && car.images.length > 0 ? car.images : [];
  const currentImg = images[selectedImgIndex]?.url;

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    onReject(car.id, rejectReason.trim());
    setShowRejectDialog(false);
  };

  const formattedDate = new Date(car.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`group rounded-3xl overflow-hidden transition-all duration-300 border ${getGlassCardClass(isDark)} ${
        isDark
          ? 'border-white/10 hover:border-white/20 shadow-xl shadow-black/40'
          : 'border-slate-200/80 hover:border-slate-300 shadow-xl shadow-slate-900/5'
      }`}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Image Showcase with Badges */}
        <div className="lg:w-[380px] xl:w-[420px] p-5 flex flex-col justify-between">
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-950/40 border border-white/10 shadow-inner group/img">
            {currentImg ? (
              <img
                src={currentImg}
                alt={car.nama}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                <ImageIcon size={44} className="mb-2" />
                <span className="text-xs">Foto belum diunggah</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md bg-black/60 text-white border border-white/15 shadow-sm">
                <Building2 size={12} className="text-amber-400" />
                <span className="truncate max-w-[150px]">{car.instansi?.namaInstansi ?? 'Rental'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-amber-500/80 text-white border border-amber-400/30 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Menunggu Review
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-white/20 text-white border border-white/20">
                  {KATEGORI_LABELS[car.kategori] ?? car.kategori}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-white/20 text-white border border-white/20 uppercase">
                  {car.transmisi}
                </span>
              </div>

              {images.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white/90 backdrop-blur-sm">
                  {selectedImgIndex + 1}/{images.length}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                  aria-label="Foto sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                  aria-label="Foto selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  onClick={() => setSelectedImgIndex(i)}
                  className={`relative w-14 h-11 rounded-lg overflow-hidden shrink-0 border transition-all ${
                    selectedImgIndex === i
                      ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                      : 'border-white/15 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Car Details & Action Center */}
        <div className="flex-1 p-5 lg:pl-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {car.nama}
                  </h3>
                  {car.nomorPlat && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white/10 dark:bg-white/10 border border-white/20 tracking-wider">
                      {car.nomorPlat}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1.5 flex-wrap ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  <span>Diajukan oleh <strong className={isDark ? 'text-white/80' : 'text-slate-700'}>{car.instansi?.namaInstansi}</strong></span>
                  <span className="opacity-40">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} className="opacity-70" />
                    {formattedDate}
                  </span>
                </p>
              </div>

              <div className="sm:text-right">
                <span className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formatRupiah(Number(car.hargaPerHari))}
                </span>
                <span className={`text-xs ml-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>/ hari</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Users size={14} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Kapasitas</span>
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {car.kapasitasKursi} Penumpang
                </p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <KeyRound size={14} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Tipe Sewa</span>
                </div>
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {TIPE_SEWA_LABELS[car.tipeSewa] ?? car.tipeSewa}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Gauge size={14} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Transmisi</span>
                </div>
                <p className={`text-sm font-semibold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {car.transmisi}
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border mb-4 flex items-start gap-3 ${
              isDark ? 'bg-white/[0.02] border-white/5 text-white/70' : 'bg-slate-50/50 border-slate-200/60 text-slate-600'
            }`}>
              <HelpCircle size={16} className={`shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-white/90 dark:text-white">Instansi Pemilik: </span>
                <span>{car.instansi?.namaInstansi}</span>
                <span className="mx-2 opacity-40">•</span>
                <span>Pastikan foto beresolusi tajam, plat & bodi bersih, serta harga sewa proporsional sebelum disetujui.</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onApprove(car.id)}
              disabled={isProcessing}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={18} />
              Setujui & Publikasikan
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRejectDialog((v) => !v)}
              disabled={isProcessing}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold border transition-all ${
                showRejectDialog
                  ? 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/20'
                  : isDark
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle size={18} />
              Tolak Pengajuan
            </motion.button>
          </div>

          <AnimatePresence>
            {showRejectDialog && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mt-4 pt-4 border-t border-rose-500/20"
              >
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-rose-500/[0.04] border-rose-500/20' : 'bg-rose-50/60 border-rose-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2 text-rose-500 dark:text-rose-400 font-semibold text-xs uppercase tracking-wider">
                    <AlertCircle size={14} />
                    Alasan Penolakan Armada
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {PRESET_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                          rejectReason === preset
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : isDark
                              ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Tulis alasan penolakan secara jelas untuk admin instansi..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none focus:outline-none transition-all ${
                      isDark
                        ? 'bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:border-rose-500/50'
                        : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400'
                    }`}
                  />

                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectDialog(false);
                        setRejectReason('');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                        isDark ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={!rejectReason.trim() || isProcessing}
                      onClick={handleConfirmReject}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-600/20 transition-all"
                    >
                      Kirim & Tolak Mobil
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// CARD: PUBLISHED CAR ITEM (DENGAN TOMBOL TAKEDOWN)
// ============================================================================
function PublishedCarCard({
  car,
  index,
  onTakedown,
  isDark,
}: {
  car: SuperAdminCar;
  index: number;
  onTakedown: (car: SuperAdminCar) => void;
  isDark: boolean;
}) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  const images = car.images && car.images.length > 0 ? car.images : [];
  const currentImg = images[selectedImgIndex]?.url;

  const statusConfig = STATUS_MOBIL_LABELS[car.status] ?? {
    label: car.status,
    bg: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  const bookingCount = car._count?.bookings ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`group rounded-3xl overflow-hidden transition-all duration-300 border ${getGlassCardClass(isDark)} ${
        isDark
          ? 'border-white/10 hover:border-white/20 shadow-xl shadow-black/40'
          : 'border-slate-200/80 hover:border-slate-300 shadow-xl shadow-slate-900/5'
      }`}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Image Showcase */}
        <div className="lg:w-[380px] xl:w-[420px] p-5 flex flex-col justify-between">
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-950/40 border border-white/10 shadow-inner group/img">
            {currentImg ? (
              <img
                src={currentImg}
                alt={car.nama}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                <ImageIcon size={44} className="mb-2" />
                <span className="text-xs">Foto belum diunggah</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md bg-black/60 text-white border border-white/15 shadow-sm">
                <Building2 size={12} className="text-amber-400" />
                <span className="truncate max-w-[150px]">{car.instansi?.namaInstansi ?? 'Rental'}</span>
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-md ${statusConfig.bg}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {statusConfig.label}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-white/20 text-white border border-white/20">
                  {KATEGORI_LABELS[car.kategori] ?? car.kategori}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-white/20 text-white border border-white/20 uppercase">
                  {car.transmisi}
                </span>
              </div>

              {bookingCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-emerald-500/80 text-white border border-emerald-400/30">
                  {bookingCount}x disewa
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                  aria-label="Foto sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                  aria-label="Foto selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  onClick={() => setSelectedImgIndex(i)}
                  className={`relative w-14 h-11 rounded-lg overflow-hidden shrink-0 border transition-all ${
                    selectedImgIndex === i
                      ? 'border-emerald-400 ring-2 ring-emerald-400/30 scale-105'
                      : 'border-white/15 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Car Details & Action Center */}
        <div className="flex-1 p-5 lg:pl-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {car.nama}
                  </h3>
                  {car.nomorPlat && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white/10 dark:bg-white/10 border border-white/20 tracking-wider">
                      {car.nomorPlat}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 size={11} />
                    Tayang di Katalog
                  </span>
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1.5 flex-wrap ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  <span>Instansi: <strong className={isDark ? 'text-white/80' : 'text-slate-700'}>{car.instansi?.namaInstansi}</strong></span>
                  <span className="opacity-40">•</span>
                  <span>ID: <code className="text-[11px] font-mono opacity-70">{car.id.slice(0, 8)}</code></span>
                </p>
              </div>

              <div className="sm:text-right">
                <span className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formatRupiah(Number(car.hargaPerHari))}
                </span>
                <span className={`text-xs ml-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>/ hari</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Users size={14} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Kapasitas</span>
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {car.kapasitasKursi} Kursi
                </p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <KeyRound size={14} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Tipe Sewa</span>
                </div>
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {TIPE_SEWA_LABELS[car.tipeSewa] ?? car.tipeSewa}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Gauge size={14} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Transmisi</span>
                </div>
                <p className={`text-sm font-semibold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {car.transmisi}
                </p>
              </div>
            </div>

            {car.deskripsi && (
              <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                {car.deskripsi}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              to={`/armada/${car.id}`}
              state={{ from: '/superadmin/armada', fromLabel: 'Kelola Armada Super Admin' }}
              className={`w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold border transition-all ${
                isDark
                  ? 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <ExternalLink size={15} />
              Lihat di Katalog Publik
            </Link>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTakedown(car)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all shadow-sm shadow-rose-500/10"
            >
              <ShieldAlert size={15} />
              Takedown Armada
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// CARD: TAKEDOWN / REJECTED CAR ITEM (DENGAN TOMBOL PULIHKAN)
// ============================================================================
function TakedownCarCard({
  car,
  index,
  onRestore,
  isDark,
  isProcessing,
}: {
  car: SuperAdminCar;
  index: number;
  onRestore: (id: string) => void;
  isDark: boolean;
  isProcessing: boolean;
}) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  const images = car.images && car.images.length > 0 ? car.images : [];
  const currentImg = images[selectedImgIndex]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`group rounded-3xl overflow-hidden transition-all duration-300 border ${getGlassCardClass(isDark)} ${
        isDark
          ? 'border-rose-500/20 hover:border-rose-500/30 shadow-xl shadow-black/40'
          : 'border-rose-200 hover:border-rose-300 shadow-xl shadow-slate-900/5'
      }`}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Image Showcase */}
        <div className="lg:w-[380px] xl:w-[420px] p-5 flex flex-col justify-between">
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-950/40 border border-white/10 shadow-inner group/img grayscale-[40%] hover:grayscale-0 transition-all">
            {currentImg ? (
              <img
                src={currentImg}
                alt={car.nama}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                <ImageIcon size={44} className="mb-2" />
                <span className="text-xs">Foto belum diunggah</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md bg-black/60 text-white border border-white/15 shadow-sm">
                <Building2 size={12} className="text-amber-400" />
                <span className="truncate max-w-[150px]">{car.instansi?.namaInstansi ?? 'Rental'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-rose-600/90 text-white border border-rose-400/40 shadow-md">
                <ShieldAlert size={12} />
                Ditakedown / Ditolak
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-white/20 text-white border border-white/20">
                  {KATEGORI_LABELS[car.kategori] ?? car.kategori}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md bg-white/20 text-white border border-white/20 uppercase">
                  {car.transmisi}
                </span>
              </div>

              {images.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white/90 backdrop-blur-sm">
                  {selectedImgIndex + 1}/{images.length}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                  aria-label="Foto sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                  aria-label="Foto selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  onClick={() => setSelectedImgIndex(i)}
                  className={`relative w-14 h-11 rounded-lg overflow-hidden shrink-0 border transition-all ${
                    selectedImgIndex === i
                      ? 'border-rose-400 ring-2 ring-rose-400/30 scale-105'
                      : 'border-white/15 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Restore Action */}
        <div className="flex-1 p-5 lg:pl-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-rose-500/20">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {car.nama}
                  </h3>
                  {car.nomorPlat && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white/10 dark:bg-white/10 border border-white/20 tracking-wider">
                      {car.nomorPlat}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1.5 flex-wrap ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  <span>Pemilik: <strong className={isDark ? 'text-white/80' : 'text-slate-700'}>{car.instansi?.namaInstansi}</strong></span>
                  <span className="opacity-40">•</span>
                  <span>Tarif: {formatRupiah(Number(car.hargaPerHari))}/hari</span>
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 w-fit">
                <ShieldAlert size={14} />
                Tidak Tayang
              </span>
            </div>

            {/* Reason Box */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 my-4">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider mb-1.5">
                <AlertCircle size={14} />
                Alasan Takedown / Penolakan:
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-rose-200' : 'text-rose-900'}`}>
                {car.alasanPenolakan || 'Tidak ada alasan spesifik yang dicantumkan saat penonaktifan.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[11px] block ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Kategori</span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {KATEGORI_LABELS[car.kategori] ?? car.kategori}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[11px] block ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Kapasitas</span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {car.kapasitasKursi} Kursi
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[11px] block ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Tipe Sewa</span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {TIPE_SEWA_LABELS[car.tipeSewa] ?? car.tipeSewa}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRestore(car.id)}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={15} />
              Pulihkan Armada (Aktifkan Kembali)
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT: SUPER ADMIN ARMADA (TABBED)
// ============================================================================
export default function SuperAdminApprovalPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'approval' | 'published' | 'takedown') || 'approval';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstansiId, setSelectedInstansiId] = useState<string>('all');
  const [takedownTargetCar, setTakedownTargetCar] = useState<SuperAdminCar | null>(null);

  const handleTabChange = (tab: 'approval' | 'published' | 'takedown') => {
    setSearchParams({ tab });
  };

  // Queries
  const { data: approvalCars, isLoading: isApprovalLoading } = useQuery({
    queryKey: ['superadmin-approval-cars'],
    queryFn: () => api.listApprovalCars(),
  });

  const { data: publishedCars, isLoading: isPublishedLoading } = useQuery({
    queryKey: ['superadmin-published-cars'],
    queryFn: () => api.listPublishedCars(),
  });

  const { data: takedownCars, isLoading: isTakedownLoading } = useQuery({
    queryKey: ['superadmin-takedown-cars'],
    queryFn: () => api.listTakedownCars(),
  });

  const { data: instansiList } = useQuery({
    queryKey: ['superadmin-instansi-filter-list'],
    queryFn: () => api.listInstansi(),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveCar(id, 'approve'),
    onSuccess: (data) => {
      showToast('success', 'Disetujui', `Armada "${data.nama}" berhasil disetujui dan tayang di katalog`);
      queryClient.invalidateQueries({ queryKey: ['superadmin-approval-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-published-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    },
    onError: () => {
      showToast('error', 'Gagal', 'Gagal menyetujui armada');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      api.approveCar(id, 'reject', alasan),
    onSuccess: () => {
      showToast('success', 'Ditolak', 'Pengajuan armada berhasil ditolak');
      queryClient.invalidateQueries({ queryKey: ['superadmin-approval-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-takedown-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    },
    onError: () => {
      showToast('error', 'Gagal', 'Gagal menolak armada');
    },
  });

  const takedownMutation = useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      api.takedownCar(id, alasan),
    onSuccess: (res) => {
      showToast('success', 'Takedown Berhasil', res.message || 'Armada berhasil ditakedown');
      setTakedownTargetCar(null);
      queryClient.invalidateQueries({ queryKey: ['superadmin-published-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-takedown-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    },
    onError: () => {
      showToast('error', 'Gagal', 'Gagal mentakedown armada');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreCar(id),
    onSuccess: (res) => {
      showToast('success', 'Pemulihan Berhasil', res.message || 'Armada berhasil dipulihkan');
      queryClient.invalidateQueries({ queryKey: ['superadmin-published-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-takedown-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    },
    onError: () => {
      showToast('error', 'Gagal', 'Gagal memulihkan armada');
    },
  });

  // Filtered lists
  const filterCar = (car: SuperAdminCar) => {
    if (selectedInstansiId !== 'all' && car.instansi?.id !== selectedInstansiId) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      car.nama.toLowerCase().includes(q) ||
      (car.nomorPlat && car.nomorPlat.toLowerCase().includes(q)) ||
      car.instansi?.namaInstansi.toLowerCase().includes(q) ||
      car.kategori.toLowerCase().includes(q)
    );
  };

  const pendingList = (approvalCars ?? []).filter(filterCar);
  const activePublishedList = (publishedCars ?? []).filter(filterCar);
  const inactiveTakedownList = (takedownCars ?? []).filter(filterCar);

  const pendingCount = approvalCars?.length ?? 0;
  const publishedCount = publishedCars?.length ?? 0;
  const takedownCount = takedownCars?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Kelola Armada & Moderasi
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>
            Tinjau persetujuan armada baru, audit armada yang aktif di katalog publik, dan kelola penonaktifan/takedown.
          </p>
        </div>

        {/* Quick summary pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl border shadow-sm ${
            isDark ? 'bg-white/5 text-white/80 border-white/10' : 'bg-white text-slate-700 border-slate-200'
          }`}>
            <Layers size={14} className="text-amber-400" />
            <span>Total: {pendingCount + publishedCount + takedownCount} armada</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-white/10 dark:border-white/10">
        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-xl overflow-x-auto ${
          isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'
        }`}>
          {/* Tab 1: Antrean Approval */}
          <button
            type="button"
            onClick={() => handleTabChange('approval')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'approval'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : isDark
                  ? 'text-white/70 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Clock size={15} />
            <span>Antrean Approval</span>
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'approval' ? 'bg-white text-amber-600' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          {/* Tab 2: Armada Tayang */}
          <button
            type="button"
            onClick={() => handleTabChange('published')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'published'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : isDark
                  ? 'text-white/70 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Car size={15} />
            <span>Armada Tayang</span>
            {publishedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'published' ? 'bg-white text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {publishedCount}
              </span>
            )}
          </button>

          {/* Tab 3: Ditakedown */}
          <button
            type="button"
            onClick={() => handleTabChange('takedown')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'takedown'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                : isDark
                  ? 'text-white/70 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <ShieldAlert size={15} />
            <span>Ditakedown / Ditolak</span>
            {takedownCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'takedown' ? 'bg-white text-rose-700' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {takedownCount}
              </span>
            )}
          </button>
        </div>

        {/* Instansi Filter Selector */}
        {instansiList && instansiList.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 size={16} className={isDark ? 'text-white/40' : 'text-slate-400'} />
            <select
              value={selectedInstansiId}
              onChange={(e) => setSelectedInstansiId(e.target.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none transition-all ${
                isDark
                  ? 'bg-white/[0.04] border border-white/10 text-white focus:border-white/30'
                  : 'bg-white border border-slate-200 text-slate-900 focus:border-slate-300'
              }`}
            >
              <option value="all">Semua Instansi Rental</option>
              {instansiList.map((inst) => (
                <option key={inst.id} value={inst.id} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-900'}>
                  {inst.namaInstansi}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search Bar Filter */}
      <div className="relative">
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Cari nama mobil, kategori, atau instansi rental..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/20'
              : 'bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#8b7355]/50 focus:ring-2 focus:ring-[#8b7355]/20'
          }`}
        />
      </div>

      {/* Tab Contents */}
      {activeTab === 'approval' && (
        <>
          {isApprovalLoading ? (
            <SkeletonList count={3} isDark={isDark} />
          ) : !pendingList.length ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-center py-20 rounded-3xl ${getGlassCardClass(isDark)} border ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl border ${
                isDark
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}>
                <CheckCircle2 size={38} />
              </div>
              <p className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Semua Antrean Telah Ditinjau
              </p>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                {searchQuery ? 'Tidak ada mobil antrean yang cocok dengan pencarian Anda.' : 'Tidak ada pengajuan mobil baru yang menunggu persetujuan saat ini.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {pendingList.map((car, i) => (
                <ApprovalCard
                  key={car.id}
                  car={car}
                  index={i}
                  isDark={isDark}
                  isProcessing={approveMutation.isPending || rejectMutation.isPending}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id, alasan) => rejectMutation.mutate({ id, alasan })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'published' && (
        <>
          {isPublishedLoading ? (
            <SkeletonList count={3} isDark={isDark} />
          ) : !activePublishedList.length ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-center py-20 rounded-3xl ${getGlassCardClass(isDark)} border ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white/40'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <Car size={38} />
              </div>
              <p className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Tidak Ada Armada Tayang
              </p>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                {searchQuery ? 'Tidak ada armada aktif yang cocok dengan kriteria pencarian.' : 'Belum ada armada yang berstatus disetujui dan aktif di katalog publik.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {activePublishedList.map((car, i) => (
                <PublishedCarCard
                  key={car.id}
                  car={car}
                  index={i}
                  isDark={isDark}
                  onTakedown={(c) => setTakedownTargetCar(c)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'takedown' && (
        <>
          {isTakedownLoading ? (
            <SkeletonList count={3} isDark={isDark} />
          ) : !inactiveTakedownList.length ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-center py-20 rounded-3xl ${getGlassCardClass(isDark)} border ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl border ${
                isDark
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                <ShieldAlert size={38} />
              </div>
              <p className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Tidak Ada Armada yang Ditakedown
              </p>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                {searchQuery ? 'Tidak ada armada ditakedown yang cocok dengan pencarian.' : 'Semua armada di platform dalam kondisi bersih tanpa sanksi takedown atau penolakan.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {inactiveTakedownList.map((car, i) => (
                <TakedownCarCard
                  key={car.id}
                  car={car}
                  index={i}
                  isDark={isDark}
                  isProcessing={restoreMutation.isPending}
                  onRestore={(id) => restoreMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Takedown Confirmation Modal */}
      <AnimatePresence>
        {takedownTargetCar && (
          <TakedownModal
            car={takedownTargetCar}
            isDark={isDark}
            isProcessing={takedownMutation.isPending}
            onClose={() => setTakedownTargetCar(null)}
            onConfirm={(alasan) => takedownMutation.mutate({ id: takedownTargetCar.id, alasan })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
