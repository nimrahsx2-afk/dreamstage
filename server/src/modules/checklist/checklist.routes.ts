// Checklist Routes - Nested under /api/events/:eventId

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePlanner } from '../../middleware/requireRole';
import * as checklistController from './checklist.controller';

const router = Router();

router.use(authenticate);
router.use(requirePlanner);

// Checklist items
router.get('/:eventId/checklist', checklistController.getChecklist);
router.patch('/:eventId/checklist/:itemId', checklistController.toggleChecklistItem);
router.post('/:eventId/checklist', checklistController.addChecklistItem);
router.delete('/:eventId/checklist/:itemId', checklistController.deleteChecklistItem);

// Milestones
router.get('/:eventId/milestones', checklistController.getMilestones);
router.post('/:eventId/milestones', checklistController.createMilestone);
router.patch('/:eventId/milestones/:milestoneId', checklistController.updateMilestone);
router.delete('/:eventId/milestones/:milestoneId', checklistController.deleteMilestone);

// Timeline
router.get('/:eventId/timeline', checklistController.getTimeline);
router.post('/:eventId/timeline', checklistController.createTimelineEntry);
router.patch('/:eventId/timeline/:entryId', checklistController.updateTimelineEntry);
router.delete('/:eventId/timeline/:entryId', checklistController.deleteTimelineEntry);

export default router;
