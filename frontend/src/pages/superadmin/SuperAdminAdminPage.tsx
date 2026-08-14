import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, CheckCircle, XCircle, UserPlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { Role, Instansi } from '../../lib/api';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

const ROLE_CONFIG_DARK: Record<Role, { color: string; label: string }> = {
  super_admin: { color: 'bg-[#f5ebe0]/20 text-[#f5ebe0] border-[#f5ebe0]/30', label: 'Super Admin' },
  admin: { color: 'bg-[#6b5545]/30 text-[#f5ebe0] border-[#6b5545]/40', label: 'Admin' },
  customer: { color: 'bg-white/10 text-white/70 border-white/20', label: 'Customer' },
};

const ROLE_CONFIG_LIGHT: Record<Role, { color: string; label: string }> = {
  super_admin: { color: 'bg-[#f5ebe0] text-[#6b5545] border-[#d5c9bc]', label: 'Super Admin' },
  admin: { color: 'bg-[#6b5545]/15 text-[#6b5545] border-[#d5c9bc]', label: 'Admin' },
  customer: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Customer' },
};

function RoleBadge({ role, isDark }: { role: Role; isDark: boolean }) {
  const config = isDark ? ROLE_CONFIG_DARK[role] : ROLE_CONFIG_LIGHT[role];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function CreateAdminModal({ onClose, onSuccess, isDark }: { onClose: () => void; onSuccess: () => void; isDark: boolean }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    nama: '',
    noHp: '',
    instansiId: '',
  });
  const [error, setError] = useState('');

  const { data: instansiList } = useQuery<Instansi[]>({
    queryKey: ['superadmin-instansi-all'],
    queryFn: () => api.listInstansi({ status: 'aktif' }),
  });

  const createMutation = useMutation({
    mutationFn: api.createAdmin,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.message ?? 'Gagal membuat akun');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    createMutation.mutate(form);
  };

  const inputClass = isDark
    ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/20'
    : 'bg-[#F9EFE8]/50 border border-[#D4CFC7]/60 text-slate-900 placeholder:text-slate-400 focus:border-[#8b7355]/50 focus:ring-2 focus:ring-[#8b7355]/20';

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
        className={`w-full max-w-md rounded-2xl overflow-hidden ${
          isDark
            ? 'login-card-dark'
            : 'login-card-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 ${isDark ? 'border-b border-white/10' : 'border-b border-[#D4CFC7]/40'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#f5ebe0]'}`}>
              <Users size={20} className={isDark ? 'text-white' : 'text-[#6b5545]'} />
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tambah Admin Baru</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-[#8B7355] hover:text-[#6B5344] hover:bg-[#f5ebe0]'}`}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-3 text-sm flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}
            >
              <XCircle size={16} />
              {error}
            </motion.div>
          )}

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Nama Lengkap</label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
              placeholder="Nama admin"
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
              placeholder="admin@contoh.com"
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>No. HP</label>
            <input
              type="tel"
              required
              value={form.noHp}
              onChange={(e) => setForm({ ...form, noHp: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
              placeholder="081234567890"
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
              placeholder="Min. 8 karakter"
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Instansi</label>
            <select
              required
              value={form.instansiId}
              onChange={(e) => setForm({ ...form, instansiId: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
            >
              <option value="" className={isDark ? 'bg-[#1a1a1a]' : 'bg-[#F9EFE8]'}>Pilih Instansi</option>
              {instansiList?.map((inst) => (
                <option key={inst.id} value={inst.id} className={isDark ? 'bg-[#1a1a1a]' : 'bg-[#F9EFE8]'}>
                  {inst.namaInstansi}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10' : 'bg-[#f5ebe0] hover:bg-[#e8e3dc] text-[#6b5545] border border-[#d5c9bc]'}`}>
              Batal
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className={`flex-1 px-4 py-3 font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 ${isDark ? 'bg-[#6b5545] hover:bg-[#5b4535] text-white shadow-[#6b5545]/25' : 'bg-[#6b5545] hover:bg-[#5b4535] text-white shadow-[#6b5545]/20'}`}>
              {createMutation.isPending ? 'Membuat...' : 'Buat Admin'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function SuperAdminAdminPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['superadmin-users', filter, search, page],
    queryFn: () => api.listSuperAdminUsers({
      role: filter === 'all' ? undefined : filter,
      cari: search || undefined,
      page,
      limit,
    }),
  });

  const users = response?.data ?? [];
  const pagination = response?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const toggleMutation = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) =>
      api.toggleUserStatus(id, aktif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
  });

  // Reset page when filter or search changes
  const handleFilterChange = (newFilter: Role | 'all') => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const stats = {
    total: pagination?.total ?? 0,
    admin: users.filter(u => u.role === 'admin').length,
    customer: users.filter(u => u.role === 'customer').length,
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
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Kelola Akun</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all backdrop-blur-xl border ${
            isDark
              ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white border-white/20 shadow-lg shadow-black/20'
              : 'bg-white/60 hover:bg-white/80 text-slate-900 border-white/70 shadow-lg shadow-slate-900/10'
          }`}
        >
          <UserPlus size={18} />
          Tambah Admin
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'all', label: 'Total Aktif', value: stats.total, activeBg: 'bg-white/[0.03]' },
          { key: 'admin', label: 'Admin', value: stats.admin, activeBg: 'bg-white/[0.03]' },
          { key: 'customer', label: 'Customer', value: stats.customer, activeBg: 'bg-white/[0.03]' },
        ].map((stat, i) => (
          <motion.button
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFilterChange(stat.key as Role | 'all')}
            className={`rounded-xl p-4 text-left ${getGlassCardClass(isDark)} ${filter === stat.key ? stat.activeBg : ''}`}
          >
            <p className={`text-xs mb-1 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>{stat.label}</p>
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
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-[#8B7355]'}`} />
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none transition-all ${
            isDark
              ? 'bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/20'
              : 'bg-[#F9EFE8]/50 border border-[#D4CFC7]/60 text-slate-900 placeholder:text-[#8B7355]/50 focus:border-[#8b7355]/50 focus:ring-2 focus:ring-[#8b7355]/20'
          }`}
        />
      </motion.div>

      {/* List */}
      {isLoading ? (
        <SkeletonList count={5} isDark={isDark} />
      ) : !users?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-20 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-[#f5ebe0] border border-[#d5c9bc]'}`}>
            <Users size={40} className={isDark ? 'text-white/20' : 'text-[#8B7355]/40'} />
          </div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Tidak ada pengguna ditemukan</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Coba ubah filter atau kata kunci pencarian</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -2 }}
              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${getGlassCardClass(isDark)}`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                      isDark
                        ? 'bg-[#6b5545]/20 border border-[#6b5545]/30'
                        : 'bg-[#f5ebe0] border border-[#d5c9bc]'
                    }`}>
                      <span className={`font-bold text-sm ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>
                        {user.nama.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.nama}</h3>
                        <RoleBadge role={user.role} isDark={isDark} />
                        {!user.aktif && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>{user.email}</p>
                      {user.instansi && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-[#f5ebe0]/60' : 'text-[#8B7355]/60'}`}>
                          {user.instansi.namaInstansi}
                        </p>
                      )}
                    </div>
                  </div>
                  {user.role !== 'super_admin' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMutation.mutate({ id: user.id, aktif: !user.aktif })}
                      disabled={toggleMutation.isPending}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        user.aktif
                          ? isDark
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-400/50'
                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300'
                          : isDark
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                      }`}
                    >
                      {user.aktif ? (
                        <>
                          <XCircle size={16} />
                          Nonaktifkan
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Aktifkan
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {users.length > 0 && totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`flex items-center justify-between mt-6 p-4 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>
              Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination?.total ?? 0)} dari {pagination?.total ?? 0} data
            </p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                  page <= 1
                    ? isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#f5ebe0] text-[#6b5545] hover:bg-[#e8dfd3]'
                }`}
              >
                ‹
              </motion.button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <motion.button
                    key={pageNum}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                      page === pageNum
                        ? isDark ? 'bg-[#6b5545] text-white' : 'bg-[#6b5545] text-white'
                        : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#f5ebe0] text-[#6b5545] hover:bg-[#e8dfd3]'
                    }`}
                  >
                    {pageNum}
                  </motion.button>
                );
              })}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                  page >= totalPages
                    ? isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#f5ebe0] text-[#6b5545] hover:bg-[#e8dfd3]'
                }`}
              >
                ›
              </motion.button>
            </div>
          </motion.div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateAdminModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['superadmin-users'] })}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
