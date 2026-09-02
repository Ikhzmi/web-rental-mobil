import { Router } from 'express';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { verifyPakasirWebhook, isPakasirConfigured } from '../services/pakasir.service';
import { getSystemActorId } from '../lib/systemActor';
import { sendBookingConfirmedEmail, sendBookingCancelledEmail } from '../services/email.service';

export const webhooksRouter = Router();

// ============================================================================
// SECURITY: Audit Logging Helper
// ============================================================================

function logPaymentAudit(
  event: string,
  data: {
    bookingId?: string;
    paymentId?: string;
    transactionId?: string;
    amount?: string | number;
    status?: string;
    ip?: string;
    error?: string;
  }
) {
  console.log(`[PAYMENT_AUDIT] ${event}`, {
    timestamp: new Date().toISOString(),
    bookingId: data.bookingId,
    paymentId: data.paymentId,
    transactionId: data.transactionId,
    status: data.status,
    ...(data.error && { error: data.error }),
  });
}

// ============================================================================
// PAKASIR WEBHOOK HANDLER
// ============================================================================

async function handlePakasirWebhook(req: any, res: any) {
  const bodyString = JSON.stringify(req.body);
  const { order_id, status, amount, completed_at, project } = req.body || {};

  logPaymentAudit('PAKASIR_WEBHOOK_RECEIVED', {
    ip: req.ip,
    status: status,
    transactionId: order_id,
    amount,
  });

  if (!verifyPakasirWebhook(req.body)) {
    logPaymentAudit('PAKASIR_WEBHOOK_REJECTED', {
      ip: req.ip,
      error: 'Invalid project slug or payload',
    });
    res.status(401).json({ error: 'Invalid webhook payload' });
    return;
  }

  try {
    if (!order_id) {
      logPaymentAudit('PAKASIR_WEBHOOK_NO_ORDER', { ip: req.ip });
      res.status(200).json({ received: true });
      return;
    }

    const eventType = (status || 'UNKNOWN').toUpperCase();

    logPaymentAudit('PAKASIR_WEBHOOK_PROCESSING', {
      transactionId: order_id,
      status: eventType,
      amount: amount,
      ip: req.ip,
    });

    // Find payment record using gatewayInvoiceId or gatewayOrderId
    let payment = await prisma.payment.findFirst({
      where: { gatewayInvoiceId: order_id },
      include: { booking: true },
    });

    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: { gatewayOrderId: order_id },
        include: { booking: true },
      });
    }

    if (!payment) {
      logPaymentAudit('PAKASIR_WEBHOOK_PAYMENT_NOT_FOUND', {
        transactionId: order_id,
        ip: req.ip,
      });
      res.status(200).json({ received: true });
      return;
    }

    await processPakasirWebhook(payment, order_id, eventType, completed_at, bodyString, req.ip, amount);

    res.status(200).json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logPaymentAudit('PAKASIR_WEBHOOK_ERROR', {
      ip: req.ip,
      error: errorMessage,
    });

    res.status(500).json({ error: 'Internal processing error' });
  }
}

/**
 * POST /api/webhooks/pakasir
 */
webhooksRouter.post('/pakasir', handlePakasirWebhook);



/**
 * Process Pakasir webhook for status update
 */
async function processPakasirWebhook(
  payment: {
    id: string;
    jumlah: unknown;
    booking: {
      id: string;
      userId: string;
      status: string;
    };
  },
  transactionId: string,
  eventType: string,
  completedAt: string | undefined,
  bodyString: string,
  ip: string | undefined,
  amount?: number
) {
  const existingLog = await prisma.webhookLog.findFirst({
    where: {
      transactionId: transactionId,
      eventType: eventType,
    },
  });

  if (existingLog) {
    logPaymentAudit('PAKASIR_WEBHOOK_DUPLICATE', {
      paymentId: payment.id,
      transactionId: transactionId,
      status: eventType,
      ip: ip,
    });
    return;
  }

  const normalizedStatus = eventType.toLowerCase();

  if (normalizedStatus === 'completed' || normalizedStatus === 'paid' || normalizedStatus === 'success') {
    await handlePakasirPaymentPaid(payment.id, payment.booking.id, transactionId, completedAt, amount);
  } else if (normalizedStatus === 'expired') {
    await handlePakasirPaymentExpired(payment.id, payment.booking.id);
  } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    await handlePakasirPaymentFailed(payment.id);
  } else {
    logPaymentAudit('PAKASIR_WEBHOOK_UNHANDLED_STATUS', {
      paymentId: payment.id,
      transactionId: transactionId,
      status: eventType,
    });
  }

  const requestHash = createHash('sha256').update(bodyString).digest('hex').slice(0, 32);
  await prisma.webhookLog.create({
    data: {
      paymentId: payment.id,
      transactionId: transactionId,
      eventType: eventType,
      requestHash: requestHash,
    },
  });

  logPaymentAudit('PAKASIR_WEBHOOK_PROCESSED', {
    bookingId: payment.booking.id,
    paymentId: payment.id,
    transactionId: transactionId,
    status: eventType,
    amount: amount,
  });
}

