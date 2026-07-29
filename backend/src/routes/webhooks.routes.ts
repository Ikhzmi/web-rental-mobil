import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyXenditWebhook } from '../services/xendit.service';
import { processBatchDisbursements } from '../services/xendit.service';

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/xendit
 * Menerima callback dari Xendit untuk update status pembayaran/disbursement
 *
 * Xendit akan POST ke endpoint ini saat:
 * - Invoice berhasil dibayar
 * - Invoice kedaluwarsa
 * - Disbursement berhasil/gagal
 *
 * Headers penting:
 * - x-callback-token: Token untuk verifikasi webhook
 */
webhooksRouter.post('/xendit', async (req, res) => {
  const callbackToken = req.headers['x-callback-token'] as string | undefined;

  // Verify webhook authenticity
  if (!verifyXenditWebhook(callbackToken)) {
    console.warn('Xendit webhook rejected: invalid callback token');
    res.status(401).json({ error: 'Invalid callback token' });
    return;
  }

  const { event, data } = req.body;

  console.log('Xendit webhook received:', event, data);

  try {
    switch (event) {
      case 'invoice.paid': {
        await handleInvoicePaid(data);
        break;
      }
      case 'invoice.expired': {
        await handleInvoiceExpired(data);
        break;
      }
      case 'invoice.failed': {
        await handleInvoiceFailed(data);
        break;
      }
      case 'disbursement.success': {
        await handleDisbursementSuccess(data);
        break;
      }
      case 'disbursement.failed': {
        await handleDisbursementFailed(data);
        break;
      }
      default:
        console.log(`Unhandled Xendit event: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Xendit webhook processing error:', error);
    // Return 200 anyway to prevent Xendit from retrying
    // Log the error for manual investigation
    res.status(200).json({ received: true, error: 'Processing error logged' });
  }
});

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle invoice.paid - Pembayaran berhasil
 * Update booking status ke 'dikonfirmasi' dan payment status ke 'paid'
 */
async function handleInvoicePaid(data: {
  id: string;
  external_id: string;
  status: string;
  paid_at?: string;
  payment_method?: string;
}) {
  const { id: xenditInvoiceId, external_id, paid_at, payment_method } = data;

  // Extract booking ID from external_id (format: booking_<uuid>)
  const bookingId = external_id.replace('booking_', '');

  // Find payment record
  const payment = await prisma.payment.findUnique({
    where: { xenditInvoiceId },
    include: { booking: true },
  });

  if (!payment) {
    console.error(`Payment not found for Xendit invoice: ${xenditInvoiceId}`);
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'paid',
      paidAt: paid_at ? new Date(paid_at) : new Date(),
    },
  });

  // Update booking status to 'dikonfirmasi' (only if still waiting for payment)
  if (payment.booking.status === 'menunggu_pembayaran') {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'dikonfirmasi' },
    });

    // Create status log
    await prisma.bookingStatusLog.create({
      data: {
        bookingId,
        statusLama: 'menunggu_pembayaran',
        statusBaru: 'dikonfirmasi',
        diubahOleh: 'system', // System action
      },
    });

    console.log(`Booking ${bookingId} confirmed - payment received`);
  }
}

/**
 * Handle invoice.expired - Invoice kedaluwarsa
 * Update booking status ke 'dibatalkan'
 */
async function handleInvoiceExpired(data: {
  id: string;
  external_id: string;
}) {
  const { id: xenditInvoiceId, external_id } = data;

  const bookingId = external_id.replace('booking_', '');

  const payment = await prisma.payment.findUnique({
    where: { xenditInvoiceId },
    include: { booking: true },
  });

  if (!payment) {
    console.error(`Payment not found for Xendit invoice: ${xenditInvoiceId}`);
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'expired' },
  });

  // Cancel booking if still waiting for payment
  if (payment.booking.status === 'menunggu_pembayaran') {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'dibatalkan' },
    });

    await prisma.bookingStatusLog.create({
      data: {
        bookingId,
        statusLama: 'menunggu_pembayaran',
        statusBaru: 'dibatalkan',
        diubahOleh: 'system',
      },
    });

    console.log(`Booking ${bookingId} cancelled - invoice expired`);
  }
}

/**
 * Handle invoice.failed - Pembayaran gagal
 */
async function handleInvoiceFailed(data: {
  id: string;
  external_id: string;
}) {
  const { id: xenditInvoiceId, external_id } = data;

  const bookingId = external_id.replace('booking_', '');

  const payment = await prisma.payment.findUnique({
    where: { xenditInvoiceId },
    include: { booking: true },
  });

  if (!payment) {
    console.error(`Payment not found for Xendit invoice: ${xenditInvoiceId}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'failed' },
  });

  console.log(`Payment failed for booking ${bookingId}`);
}

/**
 * Handle disbursement.success - Pencairan berhasil
 */
async function handleDisbursementSuccess(data: {
  id: string;
  external_id: string;
  status: string;
  completed_at?: string;
}) {
  const { id: xenditDisbursementId, external_id, completed_at } = data;

  const disbursementId = external_id.replace('disbursement_', '');

  await prisma.disbursement.updateMany({
    where: { xenditDisbursementId },
    data: {
      status: 'berhasil',
      dicairkanPada: completed_at ? new Date(completed_at) : new Date(),
    },
  });

  console.log(`Disbursement ${disbursementId} completed successfully`);
}

/**
 * Handle disbursement.failed - Pencairan gagal
 */
async function handleDisbursementFailed(data: {
  id: string;
  external_id: string;
  status: string;
  failure_reason?: string;
}) {
  const { id: xenditDisbursementId, external_id, failure_reason } = data;

  const disbursementId = external_id.replace('disbursement_', '');

  await prisma.disbursement.updateMany({
    where: { xenditDisbursementId },
    data: {
      status: 'gagal',
    },
  });

  console.log(`Disbursement ${disbursementId} failed: ${failure_reason}`);
}

// ============================================================================
// MANUAL TRIGGER ENDPOINT
// ============================================================================

/**
 * POST /api/webhooks/xendit/trigger-disbursement
 * Manual trigger untuk memproses batch disbursement
 * Biasanya dipanggil via cron atau oleh Super Admin
 */
webhooksRouter.post('/xendit/trigger-disbursement', async (req, res) => {
  // Only allow in development or with proper auth in production
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.DISBURSEMENT_TRIGGER_TOKEN;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await processBatchDisbursements();

    res.json({
      success: result.success,
      message: `Processed: ${result.processed}, Failed: ${result.failed}`,
      details: result,
    });
  } catch (error) {
    console.error('Manual disbursement trigger error:', error);
    res.status(500).json({ error: 'Gagal memproses disbursement' });
  }
});
