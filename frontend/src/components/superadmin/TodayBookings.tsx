import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';

export function TodayBookings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['superadmin-today-bookings'],
    queryFn: api.getTodayBookings,
    staleTime: 2 * 60 * 1000,
  });

  // Calculate confirmed: total - (pending + running + completed + cancelled)
  const confirmed = Math.max(0, (bookings?.total ?? 0) - ((bookings?.pending ?? 0) + (bookings?.running ?? 0) + (bookings?.completed ?? 0) + (bookings?.cancelled ?? 0)));

  // 5 statuses - no colors
  const stats = [
    { label: 'Menunggu Bayar', value: bookings?.pending ?? 0 },
    { label: 'Dikonfirmasi', value: confirmed },
    { label: 'Berjalan', value: bookings?.running ?? 0 },
    { label: 'Selesai', value: bookings?.completed ?? 0 },
    { label: 'Dibatalkan', value: bookings?.cancelled ?? 0 },
  ];

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full ${getGlassCardClass(isDark)}`}
    >
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-[#D4CFC7]/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className={isDark ? 'text-white/50' : 'text-slate-500'} />
            <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Booking Hari Ini
            </h2>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <Link
            to="/superadmin/bookings"
            className={`text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lihat Semua
          </Link>
        </div>
      </div>
      <div className="p-4 flex flex-1">
        {/* Left: Doughnut + Bigger Total */}
        <div className="w-2/5 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {isLoading ? (
                <circle cx="50" cy="50" r={radius} fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} strokeWidth="12" />
              ) : (
                stats.map((stat) => {
                  const total = bookings?.total ?? 1;
                  const percentage = total > 0 ? stat.value / total : 0;
                  const dashLength = circumference * percentage;
                  const dashOffset = -offset;
                  offset += dashLength;

                  return (
                    <circle
                      key={stat.label}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="12"
                      strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-500"
                    />
                  );
                })
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isLoading ? '...' : (bookings?.total ?? 0)}
              </p>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8B7355]/70'}`}>Total</p>
            </div>
          </div>
        </div>

        {/* Right: 5 Status Legend - No Colors */}
        <div className="flex-1 flex flex-col justify-center pl-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className={`h-3 w-24 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-6 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5 dark:bg-white/5">
                  <span className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{stat.label}</span>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
