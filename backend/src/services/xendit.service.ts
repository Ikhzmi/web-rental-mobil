import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ============================================================================
// XENDIT SERVICE
// ============================================================================
// Service untuk integrasi dengan Xendit Payment Gateway
// Menggunakan Xendit Node SDK untuk membuat Invoice dan Disbursement

// XENDIT_SECRET_KEY harus ada di environment variable
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN;
const XENDIT_WEBHOOK_URL = process.env.XENDIT_WEBHOOK_URL || 'http://localhost:5173';

// Type untuk response Xendit (simplified)
interface XenditInvoice {
  id: string;
  external_id: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  amount: number;
  invoice_url: string;
  expiry_date: string;
  created: string;
}

interface XenditDisbursement {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
}

// Check if Xendit is configured
export function isXenditConfigured(): boolean {
  return !!XENDIT_SECRET_KEY;
}

// ============================================================================
// INVOICE OPERATIONS
// ============================================================================

/**
 * Create Xendit Invoice for a booking
 * Called when customer initiates checkout
 */
export async function createXenditInvoice(
  bookingId: string,
  amount: number,
  customerEmail: string,
  customerName: string,
  description: string
): Promise<{ success: boolean; invoiceUrl?: string; invoiceId?: string; error?: string }> {
  if (!XENDIT_SECRET_KEY) {
    return { success: false, error: 'Xendit belum dikonfigurasi' };
  }

  try {
    // Dynamic import untuk menghindari error jika package belum terinstall
    const xenditModule = await import('xendit-node');
    const { Xendit } = xenditModule.default || xenditModule;

    if (!Xendit) {
      return { success: false, error: 'Xendit SDK tidak tersedia' };
    }

    const xendit = new Xendit({ secretKey: XENDIT_SECRET_KEY });
    const { Invoice } = xendit;

    // Invoice expiry: 24 hours from now
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    const invoiceData = {
      externalId: `booking_${bookingId}`,
      amount: amount,
      payerEmail: customerEmail,
      description: description,
      customer: {
        givenNames: customerName,
      },
      paymentMethods: ['VIRTUAL_ACCOUNT', 'QRIS', 'EWALLET'],
      expiryDate: expiryDate.toISOString(),
    };

    const invoice: XenditInvoice = await Invoice.createInvoice(invoiceData);

    // Simpan xendit_invoice_id ke database
    await prisma.payment.create({
      data: {
        bookingId,
        xenditInvoiceId: invoice.id,
        metodeBayar: 'virtual_account', // Default, akan diupdate sesuai metode yang dipilih
        jumlah: amount,
        status: 'pending',
      },
    });

    return {
      success: true,
      invoiceUrl: invoice.invoice_url,
      invoiceId: invoice.id,
    };
  } catch (error) {
    console.error('Xendit createInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membuat invoice Xendit',
    };
  }
}

/**
 * Get Xendit Invoice status
 */
export async function getXenditInvoiceStatus(
  invoiceId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  if (!XENDIT_SECRET_KEY) {
    return { success: false, error: 'Xendit belum dikonfigurasi' };
  }

  try {
    const xenditModule = await import('xendit-node');
    const { Xendit } = xenditModule.default || xenditModule;
    const xendit = new Xendit({ secretKey: XENDIT_SECRET_KEY });
    const { Invoice } = xendit;

    const invoice = await Invoice.getInvoiceById({ invoiceId });

    return { success: true, status: invoice.status };
  } catch (error) {
    console.error('Xendit getInvoiceStatus error:', error);
    return { success: false, error: 'Gagal mengambil status invoice' };
  }
}

// ============================================================================
// DISBURSEMENT OPERATIONS
// ============================================================================

/**
 * Create Xendit Disbursement (transfer ke rekening instansi)
 * Dipanggil saat batch pencairan dieksekusi
 */
export async function createXenditDisbursement(
  disbursementId: string,
  bankCode: string,
  accountNumber: string,
  amount: number,
  accountHolderName: string
): Promise<{ success: boolean; disbursementId?: string; error?: string }> {
  if (!XENDIT_SECRET_KEY) {
    return { success: false, error: 'Xendit belum dikonfigurasi' };
  }

  try {
    const xenditModule = await import('xendit-node');
    const { Xendit } = xenditModule.default || xenditModule;
    const xendit = new Xendit({ secretKey: XENDIT_SECRET_KEY });
    const { Disbursement } = xendit;

    // Parse bank code - format expected: "BANK_CODE-ACCOUNT_NUMBER"
    // Convert dari format "BCA-1234567890" ke "BCA" + "1234567890"
    const parts = accountNumber.split('-');
    const actualAccountNumber = parts.length > 1 ? parts[parts.length - 1] : accountNumber;

    const disbursementData = {
      externalId: `disbursement_${disbursementId}`,
      amount: amount,
      bankCode: bankCode,
      accountNumber: actualAccountNumber,
      accountHolderName: accountHolderName,
      description: `Pencairan dana KerenTal Kita - ${disbursementId}`,
    };

    const result = await Disbursement.create(disbursementData);

    // Update disbursement record dengan Xendit ID
    await prisma.disbursement.update({
      where: { id: disbursementId },
      data: {
        xenditDisbursementId: result.id,
        status: 'diproses',
      },
    });

    return { success: true, disbursementId: result.id };
  } catch (error) {
    console.error('Xendit createDisbursement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membuat disbursement Xendit',
    };
  }
}

