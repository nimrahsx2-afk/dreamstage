// Events Controller - HTTP handlers for event CRUD

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as eventsService from './events.service';
import * as editorService from '../editor/editor.service';
import * as collaborationService from '../collaboration/collaboration.service';
import { isValidUUID } from '../../utils/validation';
import { query, queryOne } from '../../db/client';

// Zod schemas
const eventInputSchema = z.object({
  name: z.string().min(1).max(255),
  eventType: z.string().min(1).max(50),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venueTemplateId: z.string().uuid().optional(),
  budgetCeiling: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

const shareSettingsSchema = z.object({
  sharePassword: z.string().nullable().optional(),
  showBudgetDetails: z.boolean().optional(),
});

const unlockConfirmSchema = z.object({
  confirm: z.literal(true),
});

const plannerCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentCommentId: z.string().uuid().nullable().optional(),
});

const eventUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  eventType: z.string().min(1).max(50).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  venueTemplateId: z.string().uuid().nullable().optional(),
  budgetCeiling: z.number().min(0).nullable().optional(),
  showBudgetDetails: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// GET /api/events - Get all events for current planner
export async function getEvents(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;
    const events = await eventsService.getPlannerEvents(user.id);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/events/:eventId - Get single event
export async function getEvent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    // Verify ownership
    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    const event = await eventsService.getEvent(eventId);

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/events - Create new event
export async function createEvent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;

    const parsed = eventInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const event = await eventsService.createEvent(user.id, parsed.data);

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

function parseBudgetCeiling(range: string | null): number | null {
  if (!range) return null;
  const matches = range.match(/\d[\d,]*/g);
  if (!matches?.length) return null;
  const nums = matches
    .map((m) => parseInt(m.replace(/,/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  return nums.length > 0 ? Math.max(...nums) : null;
}

function formatInquiryEventDate(
  value: Date | string | null | undefined
): string {
  if (!value) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  const s = String(value);
  return s.split('T')[0].slice(0, 10);
}

// POST /api/events/from-inquiry/:inquiryId — create event from submitted client inquiry
export async function createFromInquiry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as any).user;
    const { inquiryId } = req.params;

    if (!isValidUUID(inquiryId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid inquiry ID format',
      });
      return;
    }

    const inquiry = await queryOne<{
      id: string;
      planner_id: string;
      client_name: string | null;
      event_type: string | null;
      event_date: Date | string | null;
      guest_count: number | null;
      budget_range: string | null;
      venue_type: string | null;
      special_requests: string | null;
      is_submitted: boolean;
    }>(
      `SELECT id, planner_id, client_name, event_type, event_date, guest_count,
              budget_range, venue_type, special_requests, is_submitted
       FROM inquiries
       WHERE id = $1 AND planner_id = $2`,
      [inquiryId, user.id]
    );

    if (!inquiry) {
      res.status(404).json({
        success: false,
        error: 'Inquiry not found',
      });
      return;
    }

    if (!inquiry.is_submitted) {
      res.status(400).json({
        success: false,
        error: 'Inquiry has not been submitted yet',
      });
      return;
    }

    const eventName = inquiry.client_name?.trim()
      ? `${inquiry.client_name.trim()} — ${inquiry.event_type?.trim() || 'Event'}`
      : `New ${inquiry.event_type?.trim() || 'Event'}`;

    const noteParts: string[] = [];
    if (inquiry.special_requests?.trim()) {
      noteParts.push(inquiry.special_requests.trim());
    }
    if (inquiry.guest_count != null && inquiry.guest_count > 0) {
      noteParts.push(`Guest count (from inquiry): ${inquiry.guest_count}`);
    }
    if (inquiry.venue_type?.trim()) {
      noteParts.push(`Venue preference: ${inquiry.venue_type.trim()}`);
    }
    let notes = noteParts.length > 0 ? noteParts.join('\n\n') : null;
    if (notes && notes.length > 10000) {
      notes = notes.slice(0, 10000);
    }

    const rawType = (inquiry.event_type || 'wedding').trim().toLowerCase();
    const eventType = rawType.length > 0 ? rawType : 'wedding';

    const newEvent = await eventsService.createEvent(user.id, {
      name: eventName.slice(0, 255),
      eventType: eventType.slice(0, 50),
      eventDate: formatInquiryEventDate(inquiry.event_date),
      venueTemplateId: undefined,
      budgetCeiling: parseBudgetCeiling(inquiry.budget_range) ?? undefined,
      notes: notes ?? undefined,
    });

    await query(
      `UPDATE inquiries
       SET converted_event_id = $1,
           converted_at = NOW()
       WHERE id = $2`,
      [newEvent.id, inquiryId]
    );

    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    next(err);
  }
}

// PUT /api/events/:eventId - Update event
export async function updateEvent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    // Verify ownership
    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    const parsed = eventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const event = await eventsService.updateEvent(eventId, parsed.data);

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/events/:eventId - Delete event
export async function deleteEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    console.log('[DELETE] eventId:', eventId, 'userId:', user.id);

    if (!isValidUUID(eventId)) {
      res.status(400).json({ success: false, error: 'Invalid event ID' });
      return;
    }

    const event = await queryOne<{ id: string }>(
      `SELECT id FROM events WHERE id = $1 AND planner_id = $2`,
      [eventId, user.id]
    );

    console.log('[DELETE] event found:', !!event);

    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }

    await eventsService.deleteEvent(eventId);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE] error:', err);
    next(err);
  }
}

// GET /api/events/:eventId/comments - Get comments (planner)
export async function getEventComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({ success: false, error: 'Invalid event ID format' });
    }

    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const comments = await collaborationService.getComments(eventId);
    const payload = { success: true, data: comments };
    console.log('[API] GET /api/events/:eventId/comments', { eventId, count: comments.length, response: JSON.stringify(payload) });
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

// POST /api/events/:eventId/comments - Add planner reply
export async function addEventComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({ success: false, error: 'Invalid event ID format' });
    }

    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const parsed = plannerCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const comment = await collaborationService.addComment(
      eventId,
      { clientIdentifier: user.name, content: parsed.data.content, parentCommentId: parsed.data.parentCommentId },
      true
    );
    console.log('[API] POST /api/events/:eventId/comments (planner reply)', { eventId, parentCommentId: parsed.data.parentCommentId, commentId: comment.id });
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/events/:eventId/share - Update share settings
export async function updateShareSettings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({ success: false, error: 'Invalid event ID format' });
    }

    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const parsed = shareSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid share settings',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const event = await eventsService.updateShareSettings(
      eventId,
      parsed.data.sharePassword ?? null,
      parsed.data.showBudgetDetails
    );

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/events/:eventId/unlock - Unlock scene (planner, with confirmation)
export async function unlockEvent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({ success: false, error: 'Invalid event ID format' });
    }

    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const parsed = unlockConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { confirm: true } to unlock.',
      });
    }

    await editorService.unlockScene(eventId);

    res.json({ success: true, data: { message: 'Scene unlocked' } });
  } catch (error) {
    next(error);
  }
}
