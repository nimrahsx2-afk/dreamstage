// Checklist Controller - ChecklistItem, Milestone, TimelineEntry

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as checklistService from './checklist.service';
import * as eventsService from '../events/events.service';

const itemIdParam = z.object({ eventId: z.string().uuid(), itemId: z.string().uuid() });
const milestoneIdParam = z.object({ eventId: z.string().uuid(), milestoneId: z.string().uuid() });
const entryIdParam = z.object({ eventId: z.string().uuid(), entryId: z.string().uuid() });

const addChecklistSchema = z.object({
  title: z.string().min(1).max(255),
  dueDate: z.string().optional().nullable(),
});

const toggleChecklistSchema = z.object({
  isComplete: z.boolean(),
});

const addMilestoneSchema = z.object({
  title: z.string().min(1).max(255),
  targetDate: z.string(),
});

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  targetDate: z.string().optional(),
  isComplete: z.boolean().optional(),
});

const addTimelineSchema = z.object({
  timeSlot: z.string(), // e.g. "09:00" or "14:30"
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

const updateTimelineSchema = z.object({
  timeSlot: z.string().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

async function ensurePlannerOwnsEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  const isOwner = await eventsService.verifyEventOwnership(eventId, userId);
  return isOwner;
}

// GET /api/events/:eventId/checklist
export async function getChecklist(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const items = await checklistService.getChecklistItems(eventId);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/events/:eventId/checklist/:itemId
export async function toggleChecklistItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = itemIdParam.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid IDs' });
    }
    const { eventId, itemId } = parsed.data;

    const body = toggleChecklistSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ success: false, error: 'Invalid body' });
    }

    const user = (req as any).user;
    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const item = await checklistService.toggleChecklistItem(
      eventId,
      itemId,
      body.data.isComplete
    );
    if (!item) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

// POST /api/events/:eventId/checklist
export async function addChecklistItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const parsed = addChecklistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const item = await checklistService.addManualChecklistItem(
      eventId,
      parsed.data.title,
      parsed.data.dueDate ?? undefined
    );
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/events/:eventId/checklist/:itemId
export async function deleteChecklistItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = itemIdParam.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid IDs' });
    }
    const { eventId, itemId } = parsed.data;

    const user = (req as any).user;
    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const deleted = await checklistService.deleteChecklistItem(eventId, itemId);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete system-generated item or item not found',
      });
    }
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    next(error);
  }
}

// ----- Milestones -----

// GET /api/events/:eventId/milestones
export async function getMilestones(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const milestones = await checklistService.getMilestones(eventId);
    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
}

// POST /api/events/:eventId/milestones
export async function createMilestone(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const parsed = addMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const milestone = await checklistService.createMilestone(
      eventId,
      parsed.data.title,
      parsed.data.targetDate
    );
    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/events/:eventId/milestones/:milestoneId
export async function updateMilestone(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = milestoneIdParam.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid IDs' });
    }
    const { eventId, milestoneId } = parsed.data;

    const user = (req as any).user;
    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const body = updateMilestoneSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: body.error.flatten().fieldErrors,
      });
    }

    const milestone = await checklistService.updateMilestone(
      eventId,
      milestoneId,
      body.data
    );
    if (!milestone) {
      return res.status(404).json({ success: false, error: 'Milestone not found' });
    }
    res.json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/events/:eventId/milestones/:milestoneId
export async function deleteMilestone(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = milestoneIdParam.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid IDs' });
    }
    const { eventId, milestoneId } = parsed.data;

    const user = (req as any).user;
    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const deleted = await checklistService.deleteMilestone(eventId, milestoneId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Milestone not found' });
    }
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    next(error);
  }
}

// ----- Timeline -----

// GET /api/events/:eventId/timeline
export async function getTimeline(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const entries = await checklistService.getTimelineEntries(eventId);
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
}

// POST /api/events/:eventId/timeline
export async function createTimelineEntry(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = (req as any).user;

    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const parsed = addTimelineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const entry = await checklistService.createTimelineEntry(
      eventId,
      parsed.data.timeSlot,
      parsed.data.title,
      parsed.data.description,
      parsed.data.sortOrder
    );
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/events/:eventId/timeline/:entryId
export async function updateTimelineEntry(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = entryIdParam.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid IDs' });
    }
    const { eventId, entryId } = parsed.data;

    const user = (req as any).user;
    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const body = updateTimelineSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: body.error.flatten().fieldErrors,
      });
    }

    const entry = await checklistService.updateTimelineEntry(
      eventId,
      entryId,
      body.data
    );
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Timeline entry not found' });
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/events/:eventId/timeline/:entryId
export async function deleteTimelineEntry(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = entryIdParam.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid IDs' });
    }
    const { eventId, entryId } = parsed.data;

    const user = (req as any).user;
    const owns = await ensurePlannerOwnsEvent(eventId, user.id);
    if (!owns) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const deleted = await checklistService.deleteTimelineEntry(eventId, entryId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Timeline entry not found' });
    }
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    next(error);
  }
}
