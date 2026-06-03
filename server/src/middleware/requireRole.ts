/**
 * Role-based access control middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '../config/constants';

/**
 * Middleware factory to require specific role(s).
 * Must be used after authenticate middleware.
 * 
 * @example
 * router.get('/admin-only', authenticate, requireRole('admin'), handler);
 * router.get('/both', authenticate, requireRole('admin', 'planner'), handler);
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role as Role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Middleware to require admin role.
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require planner role.
 */
export const requirePlanner = requireRole('planner');

/**
 * Middleware to allow both admin and planner.
 */
export const requireAuthenticated = requireRole('admin', 'planner');
