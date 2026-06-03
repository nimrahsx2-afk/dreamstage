import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePlanner } from '../../middleware/requireRole';
import * as requirementsController from './requirements.controller';

const router = Router();

// Planner routes (nested under /api/events)
router.post(
  '/:eventId/requirements/generate-link',
  authenticate,
  requirePlanner,
  requirementsController.generateLink
);

router.get(
  '/:eventId/requirements',
  authenticate,
  requirePlanner,
  requirementsController.getForEvent
);

// Public routes (mounted under /api/requirements)
router.get('/:token', requirementsController.getByToken);
router.post('/:token', requirementsController.submit);

export default router;

