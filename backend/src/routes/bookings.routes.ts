import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { isCarAvailable } from '../services/availability.service';
import { hitungRincianHarga } from '../services/pricing.service';
import { createBayarGGPayment, isBayarGGConfigured, getBayarGGPaymentUrl } from '../services/bayargg.service';

export const bookingsRouter = Router();

bookingsRouter.use(verifySupabaseToken);

// SECURITY: Rate limiting for payment endpoint
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payment requests per minute per user
  keyGenerator: (req) => req.user?.id || 'anonymous',
  message: { error: 'Terlalu banyak request pembayaran, coba lagi dalam 1 menit' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: UUID validation schema
const uuidSchema = z.string().uuid();

const createBookingSchema = z.object({
  carId: z.string().uuid(),
  tanggalMulai: z.coerce.date(),
  tanggalSelesai: z.coerce.date(),
  lokasiAmbil: z.string().trim().min(1).max(500),
  lokasiKembali: z.string().trim().min(1).max(500),
  addons: z
    .array(
      z.object({
        jenis: z.enum(['sopir', 'asuransi', 'antar_jemput']),
        harga: z.number().nonnegative().optional(),
      })
    )
    .default([]),
});

// SECURITY: Payment method validation (bayar.gg supported methods)
const ALLOWED_PAYMENT_METHODS = [
  // Virtual Account
  'bri_va',    // BRI Virtual Account
  'livin_va',  // Livin by Mandiri
  // QRIS
  'qris',      // QRIS (GoPay, OVO, DANA, ShopeePay, dll)
  // E-Wallet
  'ovo',       // OVO
] as const;

type PaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ALLOWED_PAYMENT_METHODS.includes(method as PaymentMethod);
}

/**
 * POST /api/bookings — F6 Alur Booking, §11.1/§11.2/§11.3 PRD.
 *
 * Overlap-check + insert dibungkus satu transaksi database supaya atomik
 * (§11.2: "wajib dilakukan di dalam transaksi... untuk mencegah dua
 * pelanggan mendapat slot yang sama secara bersamaan"). Harga SELALU
 * dihitung ulang di sini lewat hitungRincianHarga() — angka apa pun yang
 * (mungkin) dikirim klien untuk harga_dasar/total_harga diabaikan total.
 */
