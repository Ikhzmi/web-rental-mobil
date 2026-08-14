"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDOKUConfigured = isDOKUConfigured;
exports.createDOKUCheckout = createDOKUCheckout;
exports.getDOKUPaymentStatus = getDOKUPaymentStatus;
exports.verifyDOKUWebhook = verifyDOKUWebhook;
exports.createDOKURefund = createDOKURefund;
exports.mapDOKUStatusToPayment = mapDOKUStatusToPayment;
const crypto_1 = require("crypto");
// ============================================================================
// DOKU SERVICE
// ============================================================================
// Service untuk integrasi dengan DOKU Payment Gateway
// Menggunakan DOKU Checkout API untuk menerima pembayaran
// DOKU Configuration dari environment variables
const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID;
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY;
const DOKU_MERCHANT_ID = process.env.DOKU_MERCHANT_ID;
const DOKU_IS_SANDBOX = process.env.DOKU_IS_SANDBOX === 'true';
// DOKU Base URLs
const DOKU_BASE_URL = DOKU_IS_SANDBOX
    ? 'https://api-sandbox.doku.com'
    : 'https://api.doku.com';
// Check if DOKU is configured
function isDOKUConfigured() {
    return !!(DOKU_CLIENT_ID && DOKU_SECRET_KEY && DOKU_MERCHANT_ID);
}
// ============================================================================
// SIGNATURE GENERATION
// ============================================================================
/**
 * Generate DOKU HMAC-SHA256 signature
 * Format: HMACSHA256(clientId|requestId|requestTimestamp|secretKey)
 * https://developers.doku.com/accept-payments/doku-checkout.md
 */
function generateDOKUSignature(clientId, requestId, requestTimestamp) {
    const data = `${clientId}|${requestId}|${requestTimestamp}|${DOKU_SECRET_KEY}`;
    return (0, crypto_1.createHmac)('sha256', DOKU_SECRET_KEY)
        .update(data)
        .digest('hex')
        .toUpperCase();
}
/**
 * Generate unique request ID (max 128 chars)
 * Used for idempotency
 */
function generateRequestId(prefix) {
    const random = (0, crypto_1.randomBytes)(16).toString('hex');
    return `${prefix}_${Date.now()}_${random}`.slice(0, 64);
}
/**
 * Format expiry date to DOKU format: yyyyMMddHHmmss
 * DOKU uses UTC+7 (WIB)
 */
function formatDOKUExpiryDate(hoursFromNow = 24) {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    // DOKU uses UTC+7 (WIB)
    const offset = 7 * 60; // WIB is UTC+7
    const utc7 = new Date(date.getTime() + offset * 60 * 1000);
    return utc7.toISOString().replace(/[-:]/g, '').split('.')[0];
}
// ============================================================================
// CHECKOUT OPERATIONS
// ============================================================================
// Payment method to DOKU type mapping
const PAYMENT_METHOD_TYPES = {
    // Virtual Account
    bca_va: { type: 'VIRTUAL_ACCOUNT', channel: 'BCA' },
    mandiri_va: { type: 'VIRTUAL_ACCOUNT', channel: 'MANDIRI' },
    bri_va: { type: 'VIRTUAL_ACCOUNT', channel: 'BRI' },
    bni_va: { type: 'VIRTUAL_ACCOUNT', channel: 'BNI' },
    permata_va: { type: 'VIRTUAL_ACCOUNT', channel: 'PERMATA' },
    // QRIS
    qris: { type: 'QRIS', channel: 'QRIS' },
    // E-Wallet
    shopeepay: { type: 'EWALLET', channel: 'SHOPEEPAY' },
    dana: { type: 'EWALLET', channel: 'DANA' },
    ovo: { type: 'EWALLET', channel: 'OVO' },
    // Convenience Store
    alfamart: { type: 'CONVENIENCE_STORE', channel: 'ALFAMART' },
    indomaret: { type: 'CONVENIENCE_STORE', channel: 'INDOMARET' },
};
/**
 * Create DOKU Checkout payment for a booking
 * https://api-sandbox.doku.com/checkout/v1/payment
 *
 * @param paymentMethod - Specific payment method (e.g., 'bca_va', 'qris', 'shopeepay')
 *                         If not provided, uses DOKU's default checkout (customer selects method)
 */
