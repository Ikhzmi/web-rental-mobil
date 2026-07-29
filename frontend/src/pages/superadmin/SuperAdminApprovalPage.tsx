import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../../lib/api';
import type { SuperAdminCar } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';

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

function ApprovalCard({
  car,
  index,
  onApprove,
  onReject,
  isDark,
}: {
  car: SuperAdminCar;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isDark: boolean;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleReject = () => {
    if (showRejectForm && rejectReason.trim()) {
      onReject(car.id);
    } else {
      setShowRejectForm(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group rounded-2xl overflow-hidden transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-white/8 via-white/5 to-white/3 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 hover:border-blue-500/30 hover:shadow-blue-500/10'
          : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 hover:border-blue-300 hover:shadow-blue-500/10'
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className={`sm:w-48 h-40 sm:h-auto flex items-center justify-center overflow-hidden ${isDark ? 'bg-gradient-to-br from-[#0d1424] to-[#0a0f1a]' : 'bg-gradient-to-br from-slate-100 to-slate-50'}`}>
          {car.images[0]?.url ? (
            <motion.img
              whileHover={{ scale: 1.05 }}
              src={car.images[0].url}
              alt={car.nama}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/50 to-transparent'}`}>
              <ImageIcon size={48} className={isDark ? 'text-white/20' : 'text-slate-300'} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className={`font-semibold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{KATEGORI_LABELS[car.kategori]} - {car.transmisi}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
              <Clock size={14} />
              Menunggu
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <span className={`text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>IN</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Instansi</p>
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.instansi.namaInstansi}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                <span className={`text-xs font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{car.kapasitasKursi}</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Kapasitas</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.kapasitasKursi} Kursi</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>T</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tipe Sewa</p>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.tipeSewa.replace('_', ' ')}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <span className={`text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>RP</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Harga/hari</p>
                <p className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{formatRupiah(Number(car.hargaPerHari))}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onApprove(car.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all ${
                isDark
                  ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-400/50 hover:from-emerald-500/30 hover:to-emerald-500/20 shadow-lg shadow-emerald-500/10'
                  : 'bg-gradient-to-r from-emerald-50 to-emerald-50/50 text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:from-emerald-100 hover:to-emerald-50 shadow-lg shadow-emerald-500/10'
              }`}
            >
              <CheckCircle size={18} />
              Setujui
            </motion.button>
            {showRejectForm ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Alasan penolakan..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all ${
                    isDark
                      ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-red-500/50'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-400'
                  }`}
                  autoFocus
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (rejectReason.trim()) {
                      onReject(car.id);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    isDark
                      ? 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-400 border-red-500/30 hover:border-red-400/50 shadow-lg shadow-red-500/10'
                      : 'bg-gradient-to-r from-red-50 to-red-50/50 text-red-600 border-red-200 hover:border-red-300 shadow-lg shadow-red-500/10'
                  }`}
                >
                  Tolak
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReject}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all ${
                  isDark
                    ? 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-400 border-red-500/30 hover:border-red-400/50 hover:from-red-500/30 hover:to-red-500/20 shadow-lg shadow-red-500/10'
                    : 'bg-gradient-to-r from-red-50 to-red-50/50 text-red-600 border-red-200 hover:border-red-300 hover:from-red-100 hover:to-red-50 shadow-lg shadow-red-500/10'
                }`}
              >
                <XCircle size={18} />
                Tolak
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SuperAdminApprovalPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const queryClient = useQueryClient();

  const { data: cars, isLoading } = useQuery({
    queryKey: ['superadmin-approval-cars'],
    queryFn: () => api.listApprovalCars(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveCar(id, 'approve'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-approval-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.approveCar(id, 'reject'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-approval-cars'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-dashboard'] });
    },
  });

  const pendingCars = cars?.filter(c => c.statusApproval === 'menunggu_persetujuan') ?? [];

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Approval Mobil</h1>
        </div>
        {pendingCars.length > 0 && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border shadow-lg ${
              isDark
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10'
                : 'bg-amber-100 text-amber-700 border-amber-200 shadow-amber-500/10'
            }`}
          >
            <Clock size={16} />
            {pendingCars.length} menunggu
          </motion.div>
        )}
      </motion.div>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : !pendingCars.length ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
              isDark
                ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 shadow-emerald-500/20'
                : 'bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 shadow-emerald-500/10'
            }`}
          >
            <CheckCircle size={40} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </motion.div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Semua mobil sudah diproses</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Tidak ada antrian approval</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {pendingCars.map((car, i) => (
            <ApprovalCard
              key={car.id}
              car={car}
              index={i}
              isDark={isDark}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