bookingsRouter.post('/', async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data booking tidak valid', detail: parsed.error.flatten() });
    return;
  }
  const { carId, tanggalMulai, tanggalSelesai, lokasiAmbil, lokasiKembali, addons } = parsed.data;

  if (tanggalSelesai <= tanggalMulai) {
    res.status(400).json({ error: 'tanggal_selesai harus setelah tanggal_mulai' });
    return;
  }

  try {
    // SECURITY: Serializable isolation level benar-benar dipasang di sini
    // (sebelumnya komentar ini ada tapi isolationLevel TIDAK PERNAH di-set,
    // sehingga Prisma diam-diam pakai default PostgreSQL yaitu Read
    // Committed — di mana dua transaksi concurrent BISA SAMA-SAMA lolos
    // pengecekan isCarAvailable() sebelum salah satunya commit, alias
    // double-booking tetap mungkin terjadi walau kelihatannya "aman"
    // karena dibungkus $transaction).
    //
    // Konsekuensi pakai Serializable: PostgreSQL bisa GAGALKAN salah satu
    // transaksi yang bentrok saat commit (error P2034), bukan mencegahnya
    // di awal — makanya perlu retry loop di bawah ini, ini perilaku normal
    // dan yang diharapkan dari Serializable isolation, bukan bug.
    const MAX_RETRY = 3;
    let booking: Awaited<ReturnType<typeof createBookingTx>> | undefined;
    let lastError: unknown;

    async function createBookingTx(tx: Prisma.TransactionClient) {
      const car = await tx.car.findUnique({ where: { id: carId } });
      // PENTING: sebelumnya hanya cek car.status, TIDAK PERNAH cek
      // statusApproval — ini lapisan pertahanan terakhir (endpoint katalog
      // & detail sudah diperbaiki juga di cars.routes.ts) supaya mobil yang
      // belum disetujui SuperAdmin benar-benar tidak bisa dibooking, bahkan
      // kalau ID-nya didapat dari luar jalur normal (mis. link lama/bocor).
      if (!car || car.status !== 'tersedia' || car.statusApproval !== 'disetujui') {
        throw new Error('MOBIL_TIDAK_TERSEDIA');
      }

      const available = await isCarAvailable(tx, { carId, tanggalMulai, tanggalSelesai });
      if (!available) {
        throw new Error('TANGGAL_BENTROK');
      }

      const rincian = hitungRincianHarga(car, tanggalMulai, tanggalSelesai, addons);

      return tx.booking.create({
        data: {
          userId: req.user!.id,
          carId,
          tanggalMulai,
          tanggalSelesai,
          lokasiAmbil,
          lokasiKembali,
          hargaDasar: rincian.hargaDasar,
          totalAddon: rincian.totalAddon,
          totalHarga: rincian.totalHarga,
          // v2: Status changed from 'pending' to 'menunggu_pembayaran'
          // because now waiting for payment gateway confirmation, not manual admin verification
          status: 'menunggu_pembayaran',
          addons: {
            createMany: {
              data: rincian.addons.map((a) => ({ jenis: a.jenis, harga: a.harga })),
            },
          },
        },
        include: { addons: true, car: true },
      });
    }

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        booking = await prisma.$transaction(createBookingTx, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        // P2034 = write conflict/deadlock terdeteksi PostgreSQL di bawah
        // Serializable isolation — ini kasus yang MEMANG harus di-retry,
        // bukan dianggap gagal permanen.
        const isSerializationConflict =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
        if (!isSerializationConflict || attempt === MAX_RETRY) {
          throw err;
        }
        // Backoff singkat sebelum retry supaya tidak langsung tabrakan lagi
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }

    if (!booking) {
      throw lastError ?? new Error('GAGAL_SETELAH_RETRY');
    }

    res.status(201).json({ data: booking });
  } catch (err) {
    if (err instanceof Error && err.message === 'TANGGAL_BENTROK') {
      res.status(409).json({ error: 'Tanggal yang dipilih sudah terbooking untuk mobil ini' });
      return;
    }
    if (err instanceof Error && err.message === 'MOBIL_TIDAK_TERSEDIA') {
      res.status(409).json({ error: 'Mobil ini sedang tidak tersedia untuk disewa' });
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      // Sudah di-retry MAX_RETRY kali dan tetap bentrok dengan booking lain
      // yang diproses persis bersamaan — beri tahu user untuk coba lagi,
      // bukan MOBIL_TIDAK_TERSEDIA yang menyesatkan (mobilnya tersedia,
      // cuma sedang diperebutkan).
      res.status(409).json({ error: 'Terjadi permintaan booking bersamaan untuk mobil ini, silakan coba lagi' });
      return;
    }
    console.error('POST /api/bookings error:', err);
    res.status(500).json({ error: 'Gagal membuat booking, coba lagi' });
  }
});

/** GET /api/bookings/mine — F7 Riwayat Pesanan. */
bookingsRouter.get('/mine', async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: { car: { include: { images: { orderBy: { urutan: 'asc' }, take: 1 } } }, addons: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: bookings });
});

/** GET /api/bookings/:id — pemilik booking ATAU admin boleh lihat. */
bookingsRouter.get('/:id', async (req, res) => {
  // SECURITY: Validate UUID format
  const idParse = uuidSchema.safeParse(req.params.id);
  if (!idParse.success) {
    res.status(400).json({ error: 'Format ID booking tidak valid' });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      car: true,
      addons: true,
      statusLogs: { orderBy: { createdAt: 'asc' } },
      profile: { select: { nama: true, email: true, noHp: true, dokumenVerified: true } },
    },
  });

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }
  if (booking.userId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Tidak berhak melihat booking ini' });
    return;
  }

  res.json({ data: booking });
});

/** PATCH /api/bookings/:id/cancel — hanya pemilik booking, hanya jika masih `pending`. */
bookingsRouter.patch('/:id/cancel', async (req, res) => {
  // SECURITY: Validate UUID format
  const idParse = uuidSchema.safeParse(req.params.id);
  if (!idParse.success) {
    res.status(400).json({ error: 'Format ID booking tidak valid' });
    return;
  }

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' });
    return;
  }
  if (booking.userId !== req.user!.id) {
    res.status(403).json({ error: 'Tidak berhak membatalkan booking ini' });
    return;
  }
  if (booking.status !== 'menunggu_pembayaran') {
    res.status(409).json({ error: 'Booking hanya bisa dibatalkan selagi menunggu pembayaran' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'dibatalkan' },
    });
    await tx.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        statusLama: 'pending',
        statusBaru: 'dibatalkan',
        diubahOleh: req.user!.id,
      },
    });
    return b;
  });

  res.json({ data: updated });
});

