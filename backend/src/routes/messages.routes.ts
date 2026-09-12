import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken, requireAdmin } from '../middleware/verifySupabaseToken';

// ==========================================
// 1. CUSTOMER MESSAGES ROUTER (/api/messages)
// ==========================================
export const customerMessagesRouter = Router();
customerMessagesRouter.use(verifySupabaseToken);

const createConversationSchema = z.object({
  instansiId: z.string().uuid(),
  carId: z.string().uuid().optional(),
});

const sendMessageSchema = z.object({
  pesan: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(2000, 'Pesan maksimal 2000 karakter'),
  carId: z.string().uuid().optional(),
});

/**
 * GET /api/messages/unread-count
 * Menghitung total pesan belum dibaca oleh customer.
 */
customerMessagesRouter.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user!.id;
    const count = await prisma.conversation.aggregate({
      where: { customerId: userId },
      _sum: { unreadCustomerCount: true },
    });

    res.json({ data: { unreadCount: count._sum.unreadCustomerCount ?? 0 } });
  } catch (error) {
    console.error('[customerMessages] get unread count error:', error);
    res.status(500).json({ error: 'Gagal menghitung pesan belum dibaca' });
  }
});

/**
 * GET /api/messages/conversations
 * Mengambil semua percakapan milik customer yang sedang login.
 */
customerMessagesRouter.get('/conversations', async (req, res) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        customerId: userId,
        // Hanya tampilkan percakapan yang sudah ada pesan
        lastMessageText: { not: null },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        instansi: {
          select: {
            id: true,
            namaInstansi: true,
            noHpPic: true,
            alamat: true,
          },
        },
        car: {
          select: {
            id: true,
            nama: true,
            hargaPerHari: true,
            images: {
              take: 1,
              orderBy: { urutan: 'asc' },
              select: { url: true },
            },
          },
        },
      },
    });

    res.json({ data: conversations });
  } catch (error) {
    console.error('[customerMessages] get conversations error:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar percakapan' });
  }
});

/**
 * POST /api/messages/conversations
 * Cari atau buat percakapan baru dengan instansi rental.
 */
customerMessagesRouter.post('/conversations', async (req, res) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Data tidak valid', detail: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.id;
    const { instansiId, carId } = parsed.data;

    // Pastikan instansi valid
    const instansi = await prisma.instansi.findUnique({
      where: { id: instansiId },
      select: { id: true, namaInstansi: true },
    });
    if (!instansi) {
      res.status(404).json({ error: 'Instansi rental tidak ditemukan' });
      return;
    }

    // Cari percakapan yang sudah ada atau buat baru
    let conversation = await prisma.conversation.findUnique({
      where: {
        customerId_instansiId: {
          customerId: userId,
          instansiId,
        },
      },
      include: {
        instansi: {
          select: { id: true, namaInstansi: true, noHpPic: true, alamat: true },
        },
        car: {
          select: {
            id: true,
            nama: true,
            hargaPerHari: true,
            images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
          },
        },
      },
    });

    if (conversation) {
      // Jika ada konteks carId baru yang disertakan, perbarui carId percakapan
      if (carId && conversation.carId !== carId) {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { carId },
          include: {
            instansi: {
              select: { id: true, namaInstansi: true, noHpPic: true, alamat: true },
            },
            car: {
              select: {
                id: true,
                nama: true,
                hargaPerHari: true,
                images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
              },
            },
          },
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          customerId: userId,
          instansiId,
          carId: carId || null,
          lastMessageText: null,
        },
        include: {
          instansi: {
            select: { id: true, namaInstansi: true, noHpPic: true, alamat: true },
          },
          car: {
            select: {
              id: true,
              nama: true,
              hargaPerHari: true,
              images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
            },
          },
        },
      });
    }

    res.json({ data: conversation });
  } catch (error) {
    console.error('[customerMessages] create conversation error:', error);
    res.status(500).json({ error: 'Gagal membuat/membuka percakapan' });
  }
});

/**
 * GET /api/messages/conversations/:id
 * Mengambil detail obrolan & riwayat pesan, sekaligus menandai pesan sebagai terbaca.
 */
customerMessagesRouter.get('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        instansi: {
          select: { id: true, namaInstansi: true, noHpPic: true, alamat: true },
        },
        car: {
          select: {
            id: true,
            nama: true,
            hargaPerHari: true,
            images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            car: {
              select: {
                id: true,
                nama: true,
                hargaPerHari: true,
                images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
              },
            },
          },
        },
      },
    });

    if (!conversation || conversation.customerId !== userId) {
      res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      return;
    }

    // Mark customer unread as read
    if (conversation.unreadCustomerCount > 0) {
      await prisma.$transaction([
        prisma.conversation.update({
          where: { id },
          data: { unreadCustomerCount: 0 },
        }),
        prisma.chatMessage.updateMany({
          where: { conversationId: id, senderRole: 'admin', isRead: false },
          data: { isRead: true },
        }),
      ]);
      conversation.unreadCustomerCount = 0;
    }

    // Hitung isOnline: cari admin instansi yang lastSeenAt < 5 menit
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineAdmin = await prisma.profile.findFirst({
      where: {
        instansiId: conversation.instansiId,
        role: { in: ['admin', 'super_admin'] },
        lastSeenAt: { gte: fiveMinutesAgo },
      },
      select: { lastSeenAt: true },
    });

    res.json({
      data: {
        ...conversation,
        instansi: {
          ...conversation.instansi,
          adminLastSeenAt: onlineAdmin?.lastSeenAt ?? null,
          isOnline: Boolean(onlineAdmin),
        },
      },
    });
  } catch (error) {
    console.error('[customerMessages] get conversation detail error:', error);
    res.status(500).json({ error: 'Gagal memuat percakapan' });
  }
});