// ============================================================================
// PAKASIR WEBHOOK HANDLERS (ATOMIC OPERATIONS)
// ============================================================================

// Exported handlers for on-demand payment status sync (polling)
export { handlePakasirPaymentPaid, handlePakasirPaymentExpired };

async function handlePakasirPaymentPaid(
  paymentId: string,
  bookingId: string,
  transactionId: string,
  paidAt?: string,
  amount?: number
) {
  const systemActorId = await getSystemActorId();
  let confirmedBookingInfo: {
    email: string;
    nama: string;
    carNama: string;
    tanggalMulai: Date;
    tanggalSelesai: Date;
  } | null = null;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (payment?.status === 'paid') {
      logPaymentAudit('PAKASIR_PAYMENT_ALREADY_PAID', {
        paymentId,
        bookingId,
        transactionId,
      });
      return;
    }

    const updateData: { status: 'paid'; paidAt: Date; jumlah?: number } = {
      status: 'paid',
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    };
    if (amount && amount > 0) {
      updateData.jumlah = amount;
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: updateData,
    });

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: { select: { nama: true } },
        profile: { select: { nama: true, email: true } },
      },
    });

    if (booking?.status === 'menunggu_pembayaran') {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'dikonfirmasi' },
      });

      if (systemActorId) {
        await tx.bookingStatusLog.create({
          data: {
            bookingId,
            statusLama: 'menunggu_pembayaran',
            statusBaru: 'dikonfirmasi',
            diubahOleh: systemActorId,
          },
        });
      }

      confirmedBookingInfo = {
        email: booking.profile.email,
        nama: booking.profile.nama,
        carNama: booking.car.nama,
        tanggalMulai: booking.tanggalMulai,
        tanggalSelesai: booking.tanggalSelesai,
      };
    }
  });

  if (confirmedBookingInfo) {
    const info: {
      email: string;
      nama: string;
      carNama: string;
      tanggalMulai: Date;
      tanggalSelesai: Date;
    } = confirmedBookingInfo;
    void sendBookingConfirmedEmail({
      to: info.email,
      namaPenyewa: info.nama,
      namaMobil: info.carNama,
      bookingId,
      tanggalMulai: info.tanggalMulai.toISOString(),
      tanggalSelesai: info.tanggalSelesai.toISOString(),
    });
  }

  logPaymentAudit('PAKASIR_BOOKING_CONFIRMED', {
    bookingId,
    paymentId,
    transactionId,
  });
}

async function handlePakasirPaymentExpired(paymentId: string, bookingId: string) {
  const systemActorId = await getSystemActorId();
  let cancelledBookingInfo: {
    email: string;
    nama: string;
    carNama: string;
    tanggalMulai: Date;
    tanggalSelesai: Date;
  } | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'expired' },
    });

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: { select: { nama: true } },
        profile: { select: { nama: true, email: true } },
      },
    });

    if (booking?.status === 'menunggu_pembayaran') {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'dibatalkan' },
      });

      if (systemActorId) {
        await tx.bookingStatusLog.create({
          data: {
            bookingId,
            statusLama: 'menunggu_pembayaran',
            statusBaru: 'dibatalkan',
            diubahOleh: systemActorId,
          },
        });
      }

      cancelledBookingInfo = {
        email: booking.profile.email,
        nama: booking.profile.nama,
        carNama: booking.car.nama,
        tanggalMulai: booking.tanggalMulai,
        tanggalSelesai: booking.tanggalSelesai,
      };
    }
  });

  if (cancelledBookingInfo) {
    const info: {
      email: string;
      nama: string;
      carNama: string;
      tanggalMulai: Date;
      tanggalSelesai: Date;
    } = cancelledBookingInfo;
    void sendBookingCancelledEmail(
      {
        to: info.email,
        namaPenyewa: info.nama,
        namaMobil: info.carNama,
        bookingId,
        tanggalMulai: info.tanggalMulai.toISOString(),
        tanggalSelesai: info.tanggalSelesai.toISOString(),
      },
      'dibatalkan_otomatis'
    );
  }

  logPaymentAudit('PAKASIR_BOOKING_EXPIRED', {
    bookingId,
    paymentId,
  });
}

async function handlePakasirPaymentFailed(paymentId: string) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'failed' },
  });

  logPaymentAudit('PAKASIR_PAYMENT_FAILED', {
    paymentId,
  });
}

// ============================================================================
// HEALTH CHECK - PAKASIR STATUS
// ============================================================================

webhooksRouter.get('/pakasir/health', async (_req, res) => {
  res.json({
    status: isPakasirConfigured() ? 'ready' : 'not_configured',
    gateway: 'pakasir',
  });
});