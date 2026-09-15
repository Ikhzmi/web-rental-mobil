import { prisma } from '../lib/prisma';

export type AdminActivityAction =
  | 'login'
  | 'create_admin'
  | 'create_car'
  | 'update_car'
  | 'update_booking_status'
  | 'update_settings';

export interface LogAdminActivityParams {
  instansiId: string;
  userId?: string;
  action: AdminActivityAction;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Mencatat log aktivitas admin instansi (login, create, edit, dsb.)
 * Disimpan pada tabel notifications dengan type: 'admin_activity'
 * dan scoped ke instansiId masing-masing.
 */
export async function logAdminActivity({
  instansiId,
  userId,
  action,
  title,
  description,
  metadata = {},
}: LogAdminActivityParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        instansiId,
        userId: userId || undefined,
        type: 'admin_activity',
        title,
        message: description,
        data: {
          action,
          ...metadata,
        },
      },
    });
  } catch (error) {
    console.error('[ActivityService] Gagal mencatat aktivitas admin:', error);
  }
}