async function createDOKUCheckout(bookingId, amount, customerEmail, customerName, description, paymentMethod) {
    if (!isDOKUConfigured()) {
        return { success: false, error: 'DOKU belum dikonfigurasi' };
    }
    try {
        const requestId = generateRequestId('BOOK');
        const requestTimestamp = new Date().toISOString();
        const orderId = `BOOK-${bookingId.slice(0, 8)}-${Date.now()}`;
        const expiryDate = formatDOKUExpiryDate(24);
        const signature = generateDOKUSignature(DOKU_CLIENT_ID, requestId, requestTimestamp);
        // Determine payment configuration
        const paymentConfig = paymentMethod ? PAYMENT_METHOD_TYPES[paymentMethod] : null;
        // Build payment object based on method type
        const payment = {
            paymentDuedDate: expiryDate,
            reusableStatus: false,
        };
        // Add payment method specific configuration
        if (paymentConfig) {
            payment.type = paymentConfig.type;
            if (paymentConfig.type === 'VIRTUAL_ACCOUNT') {
                payment.merchantTaxId = '';
                payment.fixAcquiringFee = true;
                payment.virtualAccountInfo = {
                    billingType: 'FIXED',
                    customerName: customerName,
                    virtualAccountNumber: '', // DOKU will generate
                    expiredTime: 24,
                    info1: 'Payment for Booking',
                    info2: 'KerenTal Kita',
                    info3: '',
                };
            }
            else if (paymentConfig.type === 'QRIS') {
                payment.qrisInfo = {
                    merchantId: DOKU_MERCHANT_ID,
                    terminalId: DOKU_MERCHANT_ID,
                    fixAmount: true,
                };
            }
            else if (paymentConfig.type === 'EWALLET') {
                payment.ewalletInfo = {
                    channelCode: paymentConfig.channel,
                    mobileNumber: '',
                    sagaTransactionType: 'CREATEQR',
                };
            }
            else if (paymentConfig.type === 'CONVENIENCE_STORE') {
                payment.convenienceInfo = {
                    storeType: paymentConfig.channel,
                    customerName: customerName,
                };
            }
        }
        const payload = {
            order: {
                orderId: orderId,
                amount: amount,
                currency: 'IDR',
                invoiceNumber: `INV-${bookingId.slice(0, 8).toUpperCase()}`,
            },
            payment: payment,
            customer: {
                id: customerEmail,
                name: customerName,
                email: customerEmail,
            },
            product: [
                {
                    name: description,
                    price: amount,
                    quantity: 1,
                },
            ],
        };
        console.log('DOKU checkout request:', {
            url: `${DOKU_BASE_URL}/checkout/v1/payment`,
            requestId,
            payload,
        });
        const response = await fetch(`${DOKU_BASE_URL}/checkout/v1/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': DOKU_CLIENT_ID,
                'Request-Id': requestId,
                'Request-Timestamp': requestTimestamp,
                'Signature': signature,
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        console.log('DOKU checkout response:', {
            status: response.status,
            data,
        });
        if (!response.ok) {
            const errorMsg = data.responseMessage || data.error_messages?.join(', ') || 'Gagal membuat payment DOKU';
            console.error('DOKU API error:', errorMsg);
            return { success: false, error: errorMsg };
        }
        // Extract payment URL from response
        const paymentUrl = data.responseData?.paymentUrl || data.responseData?.redirectUrl;
        if (!paymentUrl) {
            console.error('DOKU response missing paymentUrl:', data);
            return { success: false, error: 'DOKU tidak mengembalikan payment URL' };
        }
        // Extract payment code (for VA/cstore)
        const paymentCode = data.responseData?.virtualAccountNumber ||
            data.responseData?.paymentCode ||
            data.responseData?.qrisString ||
            undefined;
        return {
            success: true,
            paymentUrl,
            invoiceId: data.responseData?.invoiceId,
            orderId,
            paymentCode: paymentCode,
            expiresAt: new Date(expiryDate).toISOString(),
        };
    }
    catch (error) {
        console.error('DOKU createCheckout error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal membuat payment DOKU',
        };
    }
}
/**
 * Get DOKU payment status
 */
async function getDOKUPaymentStatus(orderId) {
    if (!isDOKUConfigured()) {
        return { success: false, error: 'DOKU belum dikonfigurasi' };
    }
    try {
        const requestId = generateRequestId('STAT');
        const requestTimestamp = new Date().toISOString();
        const signature = generateDOKUSignature(DOKU_CLIENT_ID, requestId, requestTimestamp);
        const response = await fetch(`${DOKU_BASE_URL}/checkout/v1/payment/${orderId}`, {
            method: 'GET',
            headers: {
                'Client-Id': DOKU_CLIENT_ID,
                'Request-Id': requestId,
                'Request-Timestamp': requestTimestamp,
                'Signature': signature,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error: data.responseMessage || 'Gagal mengambil status',
            };
        }
        return {
            success: true,
            status: data.responseData?.paymentStatus,
        };
    }
    catch (error) {
        console.error('DOKU getPaymentStatus error:', error);
        return {
            success: false,
            error: 'Gagal mengambil status pembayaran',
        };
    }
}
// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================
/**
 * Verify DOKU webhook signature
 * Uses timing-safe comparison to prevent timing attacks
 *
 * DOKU signature format: HMACSHA256(clientId + "|" + body + "|" + timestamp + "|" + secretKey)
 *
 * SECURITY FIXES:
 * - Always verify signature regardless of environment
 * - Add timestamp validation to prevent replay attacks
 * - Reject webhooks when credentials are not configured
 */
function verifyDOKUWebhook(signature, body, requestTimestamp) {
    // SECURITY: Reject webhook if credentials are not configured
    if (!DOKU_CLIENT_ID || !DOKU_SECRET_KEY) {
        console.error('DOKU webhook REJECTED: credentials not configured');
        return false;
    }
    // Check for required parameters
    if (!signature || !requestTimestamp) {
        console.warn('DOKU webhook REJECTED: missing signature or timestamp');
        return false;
    }
    // SECURITY: Add timestamp validation to prevent replay attacks
    // Reject webhooks older than 5 minutes
    const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes
    const webhookTime = new Date(requestTimestamp).getTime();
    const now = Date.now();
    if (isNaN(webhookTime)) {
        console.warn('DOKU webhook REJECTED: invalid timestamp format');
        return false;
    }
    if (Math.abs(now - webhookTime) > MAX_TIMESTAMP_AGE_MS) {
        console.warn(`DOKU webhook REJECTED: timestamp outside valid window (${MAX_TIMESTAMP_AGE_MS / 1000}s)`);
        return false;
    }
    // Always verify signature - no sandbox bypass
    // Use different signature formats for sandbox vs production based on DOKU documentation
    const data = `${DOKU_CLIENT_ID}|${body}|${requestTimestamp}|${DOKU_SECRET_KEY}`;
    const expectedSignature = (0, crypto_1.createHmac)('sha256', DOKU_SECRET_KEY)
        .update(data)
        .digest('hex')
        .toUpperCase();
    try {
        const expected = Buffer.from(expectedSignature, 'utf8');
        const actual = Buffer.from(signature, 'utf8');
        if (expected.length !== actual.length) {
            console.warn('DOKU webhook REJECTED: signature length mismatch');
            return false;
        }
        const result = (0, crypto_1.timingSafeEqual)(expected, actual);
        if (!result) {
            console.warn('DOKU webhook REJECTED: signature mismatch');
        }
        return result;
    }
    catch {
        console.warn('DOKU webhook REJECTED: signature verification error');
        return false;
    }
}
// ============================================================================
// REFUND OPERATIONS
// ============================================================================
/**
 * Create DOKU refund for a cancelled booking
 * Note: DOKU refund API may require separate configuration
 */
async function createDOKURefund(invoiceId, orderId, amount, reason) {
    if (!isDOKUConfigured()) {
        return { success: false, error: 'DOKU belum dikonfigurasi' };
    }
    try {
        const requestId = generateRequestId('REF');
        const requestTimestamp = new Date().toISOString();
        const signature = generateDOKUSignature(DOKU_CLIENT_ID, requestId, requestTimestamp);
        const payload = {
            orderId,
            amount,
            reason,
        };
        const response = await fetch(`${DOKU_BASE_URL}/refund/v1/refund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': DOKU_CLIENT_ID,
                'Request-Id': requestId,
                'Request-Timestamp': requestTimestamp,
                'Signature': signature,
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error: data.responseMessage || 'Gagal membuat refund',
            };
        }
        return {
            success: true,
            refundId: data.responseData?.refundId,
        };
    }
    catch (error) {
        console.error('DOKU createRefund error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal membuat refund',
        };
    }
}
// ============================================================================
// PAYMENT STATUS MAPPING
// ============================================================================
/**
 * Map DOKU payment status to internal payment status
 * DOKU statuses: PENDING, PAID, EXPIRED, FAILED, REFUNDED
 */
function mapDOKUStatusToPayment(status) {
    switch (status.toUpperCase()) {
        case 'PAID':
            return 'paid';
        case 'EXPIRED':
            return 'expired';
        case 'FAILED':
            return 'failed';
        default:
            return 'pending';
    }
}
//# sourceMappingURL=doku.service.js.map