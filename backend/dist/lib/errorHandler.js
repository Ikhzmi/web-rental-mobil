"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.asyncHandler = asyncHandler;
exports.sendError = sendError;
exports.notFoundHandler = notFoundHandler;
exports.globalErrorHandler = globalErrorHandler;
/**
 * Wraps an async route handler to automatically catch errors and pass them to next()
 * This eliminates the need for try-catch blocks in every route handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Custom application error class with status code
 */
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Error response helper
 */
function sendError(res, message, statusCode = 500) {
    res.status(statusCode).json({ error: message });
}
/**
 * Not found handler for undefined routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan` });
}
/**
 * Global error handler middleware
 * Should be registered last in Express app
 */
function globalErrorHandler(err, req, res, _next) {
    console.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }
    // Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        console.error('Prisma error:', prismaError.code);
        // Handle specific Prisma error codes
        switch (prismaError.code) {
            case 'P2002': // Unique constraint
                res.status(409).json({ error: 'Data sudah ada' });
                return;
            case 'P2025': // Record not found
                res.status(404).json({ error: 'Data tidak ditemukan' });
                return;
            default:
                res.status(400).json({ error: 'Data tidak valid' });
                return;
        }
    }
    // Validation errors (Zod)
    // SECURITY: Sanitize Zod errors to prevent information disclosure
    if (err.name === 'ZodError') {
        const zodErr = err;
        const flat = zodErr.flatten();
        // Extract only field names, not internal validation details
        const fields = Object.keys(flat.fieldErrors || {});
        res.status(400).json({
            error: 'Validasi gagal',
            fields: fields,
            message: flat.formErrors?.[0] || 'Data yang dikirim tidak valid'
        });
        return;
    }
    // Default server error
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
}
//# sourceMappingURL=errorHandler.js.map