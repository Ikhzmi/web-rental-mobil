import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, CheckCircle, XCircle, UserPlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { Role, Instansi } from '../../lib/api';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';

const ROLE_CONFIG_DARK: Record<Role, { color: string; label: string }> = {
  super_admin: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Super Admin' },
  admin: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Admin' },
  customer: { color: 'bg-white/10 text-white/70 border-white/20', label: 'Customer' },
};

const ROLE_CONFIG_LIGHT: Record<Role, { color: string; label: string }> = {
  super_admin: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Super Admin' },
  admin: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Admin' },
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
        className={`${modalClass} rounded-2xl w-full max-w-md shadow-2xl ${isDark ? 'shadow-black/50' : 'shadow-slate-900/10'}`}
      >
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tambah Admin Baru</h2>
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
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Nama Lengkap</label>
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
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Email</label>
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
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>No. HP</label>
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
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Password</label>
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
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Instansi</label>
            <select
              required
              value={form.instansiId}
              onChange={(e) => setForm({ ...form, instansiId: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
            >
              <option value="" className={isDark ? 'bg-[#0d1424]' : 'bg-white'}>Pilih Instansi</option>
              {instansiList?.map((inst) => (
                <option key={inst.id} value={inst.id} className={isDark ? 'bg-[#0d1424]' : 'bg-white'}>
                  {inst.namaInstansi}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl transition-all ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              Batal
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className={`flex-1 px-4 py-3 font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 ${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}>
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

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['superadmin-users', filter, search],
    queryFn: () => api.listSuperAdminUsers({
      role: filter === 'all' ? undefined : filter,
      cari: search || undefined,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) =>
      api.toggleUserStatus(id, aktif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
  });

  const stats = {
    total: users?.length ?? 0,
    admin: users?.filter(u => u.role === 'admin').length ?? 0,
    customer: users?.filter(u => u.role === 'customer').length ?? 0,
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
          className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl shadow-lg transition-all ${
            isDark
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-blue-500/40 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
          }`}
        >
          <UserPlus size={18} />
          Tambah Admin
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'all', label: 'Total', value: stats.total, darkBg: 'bg-blue-500/15 border-blue-500/30', lightBg: 'bg-blue-50 border-blue-200' },
          { key: 'admin', label: 'Admin', value: stats.admin, darkBg: 'bg-blue-500/15 border-blue-500/30', lightBg: 'bg-blue-50 border-blue-200' },
          { key: 'customer', label: 'Customer', value: stats.customer, darkBg: 'bg-white/10 border-white/20', lightBg: 'bg-slate-100 border-slate-200' },
        ].map((stat, i) => (
          <motion.button
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(stat.key as Role | 'all')}
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
          placeholder="Cari nama atau email..."
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
        <SkeletonList count={5} />
      ) : !users?.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
            <Users size={40} className={isDark ? 'text-white/20' : 'text-slate-300'} />
          </div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Tidak ada pengguna ditemukan</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Coba ubah filter atau kata kunci pencarian</p>
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
              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark
                  ? 'bg-gradient-to-br from-white/8 via-white/5 to-white/3 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 hover:border-blue-500/30 hover:shadow-blue-500/10'
                  : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 hover:border-blue-300 hover:shadow-blue-500/10'
              }`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                      isDark
                        ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-500/30 shadow-blue-500/10'
                        : 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 shadow-blue-500/10'
                    }`}>
                      <span className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
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
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{user.email}</p>
                      {user.instansi && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
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
