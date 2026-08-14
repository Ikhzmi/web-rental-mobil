"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBayarGGConfigured = isBayarGGConfigured;
exports.mapToBayarGGMethod = mapToBayarGGMethod;
exports.createBayarGGPayment = createBayarGGPayment;
exports.getBayarGGPaymentStatus = getBayarGGPaymentStatus;
exports.getBayarGGPaymentMethods = getBayarGGPaymentMethods;
exports.verifyBayarGGWebhook = verifyBayarGGWebhook;
exports.mapBayarGGStatusToPayment = mapBayarGGStatusToPayment;
exports.getBayarGGPaymentUrl = getBayarGGPaymentUrl;
const crypto_1 = require("crypto");
// ============================================================================
// BAYAR.GG SERVICE
// ============================================================================
// Service untuk integrasi dengan bayar.gg Payment Gateway
// https://www.bayar.gg/api-docs
// Configuration dari environment variables
const BAYARGG_API_KEY = process.env.BAYARGG_API_KEY;
const BAYARGG_WEBHOOK_SECRET = process.env.BAYARGG_WEBHOOK_SECRET;
const BAYARGG_CALLBACK_URL = process.env.BAYARGG_CALLBACK_URL || 'http://localhost:3001/api/webhooks/bayargg';
// Bayar.gg Base URL
const BAYARGG_BASE_URL = 'https://www.bayar.gg/api';
// Check if bayar.gg is configured
function isBayarGGConfigured() {
    return !!(BAYARGG_API_KEY);
}
// ============================================================================
// HTTP HELPERS
// ============================================================================
async function bayarggRequest(endpoint, options = {}) {
    if (!isBayarGGConfigured()) {
        return { success: false, error: 'bayar.gg belum dikonfigurasi' };
    }
    try {
        const url = `${BAYARGG_BASE_URL}${endpoint}`;
        console.log(`[BAYARGG] ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': BAYARGG_API_KEY,
                ...options.headers,
            },
        });
        const rawData = await response.json();
        console.log(`[BAYARGG] Response:`, { status: response.status, data: rawData });
        if (!response.ok) {
            const errorMsg = rawData.message || rawData.error || 'Request failed';
            return { success: false, error: errorMsg };
        }
        // Return the raw data with success wrapper
        return { success: true, data: rawData };
    }
    catch (error) {
        console.error('[BAYARGG] Request error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}
// ============================================================================
// PAYMENT METHODS MAPPING
// ============================================================================
// Payment method to bayar.gg method mapping
// Based on https://www.bayar.gg/api-docs
const PAYMENT_METHOD_MAP = {
    // QRIS - supports GoPay, OVO, DANA, ShopeePay, dll
    qris: 'qris',
    // E-Wallet
    ovo: 'ovo',
};
// Note: BRI VA and Livin VA require Merchant Connect API (Premium feature)
// Users need to connect their BRI/Livin account first via /api/accounts-connect
// Map internal method to bayar.gg method
function mapToBayarGGMethod(method) {
    return PAYMENT_METHOD_MAP[method] || null;
}
/**
 * Create payment via bayar.gg API
 * POST /api/create-payment.php
 *
 * Required: amount (minimum Rp 1,000), payment_url
 * Optional: description, customer info, callback_url, redirect_url, payment_method
 */
async function createBayarGGPayment(params) {
    if (!isBayarGGConfigured()) {
        return { success: false, error: 'bayar.gg belum dikonfigurasi' };
    }
    // Validate minimum amount (bayar.gg requires minimum Rp 1,000)
    if (params.amount < 1000) {
        return { success: false, error: 'Minimum payment amount is Rp 1,000' };
    }
    // Generate invoice ID with booking prefix
    const invoiceId = `BAYAR-${params.bookingId.slice(0, 8)}-${Date.now()}`;
    // Map payment method if provided
    const bayarggMethod = params.paymentMethod
        ? mapToBayarGGMethod(params.paymentMethod)
        : undefined;
    const payload = {
        amount: params.amount,
        payment_url: params.redirectUrl || params.callbackUrl || BAYARGG_CALLBACK_URL,
        description: params.description,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        callback_url: params.callbackUrl || BAYARGG_CALLBACK_URL,
        redirect_url: params.redirectUrl,
    };
    // Add optional fields if provided
    if (params.customerPhone) {
        payload.customer_phone = params.customerPhone;
    }
    // Add payment method if supported
    if (bayarggMethod) {
        payload.payment_method = bayarggMethod;
    }
    const result = await bayarggRequest('/create-payment.php', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!result.success || !result.data?.success) {
        return { success: false, error: result.error || result.data?.message || 'Failed to create payment' };
    }
    const paymentData = result.data.data;
    // Calculate expiry (default 24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
        success: true,
        paymentUrl: paymentData.payment_url,
        invoiceId: paymentData.invoice_id || invoiceId,
        qrisString: paymentData.qris_string,
        expiresAt,
    };
}
/**
 * Check payment status via bayar.gg API
 * GET /api/check-payment.php?invoice_id=xxx
 */
async function getBayarGGPaymentStatus(invoiceId) {
    const result = await bayarggRequest(`/check-payment.php?invoice_id=${encodeURIComponent(invoiceId)}`);
    if (!result.success || !result.data?.success) {
        return { success: false, error: result.error || result.data?.message || 'Failed to check payment' };
    }
    const paymentData = result.data.data;
    return {
        success: true,
        status: paymentData.status,
        invoiceId: paymentData.invoice_id,
        finalAmount: paymentData.final_amount,
        paidAt: paymentData.paid_at,
    };
}
/**
 * Get available payment methods from bayar.gg
 * GET /api/get-payment-methods.php
 */
async function getBayarGGPaymentMethods() {
    const result = await bayarggRequest('/get-payment-methods.php');
    if (!result.success || !result.data?.success) {
        return { success: false, error: result.error || result.data?.message };
    }
    return { success: true, methods: result.data.data };
}
// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================
/**
 * Verify bayar.gg webhook signature
 * Uses HMAC-SHA256 verification
 *
 * Signature format: HMACSHA256(invoice_id|status|final_amount|timestamp)
 * Headers: X-Webhook-Signature, X-Webhook-Timestamp
 */
function verifyBayarGGWebhook(signature, body, timestamp) {
    // SECURITY: Reject webhook if credentials are not configured
    if (!BAYARGG_WEBHOOK_SECRET) {
        console.error('[BAYARGG] Webhook REJECTED: webhook secret not configured');
        return false;
    }
    // Check for required parameters
    if (!signature || !timestamp) {
        console.warn('[BAYARGG] Webhook REJECTED: missing signature or timestamp');
        return false;
    }
    // SECURITY: Add timestamp validation to prevent replay attacks
    // Reject webhooks older than 5 minutes
    const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (isNaN(webhookTime)) {
        console.warn('[BAYARGG] Webhook REJECTED: invalid timestamp format');
        return false;
    }
    if (Math.abs(now - webhookTime) > MAX_TIMESTAMP_AGE_MS) {
        console.warn(`[BAYARGG] Webhook REJECTED: timestamp outside valid window (${MAX_TIMESTAMP_AGE_MS / 1000}s)`);
        return false;
    }
    // Parse body to get invoice_id, status, final_amount
    let payload;
    try {
        payload = JSON.parse(body);
    }
    catch {
        console.warn('[BAYARGG] Webhook REJECTED: invalid JSON body');
        return false;
    }
    // Build signature data: invoice_id|status|final_amount|timestamp
    const signatureData = [
        payload.invoice_id || '',
        payload.status || '',
        payload.final_amount?.toString() || '0',
        timestamp,
    ].join('|');
    const expectedSignature = (0, crypto_1.createHmac)('sha256', BAYARGG_WEBHOOK_SECRET)
        .update(signatureData)
        .digest('hex');
    try {
        const expected = Buffer.from(expectedSignature, 'utf8');
        const actual = Buffer.from(signature, 'utf8');
        if (expected.length !== actual.length) {
            console.warn('[BAYARGG] Webhook REJECTED: signature length mismatch');
            return false;
        }
        const result = (0, crypto_1.timingSafeEqual)(expected, actual);
        if (!result) {
            console.warn('[BAYARGG] Webhook REJECTED: signature mismatch');
        }
        return result;
    }
    catch {
        console.warn('[BAYARGG] Webhook REJECTED: signature verification error');
        return false;
    }
}
// ============================================================================
// PAYMENT STATUS MAPPING
// ============================================================================
/**
 * Map bayar.gg payment status to internal payment status
 * bayar.gg statuses: pending, paid, expired, cancelled
 */
function mapBayarGGStatusToPayment(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'paid';
        case 'expired':
            return 'expired';
        case 'cancelled':
        case 'failed':
            return 'failed';
        default:
            return 'pending';
    }
}
// ============================================================================
// HELPER: GET INVOICE URL
// ============================================================================
/**
 * Generate payment URL for a given invoice
 * This is used when the user wants to retry payment or view payment instructions
 */
function getBayarGGPaymentUrl(invoiceId) {
    return `https://www.bayar.gg/pay?invoice=${invoiceId}`;
}
//# sourceMappingURL=bayargg.service.js.map