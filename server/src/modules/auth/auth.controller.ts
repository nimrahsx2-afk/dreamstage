/**
 * Authentication controller - handles HTTP concerns for auth endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'planner']),
});

/**
 * POST /api/auth/register
 * Register a new planner account.
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerPlanner(input);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    if (error instanceof Error && error.message === 'Email already registered') {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.loginUser(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    if (error instanceof Error && error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error instanceof Error &&
      (error.message ===
        'This account is not an admin account. Please use the Planner login.' ||
        error.message === 'This is an admin account. Please use the Admin login tab.')
    ) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user.
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    // req.user is attached by auth middleware
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
