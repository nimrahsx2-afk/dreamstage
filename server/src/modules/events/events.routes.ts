// Events Routes - API endpoints for event management

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePlanner } from '../../middleware/requireRole';
import * as eventsController from './events.controller';

const router = Router();

// All routes require authentication and planner role
router.use(authenticate);
router.use(requirePlanner);

// GET /api/events - List planner's events
router.get('/', eventsController.getEvents);

// POST /api/events - Create new event
router.post('/', eventsController.createEvent);

// POST /api/events/from-inquiry/:inquiryId — must be before /:eventId routes
router.post(
  '/from-inquiry/:inquiryId',
  eventsController.createFromInquiry
);

// GET /api/events/:eventId - Get single event
router.get('/:eventId', eventsController.getEvent);

// GET /api/events/:eventId/comments - Get comments (planner view)
router.get('/:eventId/comments', eventsController.getEventComments);

// POST /api/events/:eventId/comments - Add planner reply
router.post('/:eventId/comments', eventsController.addEventComment);

// PUT /api/events/:eventId - Update event
router.put('/:eventId', eventsController.updateEvent);

// DELETE /api/events/:eventId - Delete event
router.delete('/:eventId', eventsController.deleteEvent);

// PATCH /api/events/:eventId/share - Update share settings (password, show budget)
router.patch('/:eventId/share', eventsController.updateShareSettings);

// PATCH /api/events/:eventId/unlock - Unlock scene (planner, with confirmation)
router.patch('/:eventId/unlock', eventsController.unlockEvent);

export default router;
