import { Router } from 'express';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { verifyBayarGGWebhook, mapBayarGGStatusToPayment } from '../services/bayargg.service';

export const webhooksRouter = Router();

// ============================================================================
// SECURITY: Audit Logging Helper
// ============================================================================

/**
 * Log payment events for audit trail
 * Sanitizes sensitive data before logging
 */
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
  // Sanitize - don't log sensitive payment details
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
// BAYAR.GG WEBHOOK HANDLER
// ============================================================================

/**
 * POST /api/webhooks/bayargg
 * Menerima callback dari bayar.gg untuk update status pembayaran
 *
 * SECURITY MEASURES:
 * - HMAC signature verification
 * - Timestamp validation (5 minute window)
 * - Idempotency check via WebhookLog
 * - Transaction wrapping for atomicity
 * - Audit logging
 *
 * bayar.gg akan POST ke endpoint ini saat:
 * - Pembayaran berhasil (paid)
 * - Invoice kedaluwarsa (expired)
 * - Pembayaran dibatalkan (cancelled)
 */
webhooksRouter.post('/bayargg', async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;
  const webhookEvent = req.headers['x-webhook-event'] as string | undefined;
  const invoiceIdHeader = req.headers['x-invoice-id'] as string | undefined;
  const bodyString = JSON.stringify(req.body);

  // Log received webhook
  logPaymentAudit('BAYARGG_WEBHOOK_RECEIVED', {
    ip: req.ip,
    status: webhookEvent || req.body.status,
    transactionId: invoiceIdHeader || req.body.invoice_id,
  });

  // SECURITY: Verify bayar.gg signature with timestamp validation
  if (!verifyBayarGGWebhook(signature, bodyString, timestamp)) {
    logPaymentAudit('BAYARGG_WEBHOOK_REJECTED_SIGNATURE', {
      ip: req.ip,
      error: 'Invalid signature or timestamp',
    });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  try {
    const { invoice_id, status, final_amount, paid_at } = req.body;

    if (!invoice_id) {
      logPaymentAudit('BAYARGG_WEBHOOK_NO_INVOICE', { ip: req.ip });
      res.status(200).json({ received: true });
      return;
    }

    const eventType = (status || 'UNKNOWN').toUpperCase();

    logPaymentAudit('BAYARGG_WEBHOOK_PROCESSING', {
      transactionId: invoice_id,
      status: eventType,
      amount: final_amount,
      ip: req.ip,
    });

    // Find payment record using gatewayInvoiceId
    const paymentByInvoice = await prisma.payment.findFirst({
      where: { gatewayInvoiceId: invoice_id },
      include: { booking: true },
    });

    if (paymentByInvoice) {
      await processBayarGGWebhook(paymentByInvoice, invoice_id, eventType, paid_at, bodyString, req.ip);
    } else {
      // Also try to find by gatewayOrderId for backwards compatibility
      const paymentByOrderId = await prisma.payment.findFirst({
        where: { gatewayOrderId: invoice_id },
        include: { booking: true },
      });

      if (!paymentByOrderId) {
        logPaymentAudit('BAYARGG_WEBHOOK_PAYMENT_NOT_FOUND', {
          transactionId: invoice_id,
          ip: req.ip,
        });
        // Return 200 to prevent retries for non-existent payments
        res.status(200).json({ received: true });
        return;
      }

      // Process with payment found by order ID
      await processBayarGGWebhook(paymentByOrderId, invoice_id, eventType, paid_at, bodyString, req.ip);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logPaymentAudit('BAYARGG_WEBHOOK_ERROR', {
      ip: req.ip,
      error: errorMessage,
    });

    // SECURITY: Return 500 for processing errors so bayar.gg will retry
    res.status(500).json({ error: 'Internal processing error' });
  }
});

/**
 * Process webhook - extracted to handle both invoice ID and order ID lookup
 */
async function processBayarGGWebhook(
  payment: {
    id: string;
    jumlah: unknown;
    booking: {
      id: string;
      userId: string;
      status: string;
    };
  },
  invoice_id: string,
  eventType: string,
  paid_at: string | undefined,
  bodyString: string,
  ip: string | undefined
) {
  // SECURITY: Idempotency check - skip if already processed
  const existingLog = await prisma.webhookLog.findFirst({
    where: {
      transactionId: invoice_id,
      eventType: eventType,
    },
  });

  if (existingLog) {
    logPaymentAudit('BAYARGG_WEBHOOK_DUPLICATE', {
      paymentId: payment.id,
      transactionId: invoice_id,
      status: eventType,
      ip: ip,
    });
    return;
  }

  // Handle based on payment status
  switch (eventType.toLowerCase()) {
    case 'paid': {
      await handleBayarGGPaymentPaid(payment.id, payment.booking.id, invoice_id, paid_at);
      break;
    }
    case 'expired': {
      await handleBayarGGPaymentExpired(payment.id, payment.booking.id);
      break;
    }
    case 'cancelled':
    case 'failed': {
      await handleBayarGGPaymentFailed(payment.id);
      break;
    }
    default:
      logPaymentAudit('BAYARGG_WEBHOOK_UNHANDLED_STATUS', {
        paymentId: payment.id,
        transactionId: invoice_id,
        status: eventType,
      });
  }

  // SECURITY: Store webhook log for idempotency
  const requestHash = createHash('sha256').update(bodyString).digest('hex').slice(0, 32);
  await prisma.webhookLog.create({
    data: {
      paymentId: payment.id,
      transactionId: invoice_id,
      eventType: eventType,
      requestHash: requestHash,
    },
  });

  logPaymentAudit('BAYARGG_WEBHOOK_PROCESSED', {
    bookingId: payment.booking.id,
    paymentId: payment.id,
    transactionId: invoice_id,
    status: eventType,
    amount: Number(payment.jumlah),
  });
}

// ============================================================================
// BAYAR.GG WEBHOOK HANDLERS (ATOMIC OPERATIONS)
// ============================================================================

/**
 * Handle bayar.gg PAID - Pembayaran berhasil
 * Uses transaction for atomicity
 */
async function handleBayarGGPaymentPaid(
  paymentId: string,
  bookingId: string,
  transactionId: string,
  paidAt?: string
) {
  await prisma.$transaction(async (tx) => {
    // Check current state first
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    // Already processed
    if (payment?.status === 'paid') {
      logPaymentAudit('BAYARGG_PAYMENT_ALREADY_PAID', {
        paymentId,
        bookingId,
        transactionId,
      });
      return;
    }

    // Update payment status
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'paid',
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    // Update booking status atomically
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (booking?.status === 'menunggu_pembayaran') {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'dikonfirmasi' },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId,
          statusLama: 'menunggu_pembayaran',
          statusBaru: 'dikonfirmasi',
          diubahOleh: 'system',
          keterangan: `Pembayaran berhasil via bayar.gg. Invoice ID: ${transactionId}`,
        },
      });
    }
  });

  logPaymentAudit('BAYARGG_BOOKING_CONFIRMED', {
    bookingId,
    paymentId,
    transactionId,
  });
}

