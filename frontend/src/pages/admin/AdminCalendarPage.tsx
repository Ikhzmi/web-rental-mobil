import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogIn, LogOut as LogOutIcon, Car } from 'lucide-react';
import { api, type AdminBooking } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { getGlassCardClass } from '../../hooks/useGlassStyles';
import { getBookingStatusWithIcon } from '../../lib/statusConfig';
import { Skeleton } from '../../components/Skeleton';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WEEKDAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminCalendarPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  // Padding 7 hari ke belakang supaya booking yang mulai bulan lalu tapi
  // masih berjalan/berakhir di bulan ini tetap tertangkap.
  const rangeStart = new Date(year, month, 1 - 7);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-calendar-bookings', year, month],
    queryFn: () =>
      api.listAdminBookings({
        dari: rangeStart.toISOString(),
        sampai: lastOfMonth.toISOString(),
        limit: 100,
      }),
  });

  const bookings = data?.data ?? [];

  // Kelompokkan booking asli ke tiap tanggal: 'mulai' (hari pengambilan)
  // dan 'selesai' (hari pengembalian) — supaya kalender menampilkan
  // jadwal nyata, bukan data rekaan. Tandai juga hari yang memuat
  // booking DIBATALKAN (titik merah).
  const byDay = useMemo(() => {
    const map = new Map<string, { starts: AdminBooking[]; ends: AdminBooking[]; hasCancelled: boolean }>();
    for (const b of bookings) {
      const startKey = toKey(new Date(b.tanggalMulai));
      const endKey = toKey(new Date(b.tanggalSelesai));
      if (!map.has(startKey)) map.set(startKey, { starts: [], ends: [], hasCancelled: false });
      if (!map.has(endKey)) map.set(endKey, { starts: [], ends: [], hasCancelled: false });
      map.get(startKey)!.starts.push(b);
      map.get(endKey)!.ends.push(b);
      if (b.status === 'dibatalkan') {
        map.get(startKey)!.hasCancelled = true;
        map.get(endKey)!.hasCancelled = true;
      }
    }
    return map;
  }, [bookings]);

  // Grid kalender: mulai dari hari Minggu di minggu yang memuat tanggal 1
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridDays: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayKey = toKey(new Date());
  const selectedEntry = selectedDay ? byDay.get(selectedDay) : undefined;
  const selectedList = selectedEntry ? [...selectedEntry.starts, ...selectedEntry.ends.filter((e) => !selectedEntry.starts.includes(e))] : [];

  const glassCard = getGlassCardClass(isDark);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Kalender Booking</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Jadwal pengambilan &amp; pengembalian dari pesanan asli
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null); }}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'}`}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <span className={`text-sm font-medium w-36 text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {MONTHS_ID[month]} {year}
          </span>
          <button
            onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'}`}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Grid kalender */}
        <div className={`lg:col-span-2 p-4 sm:p-5 rounded-2xl ${glassCard}`}>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS_ID.map((d) => (
              <div key={d} className={`text-center text-[11px] font-medium py-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {/* 42 sel = ukuran grid asli (6 minggu) agar tidak lompat saat data tiba */}
              {Array.from({ length: 42 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((d) => {
                const key = toKey(d);
                const inMonth = d.getMonth() === month;
                const entry = byDay.get(key);
                const hasStart = (entry?.starts.length ?? 0) > 0;
                const hasEnd = (entry?.ends.length ?? 0) > 0;
                const hasCancelled = entry?.hasCancelled ?? false;
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(hasStart || hasEnd ? key : null)}
                    disabled={!hasStart && !hasEnd}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                      !inMonth ? 'opacity-30' : ''
                    } ${
                      isSelected
                        ? isDark ? 'bg-white/20' : 'bg-slate-900 text-white'
                        : isToday
                        ? isDark ? 'bg-white/10' : 'bg-slate-100'
                        : (hasStart || hasEnd)
                        ? isDark ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                        : ''
                    } ${(hasStart || hasEnd) ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`text-xs ${isSelected ? '' : isDark ? 'text-white/80' : 'text-slate-700'}`}>
                      {d.getDate()}
                    </span>
                    {(hasStart || hasEnd) && (
                      <div className="flex items-center gap-0.5">
                        {hasStart && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        {hasEnd && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        {hasCancelled && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t text-xs ${isDark ? 'border-white/10 text-white/50' : 'border-slate-100 text-slate-500'}`}>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Pengambilan</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pengembalian</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Dibatalkan</span>
          </div>
        </div>

        {/* Panel detail hari terpilih */}
        <div className={`p-4 sm:p-5 rounded-2xl ${glassCard}`}>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : (
          <>
          <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {selectedDay
              ? new Date(selectedDay).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
              : 'Pilih tanggal'}
          </h2>

          {!selectedDay ? (
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              Klik tanggal yang bertitik untuk melihat jadwal pengambilan/pengembalian.
            </p>
          ) : selectedList.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Tidak ada jadwal di tanggal ini.</p>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {selectedList.map((b) => {
                  const isStart = toKey(new Date(b.tanggalMulai)) === selectedDay;
                  const statusCfg = getBookingStatusWithIcon(b.status, isDark);
                  return (
                    <motion.div
                      key={`${b.id}-${isStart ? 'start' : 'end'}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isStart
                          ? 'border-l-4 border-l-emerald-500'
                          : 'border-l-4 border-l-amber-500'
                      } ${
                        isDark
                          ? 'bg-white/[0.04] border-t-white/10 border-r-white/10 border-b-white/10'
                          : 'bg-white border-t-slate-200 border-r-slate-200 border-b-slate-200 shadow-sm'
                      }`}
                    >
                      {/* Event Type Badge & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border ${
                          isStart
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {isStart ? (
                            <>
                              <LogIn size={13} className="shrink-0" />
                              <span>PENGAMBILAN</span>
                            </>
                          ) : (
                            <>
                              <LogOutIcon size={13} className="shrink-0" />
                              <span>PENGEMBALIAN</span>
                            </>
                          )}
                        </div>

                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.bg}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Car & Customer Info */}
                      <div className="space-y-1">
                        <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {b.car?.nama ?? '-'}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                          Penyewa: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{b.profile?.nama ?? '-'}</strong>
                        </p>
                        <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                          Periode: {new Date(b.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(b.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Detail Link */}
                      <div className={`mt-3 pt-2 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                        <Link
                          to={`/admin/pesanan/${b.id}`}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                            isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                          }`}
                        >
                          <Car size={13} />
                          <span>Lihat Detail Pesanan</span>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}