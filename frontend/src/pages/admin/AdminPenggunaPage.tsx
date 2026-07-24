import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

import { api } from '../../lib/api';

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminPenggunaPage() {
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.listAdminUsers,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) => api.updateUserStatus(id, aktif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div>
      <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Admin</p>
      <h1 className="mb-8 text-3xl italic text-white font-playfair sm:text-4xl">Kelola Pengguna</h1>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-white/50">
          <Loader2 size={18} className="animate-spin" />
          Memuat pengguna...
        </div>
      )}

      {isError && (
        <p className="px-4 py-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
          Gagal memuat daftar pengguna.
        </p>
      )}

      {users && (
        <div className="overflow-hidden overflow-x-auto border rounded-2xl border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium text-left">Nama</th>
                <th className="px-4 py-3 font-medium text-left">Email</th>
                <th className="px-4 py-3 font-medium text-left">Role</th>
                <th className="px-4 py-3 font-medium text-left">Terdaftar</th>
                <th className="px-4 py-3 font-medium text-left">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-white/5 text-white/80">
                  <td className="px-4 py-3">{user.nama}</td>
                  <td className="px-4 py-3 text-white/50">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        user.role === 'admin' ? 'bg-[#2563eb]/15 text-[#2563eb]' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{formatTanggal(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    {user.aktif ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 size={13} />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <XCircle size={13} />
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => statusMutation.mutate({ id: user.id, aktif: !user.aktif })}
                      disabled={statusMutation.isPending}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                        user.aktif
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {user.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-sm text-center text-white/30">
                    Belum ada pengguna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}