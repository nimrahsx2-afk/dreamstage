// Collaboration Routes - Public share view (no auth, token-based)

import { Router } from 'express';
import * as collaborationController from './collaboration.controller';

const router = Router();

// All routes are public - validation via share token in URL
// Optional ?password=xxx query param for password-protected shares

// GET /api/shared/:token - Get shared view data (event, scene, budget summary)
router.get('/:token', collaborationController.getSharedView);

// POST /api/shared/:token/validate - Validate token + password (for password form)
router.post('/:token/validate', collaborationController.validateToken);

// GET /api/shared/:token/comments - List comments
router.get('/:token/comments', collaborationController.getComments);

// POST /api/shared/:token/comments - Add comment
router.post('/:token/comments', collaborationController.addComment);

// POST /api/shared/:token/approve - Client submits approval
router.post('/:token/approve', collaborationController.submitApproval);

export default router;