/**
 * POST /api/messages/conversations/:id/messages
 * Mengirim pesan dari customer ke instansi rental.
 */
customerMessagesRouter.post('/conversations/:id/messages', async (req, res) => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Pesan tidak valid', detail: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.id;
    const { id } = req.params;
    const { pesan, carId } = parsed.data;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, customerId: true, instansiId: true },
    });

    if (!conversation || conversation.customerId !== userId) {
      res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      return;
    }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId: id,
          senderId: userId,
          senderRole: 'customer',
          pesan,
          carId: carId || null,
        },
        include: {
          car: {
            select: {
              id: true,
              nama: true,
              hargaPerHari: true,
              images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
            },
          },
        },
      }),
      prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: pesan,
          unreadAdminCount: { increment: 1 },
          ...(carId ? { carId } : {}),
        },
      }),
    ]);

    res.status(201).json({ data: message });
  } catch (error) {
    console.error('[customerMessages] send message error:', error);
    res.status(500).json({ error: 'Gagal mengirim pesan' });
  }
});

// ==========================================
// 2. ADMIN MESSAGES ROUTER (/api/admin/messages)
// ==========================================
export const adminMessagesRouter = Router();
adminMessagesRouter.use(verifySupabaseToken, requireAdmin);

/**
 * GET /api/admin/messages/unread-count
 * Mengambil total unread count untuk admin instansi.
 */
adminMessagesRouter.get('/unread-count', async (req, res) => {
  try {
    const instansiId = req.user?.instansiId;
    if (!instansiId && req.user?.role !== 'super_admin') {
      res.status(403).json({ error: 'Akun admin tidak terikat ke instansi' });
      return;
    }

    const where = req.user?.role === 'super_admin' ? {} : { instansiId };
    const count = await prisma.conversation.aggregate({
      where,
      _sum: { unreadAdminCount: true },
    });

    res.json({ data: { unreadCount: count._sum.unreadAdminCount ?? 0 } });
  } catch (error) {
    console.error('[adminMessages] get unread count error:', error);
    res.status(500).json({ error: 'Gagal menghitung pesan masuk' });
  }
});

/**
 * GET /api/admin/messages/conversations
 * Mengambil daftar percakapan yang masuk ke instansi admin.
 */
adminMessagesRouter.get('/conversations', async (req, res) => {
  try {
    const instansiId = req.user?.instansiId;
    if (!instansiId && req.user?.role !== 'super_admin') {
      res.status(403).json({ error: 'Akun admin tidak terikat ke instansi' });
      return;
    }

    const where = req.user?.role === 'super_admin' ? {} : { instansiId };

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            nama: true,
            email: true,
            noHp: true,
          },
        },
        car: {
          select: {
            id: true,
            nama: true,
            hargaPerHari: true,
            images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
          },
        },
      },
    });

    res.json({ data: conversations });
  } catch (error) {
    console.error('[adminMessages] get conversations error:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar percakapan' });
  }
});

/**
 * GET /api/admin/messages/conversations/:id
 * Mengambil pesan dalam percakapan & menandai pesan terbaca oleh admin.
 */
adminMessagesRouter.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const instansiId = req.user?.instansiId;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            nama: true,
            email: true,
            noHp: true,
          },
        },
        car: {
          select: {
            id: true,
            nama: true,
            hargaPerHari: true,
            images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            car: {
              select: {
                id: true,
                nama: true,
                hargaPerHari: true,
                images: { take: 1, orderBy: { urutan: 'asc' }, select: { url: true } },
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      return;
    }

    // Scoping check for non super-admin
    if (req.user?.role !== 'super_admin' && conversation.instansiId !== instansiId) {
      res.status(403).json({ error: 'Akses ditolak untuk instansi ini' });
      return;
    }

    // Mark admin unread as read
    if (conversation.unreadAdminCount > 0) {
      await prisma.$transaction([
        prisma.conversation.update({
          where: { id },
          data: { unreadAdminCount: 0 },
        }),
        prisma.chatMessage.updateMany({
          where: { conversationId: id, senderRole: 'customer', isRead: false },
          data: { isRead: true },
        }),
      ]);
      conversation.unreadAdminCount = 0;
    }

    res.json({ data: conversation });
  } catch (error) {
    console.error('[adminMessages] get conversation detail error:', error);
    res.status(500).json({ error: 'Gagal memuat percakapan' });
  }
});

/**
 * POST /api/admin/messages/conversations/:id/messages
 * Admin membalas pesan customer.
 */
adminMessagesRouter.post('/conversations/:id/messages', async (req, res) => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Pesan tidak valid', detail: parsed.error.flatten() });
      return;
    }

    const { id } = req.params;
    const instansiId = req.user?.instansiId;
    const { pesan } = parsed.data;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, instansiId: true },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      return;
    }

    if (req.user?.role !== 'super_admin' && conversation.instansiId !== instansiId) {
      res.status(403).json({ error: 'Akses ditolak untuk instansi ini' });
      return;
    }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId: id,
          senderId: req.user!.id,
          senderRole: 'admin',
          pesan,
        },
      }),
      prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: pesan,
          unreadCustomerCount: { increment: 1 },
        },
      }),
    ]);

    res.status(201).json({ data: message });
  } catch (error) {
    console.error('[adminMessages] send message error:', error);
    res.status(500).json({ error: 'Gagal mengirim pesan' });
  }
});
