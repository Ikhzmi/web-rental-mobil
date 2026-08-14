import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Percent,
  Users,
  Car,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Instansi, StatusInstansi } from '../../lib/api';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getInstansiStatusConfig } from '../../lib/statusConfig';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

// Status labels for filter display
const INSTANSI_STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  menunggu_verifikasi: 'Menunggu',
  nonaktif: 'Nonaktif',
};

function StatusBadge({ status, isDark }: { status: StatusInstansi; isDark: boolean }) {
  const config = getInstansiStatusConfig(status, isDark);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border ${config.bg}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
}

// Form input component - matches dashboard style
function FormField({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  dark,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  dark: boolean;
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${dark ? 'text-white/60' : 'text-slate-600'}`}>
        <Icon size={13} />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
          dark
            ? 'bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/20'
            : 'bg-slate-50/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:border-[#8b7355]/50 focus:ring-[#8b7355]/20'
        }`}
      />
    </div>
  );
}

// Form textarea component
function FormArea({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  dark,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  dark: boolean;
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${dark ? 'text-white/60' : 'text-slate-600'}`}>
        <Icon size={13} />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        required={required}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 resize-none ${
          dark
            ? 'bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/20'
            : 'bg-slate-50/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:border-[#8b7355]/50 focus:ring-[#8b7355]/20'
        }`}
      />
    </div>
  );
}

