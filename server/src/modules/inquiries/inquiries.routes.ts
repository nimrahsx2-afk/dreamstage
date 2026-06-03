import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePlanner } from '../../middleware/requireRole';
import * as inquiriesController from './inquiries.controller';

const router = Router();

router.post(
  '/generate-link',
  authenticate,
  requirePlanner,
  inquiriesController.generateLink
);

router.get('/', authenticate, requirePlanner, inquiriesController.list);

router.put('/:id', authenticate, requirePlanner, inquiriesController.update);

router.delete('/:id', authenticate, requirePlanner, inquiriesController.remove);

router.post(
  '/:token/submit',
  inquiriesController.inquirySubmitUploadMiddleware,
  inquiriesController.submit
);

router.get('/:token', inquiriesController.getByToken);

export default router;
