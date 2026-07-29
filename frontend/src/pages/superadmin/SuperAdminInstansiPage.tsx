import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, Eye, CheckCircle, XCircle, AlertCircle, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { Instansi, StatusInstansi } from '../../lib/api';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';

const STATUS_CONFIG_DARK: Record<string, { color: string; icon: React.ElementType; glow: string }> = {
  aktif: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle, glow: 'shadow-emerald-500/20' },
  menunggu_verifikasi: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle, glow: 'shadow-amber-500/20' },
  nonaktif: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, glow: 'shadow-red-500/20' },
};

const STATUS_CONFIG_LIGHT: Record<string, { color: string; icon: React.ElementType; glow: string }> = {
  aktif: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, glow: 'shadow-emerald-500/10' },
  menunggu_verifikasi: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, glow: 'shadow-amber-500/10' },
  nonaktif: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, glow: 'shadow-red-500/10' },
};

function StatusBadge({ status, isDark }: { status: StatusInstansi; isDark: boolean }) {
  const config = isDark ? STATUS_CONFIG_DARK[status] : STATUS_CONFIG_LIGHT[status];
  const Icon = config.icon;

  const labels = {
    aktif: 'Aktif',
    menunggu_verifikasi: 'Menunggu',
    nonaktif: 'Nonaktif',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} shadow-lg ${config.glow}`}>
      <Icon size={12} />
      {labels[status]}
    </span>
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

  const modalClass = isDark
    ? 'bg-gradient-to-br from-[#0d1424]/95 to-[#0a0f1a]/95 backdrop-blur-xl border border-white/10'
    : 'bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl';

  const inputClass = isDark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
    : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`${modalClass} rounded-2xl w-full max-w-lg shadow-2xl ${isDark ? 'shadow-black/50' : 'shadow-slate-900/10'}`}
      >
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tambah Instansi Baru</h2>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-3 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}
            >
              {error}
            </motion.div>
          )}
          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Nama Instansi</label>
            <input
              type="text"
              required
              value={form.namaInstansi}
              onChange={(e) => setForm({ ...form, namaInstansi: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
              placeholder="PT Rental Mobil Sejahtera"
            />
          </div>
          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Alamat</label>
            <textarea
              required
              rows={2}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all resize-none ${inputClass}`}
              placeholder="Jl. Sudirman No. 123, Jakarta"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>No. HP PIC</label>
              <input
                type="tel"
                required
                value={form.noHpPic}
                onChange={(e) => setForm({ ...form, noHpPic: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
                placeholder="081234567890"
              />
            </div>
            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Email PIC</label>
              <input
                type="email"
                required
                value={form.emailPic}
                onChange={(e) => setForm({ ...form, emailPic: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
                placeholder="admin@contoh.com"
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Rekening Bank</label>
            <input
              type="text"
              value={form.rekeningBank}
              onChange={(e) => setForm({ ...form, rekeningBank: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
              placeholder="BCA-1234567890"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl transition-all ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              Batal
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className={`flex-1 px-4 py-3 font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 ${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}>
              {createMutation.isPending ? 'Membuat...' : 'Buat Instansi'}
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
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-white/8 via-white/5 to-white/3 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 hover:border-blue-500/30 hover:shadow-blue-500/10'
          : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 hover:border-blue-300 hover:shadow-blue-500/10'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <Building2 size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <div>
                <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{instansi.namaInstansi}</h3>
                <StatusBadge status={instansi.status} isDark={isDark} />
              </div>
            </div>

            <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{instansi.alamat}</p>

            <div className={`flex flex-wrap items-center gap-4 text-xs mb-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
                {instansi.noHpPic}
              </span>
              <span className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
                {instansi.emailPic}
              </span>
            </div>

            <div className={`flex items-center gap-3 pt-3 ${isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}`}>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-white/5 text-white/60' : 'bg-slate-100 text-slate-600'}`}>
                {instansi._count?.cars ?? 0} mobil
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-white/5 text-white/60' : 'bg-slate-100 text-slate-600'}`}>
                {instansi._count?.profiles ?? 0} admin
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                {instansi.komisiPlatformPersen}% komisi
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to={`/superadmin/instansi/${instansi.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                isDark
                  ? 'bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-blue-400 border-blue-500/30 hover:border-blue-400/50 hover:from-blue-500/30 hover:to-blue-500/20 shadow-lg shadow-blue-500/10'
                  : 'bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-600 border-blue-200 hover:border-blue-300 hover:from-blue-100 hover:to-blue-50 shadow-lg shadow-blue-500/10'
              }`}
            >
              <Eye size={16} />
              Detail
            </Link>

            {(instansi._count?.cars ?? 0) === 0 && (instansi._count?.profiles ?? 0) === 0 && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`p-2.5 rounded-xl border transition-all disabled:opacity-50 ${
                  isDark
                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-400/50 hover:bg-red-500/20 shadow-lg shadow-red-500/10'
                    : 'bg-red-50 text-red-600 border-red-200 hover:border-red-300 hover:bg-red-100 shadow-lg shadow-red-500/10'
                }`}
              >
                <Trash2 size={16} />
              </button>
            )}
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
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Instansi Rental</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-xl text-sm ${isDark ? 'bg-white/5 border border-white/10 text-white/60' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>
            {stats.total} instansi
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl shadow-lg transition-all ${
              isDark
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-blue-500/40 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
          >
            <Plus size={18} />
            Tambah
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'aktif', label: 'Aktif', value: stats.aktif, darkBg: 'bg-emerald-500/15 border-emerald-500/30', lightBg: 'bg-emerald-50 border-emerald-200' },
          { key: 'menunggu_verifikasi', label: 'Menunggu', value: stats.menunggu, darkBg: 'bg-amber-500/15 border-amber-500/30', lightBg: 'bg-amber-50 border-amber-200' },
          { key: 'nonaktif', label: 'Nonaktif', value: stats.nonaktif, darkBg: 'bg-red-500/15 border-red-500/30', lightBg: 'bg-red-50 border-red-200' },
        ].map((stat, i) => (
          <motion.button
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(filter === stat.key ? '' : stat.key as StatusInstansi)}
            className={`rounded-xl p-4 text-left transition-all border ${
              filter === stat.key
                ? isDark
                  ? stat.darkBg
                  : stat.lightBg
                : isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <p className={`text-xs mb-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{stat.label}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
          </motion.button>
        ))}
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative mb-6"
      >
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Cari nama instansi atau alamat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
          }`}
        />
      </motion.div>

      {/* List */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : !instances?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
            <Building2 size={40} className={isDark ? 'text-white/20' : 'text-slate-300'} />
          </div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Tidak ada instansi ditemukan</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Coba ubah filter atau kata kunci pencarian</p>
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
                if (confirm(`Hapus instansi "${instansi.namaInstansi}"?`)) {
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
