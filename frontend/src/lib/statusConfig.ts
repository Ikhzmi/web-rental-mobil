import type { StatusMobil } from './api';
import type { StatusDisbursement } from './api';
import type { ComponentType } from 'react';
import { Clock, CheckCircle, XCircle, Car, AlertCircle } from 'lucide-react';

/**
 * Extended status config with icon support
 */
export interface StatusConfigWithIcon {
  bg: string;
  border: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

/**
 * Status configuration for car status badges
 */
export interface StatusConfig {
  bg: string;
  border: string;
  label: string;
}

export const CAR_STATUS_CONFIG: Record<StatusMobil, StatusConfig> = {
  tersedia: {
    bg: 'bg-emerald-500/20 text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Tersedia',
  },
  maintenance: {
    bg: 'bg-amber-500/20 text-amber-400',
    border: 'border-amber-500/30',
    label: 'Maintenance',
  },
  nonaktif: {
    bg: 'bg-white/10 text-white/40',
    border: 'border-white/20',
    label: 'Nonaktif',
  },
};

export const CAR_STATUS_CONFIG_LIGHT: Record<StatusMobil, StatusConfig> = {
  tersedia: {
    bg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    label: 'Tersedia',
  },
  maintenance: {
    bg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    label: 'Maintenance',
  },
  nonaktif: {
    bg: 'bg-slate-100 text-slate-500',
    border: 'border-slate-200',
    label: 'Nonaktif',
  },
};

/**
 * Booking status configuration
 */
export type BookingStatus = 'menunggu_pembayaran' | 'dikonfirmasi' | 'berjalan' | 'selesai' | 'dibatalkan';

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  menunggu_pembayaran: {
    bg: 'bg-amber-500/20 text-amber-400',
    border: 'border-amber-500/30',
    label: 'Menunggu Pembayaran',
  },
  dikonfirmasi: {
    bg: 'bg-blue-500/20 text-blue-400',
    border: 'border-blue-500/30',
    label: 'Dikonfirmasi',
  },
  berjalan: {
    bg: 'bg-purple-500/20 text-purple-400',
    border: 'border-purple-500/30',
    label: 'Berjalan',
  },
  selesai: {
    bg: 'bg-emerald-500/20 text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Selesai',
  },
  dibatalkan: {
    bg: 'bg-red-500/20 text-red-400',
    border: 'border-red-500/30',
    label: 'Dibatalkan',
  },
};

export const BOOKING_STATUS_CONFIG_LIGHT: Record<BookingStatus, StatusConfig> = {
  menunggu_pembayaran: {
    bg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    label: 'Menunggu Pembayaran',
  },
  dikonfirmasi: {
    bg: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    label: 'Dikonfirmasi',
  },
  berjalan: {
    bg: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
    label: 'Berjalan',
  },
  selesai: {
    bg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    label: 'Selesai',
  },
  dibatalkan: {
    bg: 'bg-red-100 text-red-700',
    border: 'border-red-200',
    label: 'Dibatalkan',
  },
};

/**
 * Approval status configuration for Super Admin
 */
export const APPROVAL_STATUS_CONFIG: Record<string, StatusConfig> = {
  disetujui: {
    bg: 'bg-emerald-500/20 text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Disetujui',
  },
  menunggu_persetujuan: {
    bg: 'bg-amber-500/20 text-amber-400',
    border: 'border-amber-500/30',
    label: 'Menunggu',
  },
  ditolak: {
    bg: 'bg-red-500/20 text-red-400',
    border: 'border-red-500/30',
    label: 'Ditolak',
  },
};

export const APPROVAL_STATUS_CONFIG_LIGHT: Record<string, StatusConfig> = {
  disetujui: {
    bg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    label: 'Disetujui',
  },
  menunggu_persetujuan: {
    bg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    label: 'Menunggu',
  },
  ditolak: {
    bg: 'bg-red-100 text-red-700',
    border: 'border-red-200',
    label: 'Ditolak',
  },
};

/**
 * Get status config based on theme
 */
export function getStatusConfig<T extends string>(
  status: T,
  isDark: boolean,
  darkConfig: Record<string, StatusConfig>,
  lightConfig: Record<string, StatusConfig>
): StatusConfig {
  return isDark ? darkConfig[status] : lightConfig[status];
}

/**
 * Get car status config based on theme
 */
export function getCarStatusConfig(status: StatusMobil, isDark: boolean): StatusConfig {
  return isDark ? CAR_STATUS_CONFIG[status] : CAR_STATUS_CONFIG_LIGHT[status];
}

/**
 * Get booking status config based on theme
 */
export function getBookingStatusConfig(status: string, isDark: boolean): StatusConfig {
  const darkConfig = BOOKING_STATUS_CONFIG as Record<string, StatusConfig>;
  const lightConfig = BOOKING_STATUS_CONFIG_LIGHT as Record<string, StatusConfig>;
  return isDark ? darkConfig[status] : lightConfig[status];
}