/**
 * POST /api/bookings/:id/checkout
 * Membuat invoice bayar.gg untuk booking ini
 * Customer akan diarahkan ke halaman pembayaran bayar.gg
 */
bookingsRouter.post('/:id/checkout', async (req, res) => {
  // SECURITY: Validate UUID format
  const idParse = uuidSchema.safeParse(req.params.id);
  if (!idParse.success) {
    res.status(400).json({ error: 'Format ID booking tidak valid' });
    return;
  }

  const bookingId = req.params.id;

  try {
    // Ambil booking dengan relasi
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: {
          include: { instansi: { select: { namaInstansi: true } } },
        },
        profile: { select: { nama: true, email: true, noHp: true } },
        payment: true,
      },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking tidak ditemukan' });
      return;
    }

    // Verify ownership
    if (booking.userId !== req.user!.id) {
      res.status(403).json({ error: 'Tidak berhak mengakses booking ini' });
      return;
    }

    // Check if booking is still awaiting payment
    if (booking.status !== 'menunggu_pembayaran') {
      res.status(400).json({
        error: 'Booking ini tidak bisa dibayar',
        currentStatus: booking.status,
      });
      return;
    }

    // Check if payment already exists (return existing invoice URL)
    if (booking.payment?.gatewayInvoiceId) {
      res.json({
        data: {
          bookingId: booking.id,
          status: booking.payment.status,
          invoiceUrl: getBayarGGPaymentUrl(booking.payment.gatewayInvoiceId),
          invoiceId: booking.payment.gatewayInvoiceId,
          gateway: 'bayar.gg',
          message: 'Invoice sudah dibuat sebelumnya',
        },
      });
      return;
    }

    // Check if bayar.gg is configured
    if (!isBayarGGConfigured()) {
      res.status(503).json({
        error: 'Payment gateway belum dikonfigurasi',
        hint: 'Hubungi admin untuk setup bayar.gg',
      });
      return;
    }

    // Create bayar.gg payment
    const result = await createBayarGGPayment({
      bookingId: booking.id,
      amount: Number(booking.totalHarga),
      customerEmail: booking.profile.email,
      customerName: booking.profile.nama,
      customerPhone: booking.profile.noHp,
      description: `Sewa Mobil ${booking.car.nama} - ${booking.car.instansi.namaInstansi}`,
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Gagal membuat invoice' });
      return;
    }

    // Create payment record with gateway IDs
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        gatewayInvoiceId: result.invoiceId,
        gatewayOrderId: result.invoiceId,
        metodeBayar: 'virtual_account',
        jumlah: Number(booking.totalHarga),
        status: 'pending',
      },
    });

    res.json({
      data: {
        bookingId: booking.id,
        invoiceUrl: result.paymentUrl,
        invoiceId: result.invoiceId,
        qrisString: result.qrisString,
        amount: Number(booking.totalHarga),
        gateway: 'bayar.gg',
        expiresAt: result.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/bookings/:id/checkout error:', error);
    res.status(500).json({ error: 'Gagal memproses checkout' });
  }
});

/**
 * GET /api/bookings/:id/payment-status
 * Cek status pembayaran booking (untuk polling)
 */
bookingsRouter.get('/:id/payment-status', async (req, res) => {
  const bookingId = req.params.id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
      },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking tidak ditemukan' });
      return;
    }

    // Verify ownership
    if (booking.userId !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ error: 'Tidak berhak mengakses booking ini' });
      return;
    }

    res.json({
      data: {
        bookingId: booking.id,
        bookingStatus: booking.status,
        paymentStatus: booking.payment?.status ?? null,
        paymentId: booking.payment?.id ?? null,
        gatewayInvoiceId: booking.payment?.gatewayInvoiceId ?? null,
        gateway: 'bayar.gg',
      },
    });
  } catch (error) {
    console.error('GET /api/bookings/:id/payment-status error:', error);
    res.status(500).json({ error: 'Gagal mengambil status pembayaran' });
  }
});