/**
 * Get Disbursement status from Xendit
 */
export async function getDisbursementStatus(
  xenditDisbursementId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  if (!XENDIT_SECRET_KEY) {
    return { success: false, error: 'Xendit belum dikonfigurasi' };
  }

  try {
    const xenditModule = await import('xendit-node');
    const { Xendit } = xenditModule.default || xenditModule;
    const xendit = new Xendit({ secretKey: XENDIT_SECRET_KEY });
    const { Disbursement } = xendit;

    const disbursement = await Disbursement.getDisbursementById({
      disbursementId: xenditDisbursementId,
    });

    return { success: true, status: disbursement.status };
  } catch (error) {
    console.error('Xendit getDisbursementStatus error:', error);
    return { success: false, error: 'Gagal mengambil status disbursement' };
  }
}

// ============================================================================
// REFUND OPERATIONS (for cancellation)
// ============================================================================

/**
 * Create refund via Xendit
 * Dipanggil saat customer membatalkan booking yang sudah dibayar
 */
export async function createXenditRefund(
  xenditInvoiceId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  if (!XENDIT_SECRET_KEY) {
    return { success: false, error: 'Xendit belum dikonfigurasi' };
  }

  try {
    const xenditModule = await import('xendit-node');
    const { Xendit } = xenditModule.default || xenditModule;
    const xendit = new Xendit({ secretKey: XENDIT_SECRET_KEY });
    const { Refund } = xendit;

    const refund = await Refund.createRefund({
      invoiceId: xenditInvoiceId,
      amount: amount,
      reason: reason,
    });

    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error('Xendit createRefund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membuat refund',
    };
  }
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify Xendit webhook callback token
 */
export function verifyXenditWebhook(
  callbackToken: string | undefined
): boolean {
  if (!XENDIT_CALLBACK_TOKEN) {
    console.warn('XENDIT_CALLBACK_TOKEN not configured - webhook verification skipped');
    return true; // Skip verification if not configured (dev mode)
  }

  return callbackToken === XENDIT_CALLBACK_TOKEN;
}

// ============================================================================
// DISBURSEMENT SERVICE - BATCH PROCESSING
// ============================================================================

/**
 * Process batch disbursement untuk semua instansi yang eligible
 * Dipanggil via cron atau manual trigger
 */
export async function processBatchDisbursements(): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  try {
    // Ambil semua instansi aktif
    const instances = await prisma.instansi.findMany({
      where: { status: 'aktif' },
      include: {
        disbursements: {
          where: { status: 'diproses' },
        },
      },
    });

    for (const instance of instances) {
      try {
        // Skip jika ada disbursement yang masih diproses
        if (instance.disbursements.length > 0) {
          continue;
        }

        // Skip jika tidak ada rekening bank
        if (!instance.rekeningBank) {
          errors.push(`Instansi ${instance.namaInstansi}: rekening bank belum ada`);
          continue;
        }

        // Hitung booking eligible (selesai, belum ada disbursement)
        const eligibleBookings = await prisma.booking.findMany({
          where: {
            car: { instansiId: instance.id },
            status: 'selesai',
            disbursementItems: { none: {} },
          },
        });

        if (eligibleBookings.length === 0) {
          continue;
        }

        // Hitung jumlah
        const jumlahKotor = eligibleBookings.reduce(
          (sum, b) => sum + Number(b.totalHarga),
          0
        );
        const komisi = jumlahKotor * (Number(instance.komisiPlatformPersen) / 100);
        const jumlahBersih = jumlahKotor - komisi;

        // Buat disbursement record
        const disbursement = await prisma.disbursement.create({
          data: {
            instansiId: instance.id,
            jumlahKotor,
            komisiPlatform: komisi,
            jumlahBersih,
            status: 'diproses',
          },
        });

        // Buat disbursement items
        await prisma.disbursementItem.createMany({
          data: eligibleBookings.map((b) => ({
            disbursementId: disbursement.id,
            bookingId: b.id,
            jumlahKotor: Number(b.totalHarga),
          })),
        });

        // Trigger Xendit disbursement
        const result = await createXenditDisbursement(
          disbursement.id,
          'BCA', // Default, perlu parse dari rekeningBank
          instance.rekeningBank,
          Number(jumlahBersih),
          instance.namaInstansi
        );

        if (!result.success) {
          errors.push(`Instansi ${instance.namaInstansi}: ${result.error}`);
          failed++;
        } else {
          processed++;
        }
      } catch (err) {
        errors.push(
          `Instansi ${instance.namaInstansi}: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
        failed++;
      }
    }

    return { success: failed === 0, processed, failed, errors };
  } catch (error) {
    console.error('processBatchDisbursements error:', error);
    return {
      success: false,
      processed,
      failed,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
