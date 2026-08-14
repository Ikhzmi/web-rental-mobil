import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to automatically catch errors and pass them to next()
 * This eliminates the need for try-catch blocks in every route handler
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom application error class with status code
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response helper
 */
export function sendError(res: Response, message: string, statusCode: number = 500): void {
  res.status(statusCode).json({ error: message });
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan` });
}

/**
 * Global error handler middleware
 * Should be registered last in Express app
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
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
    const prismaError = err as Error & { code: string; meta?: unknown };
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
    const zodErr = err as Error & { flatten: () => { fieldErrors: Record<string, string[]>; formErrors: string[] } };
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