/**
 * Get approval status config based on theme
 */
export function getApprovalStatusConfig(status: string, isDark: boolean): StatusConfig {
  return isDark ? APPROVAL_STATUS_CONFIG[status] : APPROVAL_STATUS_CONFIG_LIGHT[status];
}

/**
 * Disbursement status configuration
 */
export const DISBURSEMENT_STATUS_CONFIG: Record<StatusDisbursement, StatusConfig> = {
  berhasil: { bg: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/30', label: 'Berhasil' },
  diproses: { bg: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30', label: 'Diproses' },
  gagal: { bg: 'bg-red-500/20 text-red-400', border: 'border-red-500/30', label: 'Gagal' },
};

export const DISBURSEMENT_STATUS_CONFIG_LIGHT: Record<StatusDisbursement, StatusConfig> = {
  berhasil: { bg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', label: 'Berhasil' },
  diproses: { bg: 'bg-amber-100 text-amber-700', border: 'border-amber-200', label: 'Diproses' },
  gagal: { bg: 'bg-red-100 text-red-700', border: 'border-red-200', label: 'Gagal' },
};

/**
 * Get disbursement status config based on theme
 */
export function getDisbursementStatusConfig(status: StatusDisbursement, isDark: boolean): StatusConfig {
  return isDark ? DISBURSEMENT_STATUS_CONFIG[status] : DISBURSEMENT_STATUS_CONFIG_LIGHT[status];
}

/**
 * Booking status config with icons
 */
export const BOOKING_STATUS_WITH_ICON: Record<BookingStatus, StatusConfigWithIcon> = {
  menunggu_pembayaran: { bg: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30', label: 'Menunggu Bayar', icon: Clock },
  dikonfirmasi: { bg: 'bg-blue-500/20 text-blue-400', border: 'border-blue-500/30', label: 'Dikonfirmasi', icon: CheckCircle },
  berjalan: { bg: 'bg-purple-500/20 text-purple-400', border: 'border-purple-500/30', label: 'Berjalan', icon: Car },
  selesai: { bg: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/30', label: 'Selesai', icon: CheckCircle },
  dibatalkan: { bg: 'bg-red-500/20 text-red-400', border: 'border-red-500/30', label: 'Dibatalkan', icon: XCircle },
};

export const BOOKING_STATUS_WITH_ICON_LIGHT: Record<BookingStatus, StatusConfigWithIcon> = {
  menunggu_pembayaran: { bg: 'bg-amber-100 text-amber-700', border: 'border-amber-200', label: 'Menunggu Bayar', icon: Clock },
  dikonfirmasi: { bg: 'bg-blue-100 text-blue-700', border: 'border-blue-200', label: 'Dikonfirmasi', icon: CheckCircle },
  berjalan: { bg: 'bg-purple-100 text-purple-700', border: 'border-purple-200', label: 'Berjalan', icon: Car },
  selesai: { bg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', label: 'Selesai', icon: CheckCircle },
  dibatalkan: { bg: 'bg-red-100 text-red-700', border: 'border-red-200', label: 'Dibatalkan', icon: XCircle },
};

/**
 * Get booking status config with icon based on theme
 */
export function getBookingStatusWithIcon(status: BookingStatus, isDark: boolean): StatusConfigWithIcon {
  return isDark ? BOOKING_STATUS_WITH_ICON[status] : BOOKING_STATUS_WITH_ICON_LIGHT[status];
}

/**
 * Instansi status configuration
 */
export const INSTANSI_STATUS_CONFIG: Record<string, StatusConfigWithIcon> = {
  aktif: { bg: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/30', label: 'Aktif', icon: CheckCircle },
  menunggu_verifikasi: { bg: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30', label: 'Menunggu', icon: AlertCircle },
  nonaktif: { bg: 'bg-red-500/20 text-red-400', border: 'border-red-500/30', label: 'Nonaktif', icon: XCircle },
};

export const INSTANSI_STATUS_CONFIG_LIGHT: Record<string, StatusConfigWithIcon> = {
  aktif: { bg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', label: 'Aktif', icon: CheckCircle },
  menunggu_verifikasi: { bg: 'bg-amber-100 text-amber-700', border: 'border-amber-200', label: 'Menunggu', icon: AlertCircle },
  nonaktif: { bg: 'bg-red-100 text-red-700', border: 'border-red-200', label: 'Nonaktif', icon: XCircle },
};

/**
 * Get instansi status config based on theme
 */
export function getInstansiStatusConfig(status: string, isDark: boolean): StatusConfigWithIcon {
  return isDark ? INSTANSI_STATUS_CONFIG[status] : INSTANSI_STATUS_CONFIG_LIGHT[status];
}
