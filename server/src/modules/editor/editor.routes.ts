// Editor Routes - Scene management endpoints

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePlanner } from '../../middleware/requireRole';
import * as editorController from './editor.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/editor/:eventId/scene - Load scene (planner + client via share token handled separately)
router.get('/:eventId/scene', editorController.loadScene);

// PUT /api/editor/:eventId/scene - Save scene (planner only)
router.put('/:eventId/scene', requirePlanner, editorController.saveScene);

// POST /api/editor/:eventId/lock - Lock scene (called by approval flow)
router.post('/:eventId/lock', editorController.lockSceneHandler);

// POST /api/editor/:eventId/unlock - Unlock scene (planner only)
router.post('/:eventId/unlock', requirePlanner, editorController.unlockSceneHandler);

// GET /api/editor/:eventId/status - Get scene lock status
router.get('/:eventId/status', editorController.getSceneStatus);

export default router;
