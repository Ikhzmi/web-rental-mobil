import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

export function ApprovalCenter() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['superadmin-approvals'],
    queryFn: api.getSuperAdminApprovals,
    staleTime: 2 * 60 * 1000,
  });

  const totalPending = (approvals?.rentalCompanies ?? 0) + (approvals?.vehicles ?? 0) + (approvals?.payments ?? 0);

  const items = [
    { label: 'Rental Company', value: approvals?.rentalCompanies ?? 0 },
    { label: 'Kendaraan', value: approvals?.vehicles ?? 0 },
    { label: 'Pembayaran', value: approvals?.payments ?? 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Pusat Persetujuan
          </h3>
          <Link
            to="/superadmin/armada/approval"
            className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lihat Semua
          </Link>
        </div>
      </div>

      <div className="p-4 flex-1">
        {/* Grid responsive - fills card */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'}`}>
                  <div className={`h-8 w-12 mx-auto rounded animate-pulse mb-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-16 mx-auto rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>
              ))}
            </>
          ) : (
            items.map((item) => (
              <div key={item.label} className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'}`}>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.value}
                </p>
                <p className={`text-[10px] mt-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                  {item.label}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Total pending */}
        {isLoading ? (
          <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'}`} />
        ) : (
          <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-[#F5F0E8]'}`}>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Total Menunggu
            </p>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {totalPending}
            </p>
          </div>
        )}
      </div>

    </motion.div>
  );
}
