/**
 * Global error handling middleware.
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env';

/**
 * Custom application error with status code.
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error (404).
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Validation error (400).
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

/**
 * Conflict error (409) - for duplicate resources.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Forbidden error (403) - for permission issues.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Global error handler middleware.
 * Must be registered last in the middleware chain.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error in development
  if (env.isDevelopment) {
    console.error('Error:', err);
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Multer upload errors (file size, wrong field, etc.)
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected upload field'
          : err.message;
    return res.status(400).json({
      success: false,
      error: msg,
    });
  }

  // Multer fileFilter / disk errors often surface as plain Error with message
  const errMsg = err.message || '';
  if (
    errMsg.includes('Only .glb model files') ||
    errMsg.includes('Thumbnail must be JPG') ||
    errMsg.includes('Only image uploads are allowed') ||
    errMsg.includes('Unexpected field')
  ) {
    return res.status(400).json({
      success: false,
      error: errMsg,
    });
  }

  // Handle Postgres unique constraint violations
  if ((err as any).code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
    });
  }

  // Handle Postgres foreign key violations
  if ((err as any).code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced resource does not exist',
    });
  }

  // Default to 500 internal server error
  const message = env.isDevelopment ? err.message : 'Internal server error';

  res.status(500).json({
    success: false,
    error: message,
  });
}

/**
 * 404 handler for undefined routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
