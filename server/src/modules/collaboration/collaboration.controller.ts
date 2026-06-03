// Collaboration Controller - Shared view, comments, approval (no auth)

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as collaborationService from './collaboration.service';
import { isValidUUID } from '../../utils/validation';

const commentSchema = z.object({
  clientIdentifier: z.string().min(1).max(255),
  content: z.string().min(1).max(2000),
  parentCommentId: z.string().uuid().nullable().optional(),
});

const approveSchema = z.object({
  clientIdentifier: z.string().min(1).max(255),
});

const validatePasswordSchema = z.object({
  password: z.string().optional(),
});

// GET /api/shared/:token - Validate token, return shared view data
export async function getSharedView(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token } = req.params;
    const password = req.query.password as string | undefined;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Share token required' });
    }

    const eventId = await collaborationService.validateShareAccess(token, password ?? null);
    if (!eventId) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired link. Check the URL or password.',
      });
    }

    const data = await collaborationService.getSharedViewData(eventId, true);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// POST /api/shared/:token/validate - Validate token + password only (for password form)
export async function validateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token } = req.params;
    const parsed = validatePasswordSchema.safeParse(req.body);
    const password = parsed.success ? parsed.data.password : undefined;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Share token required' });
    }

    const eventId = await collaborationService.validateShareAccess(token, password ?? null);
    if (!eventId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or incorrect password',
      });
    }

    res.json({ success: true, data: { valid: true } });
  } catch (error) {
    next(error);
  }
}

// GET /api/shared/:token/comments - List comments
export async function getComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token } = req.params;
    const password = req.query.password as string | undefined;

    const eventId = await collaborationService.validateShareAccess(token, password ?? null);
    if (!eventId) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' });
    }

    const comments = await collaborationService.getComments(eventId);
    const payload = { success: true, data: comments };
    console.log('[API] GET /api/shared/:token/comments', { token, eventId, count: comments.length, response: JSON.stringify(payload) });
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

// POST /api/shared/:token/comments - Add comment
export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token } = req.params;
    const password = req.query.password as string | undefined;

    const eventId = await collaborationService.validateShareAccess(token, password ?? null);
    if (!eventId) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' });
    }

    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const comment = await collaborationService.addComment(eventId, parsed.data, false);
    console.log('[API] POST /api/shared/:token/comments (client)', { token, eventId, commentId: comment.id });
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
}

// POST /api/shared/:token/approve - Client submits approval
export async function submitApproval(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token } = req.params;
    const password = req.query.password as string | undefined;

    const eventId = await collaborationService.validateShareAccess(token, password ?? null);
    if (!eventId) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' });
    }

    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Client name required',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await collaborationService.submitApproval(
      eventId,
      parsed.data.clientIdentifier
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Approval failed',
      });
    }

    res.json({ success: true, data: { message: 'Design approved successfully' } });
  } catch (error) {
    next(error);
  }
}
