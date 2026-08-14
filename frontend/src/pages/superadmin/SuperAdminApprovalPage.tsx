import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../../lib/api';
import type { SuperAdminCar } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { SkeletonList } from '../../components/Skeleton';
import { useTheme } from '../../hooks/useTheme';
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
      className={`group rounded-2xl overflow-hidden transition-all duration-300 ${getGlassCardClass(isDark)}`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className={`sm:w-48 h-40 sm:h-auto flex items-center justify-center overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-white/5 to-transparent'
            : 'bg-gradient-to-br from-[#f5ebe0]/50 to-transparent'
        }`}>
          {car.images[0]?.url ? (
            <motion.img
              whileHover={{ scale: 1.05 }}
              src={car.images[0].url}
              alt={car.nama}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${
              isDark ? 'bg-white/[0.02]' : 'bg-[#f5ebe0]/30'
            }`}>
              <ImageIcon size={48} className={isDark ? 'text-white/20' : 'text-[#8B7355]/30'} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className={`font-semibold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.nama}</h3>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>{KATEGORI_LABELS[car.kategori]} - {car.transmisi}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-xl border ${
              isDark
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-[#f5ebe0] text-[#8B7355] border-[#d5c9bc]'
            }`}>
              <Clock size={14} />
              Menunggu
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div className={`flex items-center gap-2 p-3 rounded-xl backdrop-blur-xl ${
              isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-white/50 border border-[#D4CFC7]/30'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#6b5545]/20' : 'bg-[#f5ebe0]'
              }`}>
                <span className={`text-xs font-bold ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>IN</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Instansi</p>
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.instansi.namaInstansi}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-xl backdrop-blur-xl ${
              isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-white/50 border border-[#D4CFC7]/30'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#6b5545]/20' : 'bg-[#f5ebe0]'
              }`}>
                <span className={`text-xs font-bold ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>{car.kapasitasKursi}</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Kapasitas</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.kapasitasKursi} Kursi</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-xl backdrop-blur-xl ${
              isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-white/50 border border-[#D4CFC7]/30'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#6b5545]/20' : 'bg-[#f5ebe0]'
              }`}>
                <span className={`text-xs font-bold ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>T</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Tipe Sewa</p>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{car.tipeSewa.replace('_', ' ')}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-xl backdrop-blur-xl ${
              isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-white/50 border border-[#D4CFC7]/30'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#6b5545]/20' : 'bg-[#f5ebe0]'
              }`}>
                <span className={`text-xs font-bold ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>RP</span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Harga/hari</p>
                <p className={`text-sm font-bold ${isDark ? 'text-[#f5ebe0]' : 'text-[#6b5545]'}`}>{formatRupiah(Number(car.hargaPerHari))}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onApprove(car.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all backdrop-blur-xl ${
                isDark
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
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
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all backdrop-blur-xl ${
                    isDark
                      ? 'bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:border-red-500/50'
                      : 'bg-white/50 border border-[#D4CFC7]/50 text-slate-900 placeholder:text-[#8B7355]/50 focus:border-red-400'
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
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all backdrop-blur-xl ${
                    isDark
                      ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                      : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
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
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all backdrop-blur-xl ${
                  isDark
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Approval Mobil</h1>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Kelola kendaraan yang menunggu persetujuan</p>
        </div>
        {pendingCars.length > 0 && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-xl border shadow-lg ${
              isDark
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-[#f5ebe0] text-[#8B7355] border-[#d5c9bc]'
            }`}
          >
            <Clock size={16} />
            {pendingCars.length} menunggu
          </motion.div>
        )}
      </motion.div>

      {isLoading ? (
        <SkeletonList count={3} isDark={isDark} />
      ) : !pendingCars.length ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center py-20 rounded-2xl ${getGlassCardClass(isDark)}`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-xl border ${
              isDark
                ? 'bg-emerald-500/20 border-emerald-500/30'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <CheckCircle size={40} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </motion.div>
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-[#8B7355]'}`}>Semua mobil sudah diproses</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-[#8B7355]/60'}`}>Tidak ada antrian approval</p>
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