/**
 * Handle bayar.gg EXPIRED - Invoice kedaluwarsa
 * Uses transaction for atomicity
 */
async function handleBayarGGPaymentExpired(paymentId: string, bookingId: string) {
  await prisma.$transaction(async (tx) => {
    // Update payment status
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'expired' },
    });

    // Cancel booking atomically
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (booking?.status === 'menunggu_pembayaran') {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'dibatalkan' },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId,
          statusLama: 'menunggu_pembayaran',
          statusBaru: 'dibatalkan',
          diubahOleh: 'system',
          keterangan: 'Pembayaran kedaluwarsa via bayar.gg',
        },
      });
    }
  });

  logPaymentAudit('BAYARGG_BOOKING_EXPIRED', {
    bookingId,
    paymentId,
  });
}

/**
 * Handle bayar.gg FAILED/CANCELLED - Pembayaran gagal
 */
async function handleBayarGGPaymentFailed(paymentId: string) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'failed' },
  });

  logPaymentAudit('BAYARGG_PAYMENT_FAILED', {
    paymentId,
  });
}

// ============================================================================
// HEALTH CHECK - BAYAR.GG STATUS
// ============================================================================

/**
 * GET /api/webhooks/bayargg/health
 * Check bayar.gg webhook configuration status
 */
webhooksRouter.get('/bayargg/health', async (_req, res) => {
  const { isBayarGGConfigured } = await import('../services/bayargg.service');

  res.json({
    status: isBayarGGConfigured() ? 'ready' : 'not_configured',
    gateway: 'bayar.gg',
  });
});
