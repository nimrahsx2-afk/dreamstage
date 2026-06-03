/**
 * Authentication middleware - validates JWT tokens and attaches user to request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.service';
import { UserPayload } from '../modules/auth/auth.types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT.
 * Extracts token from Authorization header (Bearer scheme).
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
      });
    }

    // Support "Bearer <token>" format
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format. Use: Bearer <token>',
      });
    }

    const token = parts[1];
    const payload = verifyToken(token);

    // Attach user payload to request
    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        req.user = verifyToken(token);
      }
    }

    next();
  } catch (error) {
    // Token invalid but optional, continue without user
    next();
  }
}
