import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as requirementsService from './requirements.service';
import * as eventsService from '../events/events.service';

const submitSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().max(255),
  eventType: z.string().min(1).max(100),
  eventDate: z.string().min(1).max(20),
  guestCount: z.number().int().min(10),
  venueType: z.string().min(1).max(100),
  hallPreference: z.string().max(255).optional().default(''),
  seatingStyle: z.string().min(1).max(100),
  seatingNotes: z.string().max(5000).optional().default(''),
  mealPreference: z.string().min(1).max(100),
  addons: z.array(z.string().min(1).max(255)).default([]),
  budgetRange: z.string().min(1).max(100),
  lightingPreference: z.string().min(1).max(100),
  decorationPreference: z.string().max(255).optional().default(''),
  specialRequests: z.string().max(5000).optional().default(''),
});

// POST /api/events/:eventId/requirements/generate-link (planner)
export async function generateLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const result = await requirementsService.generateLink(eventId);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

// GET /api/events/:eventId/requirements (planner)
export async function getForEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const isOwner = await eventsService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const row = await requirementsService.getForEvent(eventId);
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
}

// GET /api/requirements/:token (public)
export async function getByToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const data = await requirementsService.getByToken(token);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

// POST /api/requirements/:token (public)
export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    await requirementsService.submitForm(token, parsed.data);
    res.json({ success: true, data: { message: 'Submitted' } });
  } catch (e) {
    next(e);
  }
}