/**
 * POST /api/bookings/:id/payment
 * Membuat pembayaran bayar.gg dengan metode pembayaran yang dipilih
 * Endpoint baru untuk flow dengan halaman pemilihan metode pembayaran
 *
 * SECURITY MEASURES:
 * - UUID validation on booking ID
 * - Explicit payment method validation
 * - Rate limiting (5 requests per minute per user)
 */
bookingsRouter.post('/:id/payment', paymentLimiter, async (req, res) => {
  // SECURITY: Validate UUID format
  const bookingIdParse = uuidSchema.safeParse(req.params.id);
  if (!bookingIdParse.success) {
    res.status(400).json({ error: 'Format ID booking tidak valid' });
    return;
  }

  const bookingId = bookingIdParse.data;
  const { paymentMethod } = req.body;

  // SECURITY: Validate payment method explicitly
  if (!paymentMethod || typeof paymentMethod !== 'string') {
    res.status(400).json({ error: 'Metode pembayaran diperlukan' });
    return;
  }

  // SECURITY: Strict payment method validation
  if (!isValidPaymentMethod(paymentMethod)) {
    res.status(400).json({
      error: 'Metode pembayaran tidak valid',
      allowed: ALLOWED_PAYMENT_METHODS,
    });
    return;
  }

  try {
    // Ambil booking dengan relasi
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: {
          include: { instansi: { select: { namaInstansi: true } } },
        },
        profile: { select: { nama: true, email: true, noHp: true } },
        payment: true,
      },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking tidak ditemukan' });
      return;
    }

    // Verify ownership
    if (booking.userId !== req.user!.id) {
      res.status(403).json({ error: 'Tidak berhak mengakses booking ini' });
      return;
    }

    // Check if booking is still awaiting payment
    if (booking.status !== 'menunggu_pembayaran') {
      res.status(400).json({
        error: 'Booking ini tidak bisa dibayar',
      });
      return;
    }

    // Check if payment already exists
    if (booking.payment?.gatewayInvoiceId) {
      // Return existing payment info
      res.json({
        data: {
          bookingId: booking.id,
          gatewayInvoiceId: booking.payment.gatewayInvoiceId,
          paymentMethod: booking.payment.metodeBayar,
          status: booking.payment.status,
          gateway: 'bayar.gg',
          message: 'Pembayaran sudah dibuat sebelumnya',
        },
      });
      return;
    }

    // Check if bayar.gg is configured
    if (!isBayarGGConfigured()) {
      res.status(503).json({
        error: 'Payment gateway belum dikonfigurasi',
      });
      return;
    }

    // Create bayar.gg payment with selected payment method
    const result = await createBayarGGPayment({
      bookingId: booking.id,
      amount: Number(booking.totalHarga),
      customerEmail: booking.profile.email,
      customerName: booking.profile.nama,
      customerPhone: booking.profile.noHp,
      description: `Sewa Mobil ${booking.car.nama} - ${booking.car.instansi.namaInstansi}`,
      paymentMethod: paymentMethod,
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Gagal membuat pembayaran' });
      return;
    }

    // Create payment record with gateway IDs
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        gatewayInvoiceId: result.invoiceId,
        gatewayOrderId: result.invoiceId,
        metodeBayar: paymentMethodToMetodeBayar(paymentMethod),
        jumlah: Number(booking.totalHarga),
        status: 'pending',
      },
    });

    res.json({
      data: {
        bookingId: booking.id,
        gatewayInvoiceId: result.invoiceId,
        paymentUrl: result.paymentUrl,
        qrisString: result.qrisString,
        expiresAt: result.expiresAt,
        paymentMethod: paymentMethod,
        amount: Number(booking.totalHarga),
        gateway: 'bayar.gg',
      },
    });
  } catch (error) {
    console.error('POST /api/bookings/:id/payment error:', error);
    res.status(500).json({ error: 'Gagal memproses pembayaran' });
  }
});

/**
 * Helper function to convert payment method ID to MetodeBayar enum
 */
function paymentMethodToMetodeBayar(method: string): 'virtual_account' | 'qris' | 'ewallet' | 'kartu_kredit' {
  if (method.includes('va')) return 'virtual_account';
  if (method === 'qris') return 'qris';
  if (['shopeepay', 'dana', 'ovo'].includes(method)) return 'ewallet';
  return 'virtual_account'; // default
}