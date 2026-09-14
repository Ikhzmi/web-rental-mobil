import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { Role } from '@prisma/client';

export const notificationsRouter = Router();

// Wajib terotentikasi untuk semua role
notificationsRouter.use(verifySupabaseToken);

/**
 * Helper untuk membangun klausa WHERE Prisma sesuai role pengguna
 */
function buildNotificationWhereClause(user: { id: string; role: Role; instansiId?: string | null }) {
  if (user.role === Role.super_admin) {
    return {
      OR: [
        { userId: user.id },
        { targetRole: Role.super_admin },
      ],
    };
  }

  if (user.role === Role.admin && user.instansiId) {
    return {
      OR: [
        { userId: user.id },
        { instansiId: user.instansiId },
      ],
    };
  }

  // Default: Customer / User personal
  return {
    userId: user.id,
  };
}

/**
 * GET /api/notifications
 * Mengambil daftar notifikasi pengguna dengan filter unreadOnly, pagination
 */
notificationsRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const baseWhere = buildNotificationWhereClause(user);
    const where = unreadOnly ? { ...baseWhere, isRead: false } : baseWhere;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          ...baseWhere,
          isRead: false,
        },
      }),
    ]);

    res.json({
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[NotificationsRouter] GET / error:', error);
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Mengambil total notifikasi belum dibaca secara efisien (cocok untuk polling badge)
 */
notificationsRouter.get('/unread-count', async (req, res) => {
  try {
    const user = req.user!;
    const baseWhere = buildNotificationWhereClause(user);

    const unreadCount = await prisma.notification.count({
      where: {
        ...baseWhere,
        isRead: false,
      },
    });

    res.json({ data: { unreadCount } });
  } catch (error) {
    console.error('[NotificationsRouter] GET /unread-count error:', error);
    res.status(500).json({ error: 'Gagal mengambil hitungan notifikasi' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Menandai satu notifikasi telah dibaca
 */
notificationsRouter.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const baseWhere = buildNotificationWhereClause(user);

    // Pastikan notifikasi ini berhak diakses oleh user yang login
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        ...baseWhere,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Notifikasi tidak ditemukan atau tidak memiliki akses' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('[NotificationsRouter] PATCH /:id/read error:', error);
    res.status(500).json({ error: 'Gagal menandai notifikasi sudah dibaca' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Menandai seluruh notifikasi milik pengguna ini sebagai sudah dibaca
 */
notificationsRouter.post('/mark-all-read', async (req, res) => {
  try {
    const user = req.user!;
    const baseWhere = buildNotificationWhereClause(user);

    const result = await prisma.notification.updateMany({
      where: {
        ...baseWhere,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[NotificationsRouter] POST /mark-all-read error:', error);
    res.status(500).json({ error: 'Gagal menandai semua notifikasi sudah dibaca' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Menghapus notifikasi
 */
notificationsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const baseWhere = buildNotificationWhereClause(user);

    const existing = await prisma.notification.findFirst({
      where: {
        id,
        ...baseWhere,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
      return;
    }

    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[NotificationsRouter] DELETE /:id error:', error);
    res.status(500).json({ error: 'Gagal menghapus notifikasi' });
  }
});
