import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

// ============================================================================
// NOTIFICATION SERVICE (Multi-Role: Customer, Admin Instansi, Super Admin)
// ============================================================================

export type NotificationType =
  | 'booking'
  | 'payment'
  | 'approval'
  | 'disbursement'
  | 'review'
  | 'system'
  | 'chat';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    actionUrl?: string;
    bookingId?: string;
    carId?: string;
    instansiId?: string;
    paymentId?: string;
    disbursementId?: string;
    amount?: number | string;
    [key: string]: any;
  };
}

/**
 * 1. Kirim notifikasi ke spesifik Customer / User pribadi
 */
export async function notifyUser(
  userId: string,
  payload: CreateNotificationPayload
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ?? {},
      },
    });
  } catch (error) {
    console.error(`[NotificationService] Error notifying user ${userId}:`, error);
  }
}

/**
 * 2. Kirim notifikasi ke Instansi Rental (bisa diakses oleh semua admin instansi tersebut)
 */
export async function notifyInstansi(
  instansiId: string,
  payload: CreateNotificationPayload
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        instansiId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ?? {},
      },
    });
  } catch (error) {
    console.error(`[NotificationService] Error notifying instansi ${instansiId}:`, error);
  }
}

/**
 * 3. Kirim notifikasi ke semua Super Admin platform
 */
export async function notifySuperAdmins(
  payload: CreateNotificationPayload
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        targetRole: Role.super_admin,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ?? {},
      },
    });
  } catch (error) {
    console.error('[NotificationService] Error notifying super admins:', error);
  }
}