function CreateInstansiModal({ onClose, onSuccess, isDark }: { onClose: () => void; onSuccess: () => void; isDark: boolean }) {
  const [form, setForm] = useState({
    namaInstansi: '',
    alamat: '',
    noHpPic: '',
    emailPic: '',
    rekeningBank: '',
    komisiPlatformPersen: 10,
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: api.createInstansi,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.message ?? 'Gagal membuat instansi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      ...form,
      rekeningBank: form.rekeningBank || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl overflow-hidden ${
          isDark
            ? 'login-card-dark'
            : 'login-card-light'
        }`}
      >
        {/* Header */}
        <div className={`relative px-6 py-5 ${isDark ? 'border-b border-white/10' : 'border-b border-[#D4CFC7]/40'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-white/10' : 'bg-[#f5ebe0]'
            }`}>
              <Building2 size={22} className={isDark ? 'text-white' : 'text-[#6b5545]'} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Tambah Instansi Baru
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Daftarkan rental baru ke platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${
              isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
                isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {/* Nama Instansi */}
          <FormField
            label="Nama Instansi"
            icon={Building2}
            value={form.namaInstansi}
            onChange={(val) => setForm({ ...form, namaInstansi: val })}
            placeholder="PT Rental Mobil Sejahtera"
            required
            dark={isDark}
          />

          {/* Alamat */}
          <FormArea
            label="Alamat Lengkap"
            icon={MapPin}
            value={form.alamat}
            onChange={(val) => setForm({ ...form, alamat: val })}
            placeholder="Jl. Sudirman No. 123, RT/RW 001/002, Kel. Sudirman, Kec. Menteng, Jakarta Pusat"
            required
            rows={2}
            dark={isDark}
          />

          {/* Contact Grid */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="No. HP PIC"
              icon={Phone}
              type="tel"
              value={form.noHpPic}
              onChange={(val) => setForm({ ...form, noHpPic: val })}
              placeholder="081234567890"
              required
              dark={isDark}
            />
            <FormField
              label="Email PIC"
              icon={Mail}
              type="email"
              value={form.emailPic}
              onChange={(val) => setForm({ ...form, emailPic: val })}
              placeholder="admin@rental.com"
              required
              dark={isDark}
            />
          </div>

          {/* Rekening */}
          <FormField
            label="Nomor Rekening"
            icon={CreditCard}
            value={form.rekeningBank}
            onChange={(val) => setForm({ ...form, rekeningBank: val })}
            placeholder="BCA - 1234567890 (opsional)"
            dark={isDark}
          />

          {/* Komisi Slider */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              <Percent size={13} />
              Komisi Platform
              <span className="text-red-400">*</span>
            </label>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {form.komisiPlatformPersen}%
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  dari setiap transaksi
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={form.komisiPlatformPersen}
                onChange={(e) => setForm({ ...form, komisiPlatformPersen: parseInt(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-white"
                style={{
                  background: `linear-gradient(to right, ${isDark ? '#666666' : '#888888'} 0%, ${isDark ? '#666666' : '#888888'} ${(form.komisiPlatformPersen / 30) * 100}%, ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} ${(form.komisiPlatformPersen / 30) * 100}%, ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} 100%)`
                }}
              />
              <div className={`flex justify-between text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                <span>1%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-[#6b5545] hover:bg-[#5b4535] text-white shadow-lg shadow-[#6b5545]/25'
                  : 'bg-[#6b5545] hover:bg-[#5b4535] text-white shadow-lg shadow-[#6b5545]/20'
              }`}
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Buat Instansi
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function InstansiCard({ instansi, index, onDelete, isDark }: {
  instansi: Instansi;
  index: number;
  onDelete: (id: string) => void;
  isDark: boolean;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if ((instansi._count?.cars ?? 0) === 0 && (instansi._count?.profiles ?? 0) === 0) {
      setIsDeleting(true);
      onDelete(instansi.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${getGlassCardClass(isDark)}`}
    >
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-xl ${
              isDark ? 'bg-white/[0.08] border border-white/10' : 'bg-[#f5ebe0] border border-[#d5c9bc]/50'
            }`}>
              <Building2 size={20} className={isDark ? 'text-white' : 'text-[#6b5545]'} />
            </div>
            <div>
              <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {instansi.namaInstansi}
              </h3>
              <StatusBadge status={instansi.status} isDark={isDark} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/superadmin/instansi/${instansi.id}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all backdrop-blur-xl ${
                isDark
                  ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12] border border-white/10 hover:border-white/20'
                  : 'bg-white/60 text-[#6b5545] hover:bg-[#f5ebe0] border border-[#d5c9bc]/50 hover:border-[#d5c9bc]'
              }`}
            >
              <Eye size={14} />
              Detail
            </a>

            {(instansi._count?.cars ?? 0) === 0 && (instansi._count?.profiles ?? 0) === 0 && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`p-2 rounded-xl transition-all disabled:opacity-50 backdrop-blur-xl ${
                  isDark
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Info Grid - Glass style */}
        <div className={`grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl backdrop-blur-xl ${
          isDark
            ? 'bg-white/[0.02] border border-white/5'
            : 'bg-white/40 border border-[#D4CFC7]/30'
        }`}>
          <div className="flex items-center gap-2">
            <Phone size={12} className={isDark ? 'text-white/40' : 'text-[#8B7355]/60'} />
            <span className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {instansi.noHpPic}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={12} className={isDark ? 'text-white/40' : 'text-[#8B7355]/60'} />
            <span className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {instansi.emailPic}
            </span>
          </div>
          <div className="col-span-2 flex items-start gap-2">
            <MapPin size={12} className={`mt-0.5 ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`} />
            <span className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {instansi.alamat}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className={`flex items-center gap-3 pt-3 ${isDark ? 'border-t border-white/5' : 'border-t border-[#D4CFC7]/30'}`}>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs backdrop-blur-xl ${
            isDark ? 'bg-white/[0.05] text-white/50' : 'bg-white/50 text-slate-500'
          }`}>
            <Car size={12} />
            <span>{instansi._count?.cars ?? 0} mobil</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs backdrop-blur-xl ${
            isDark ? 'bg-white/[0.05] text-white/50' : 'bg-white/50 text-slate-500'
          }`}>
            <Users size={12} />
            <span>{instansi._count?.profiles ?? 0} admin</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ml-auto backdrop-blur-xl ${
            isDark ? 'bg-[#6b5545]/20 text-[#f5ebe0]' : 'bg-[#f5ebe0] text-[#6b5545]'
          }`}>
            <Percent size={12} />
            <span>{instansi.komisiPlatformPersen}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SuperAdminInstansiPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filter, setFilter] = useState<StatusInstansi | ''>('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: instances, isLoading } = useQuery({
    queryKey: ['superadmin-instansi', filter, search],
    queryFn: () => api.listInstansi({
      status: filter || undefined,
      cari: search || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteInstansi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-instansi'] });
    },
    onError: (err: any) => {
      alert(err?.message ?? 'Gagal menghapus');
    },
  });

  const stats = {
    total: instances?.length ?? 0,
    aktif: instances?.filter(i => i.status === 'aktif').length ?? 0,
    menunggu: instances?.filter(i => i.status === 'menunggu_verifikasi').length ?? 0,
    nonaktif: instances?.filter(i => i.status === 'nonaktif').length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Instansi Rental
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Kelola semua rental yang terdaftar
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all backdrop-blur-xl border ${
            isDark
              ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white border-white/20 shadow-lg shadow-black/20'
              : 'bg-white/60 hover:bg-white/80 text-slate-900 border-white/70 shadow-lg shadow-slate-900/10'
          }`}
        >
          <Plus size={16} />
          Tambah Instansi
        </button>
      </motion.div>

      {/* Stats Cards - Glass Card Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            key: 'aktif',
            label: 'Aktif',
            value: stats.aktif,
            icon: CheckCircle,
            activeBg: 'bg-emerald-500/10',
          },
          {
            key: 'menunggu_verifikasi',
            label: 'Menunggu',
            value: stats.menunggu,
            icon: AlertCircle,
            activeBg: 'bg-amber-500/10',
          },
          {
            key: 'nonaktif',
            label: 'Nonaktif',
            value: stats.nonaktif,
            icon: XCircle,
            activeBg: 'bg-red-500/10',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const isActive = filter === stat.key;
          return (
            <motion.button
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(filter === stat.key ? '' : stat.key as StatusInstansi)}
              className={`rounded-2xl p-5 text-left ${getGlassCardClass(isDark)} ${isActive ? stat.activeBg : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{stat.label}</p>
                <Icon size={16} className={isDark ? 'text-white/40' : 'text-slate-400'} />
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stat.value}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Search - Glass Card Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative"
      >
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`} />
        <input
          type="text"
          placeholder="Cari nama instansi atau alamat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all ${
            isDark
              ? 'bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/20'
              : 'bg-[#F9EFE8]/50 border border-[#D4CFC7]/60 text-slate-900 placeholder:text-[#8B7355]/50 focus:border-[#8b7355]/50 focus:ring-2 focus:ring-[#8b7355]/20'
          }`}
        />
      </motion.div>

      {/* Results count */}
      {!isLoading && instances && instances.length > 0 && (
        <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>
          Menampilkan {instances.length} instansi
          {filter && ` · Filter: ${INSTANSI_STATUS_LABELS[filter] ?? filter}`}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <SkeletonList count={4} isDark={isDark} />
      ) : !instances?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl ${isDark ? 'bg-white/[0.05] border border-white/10' : 'bg-[#f5ebe0] border border-[#d5c9bc]/50'}`}>
            <Building2 size={32} className={isDark ? 'text-white/30' : 'text-[#8B7355]/40'} />
          </div>
          <p className={`text-base font-medium mb-1 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>
            {search || filter ? 'Tidak ada instansi ditemukan' : 'Belum ada instansi'}
          </p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>
            {search || filter ? 'Coba ubah filter atau kata kunci pencarian' : 'Tambahkan instansi pertama untuk memulai'}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {instances.map((instansi, i) => (
            <InstansiCard
              key={instansi.id}
              instansi={instansi}
              index={i}
              isDark={isDark}
              onDelete={(id) => {
                if (confirm(`Hapus instansi "${instansi.namaInstansi}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateInstansiModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['superadmin-instansi'] })}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
