import express from 'express';
import { authenticate as requireAuth } from '../../middleware/auth';
import {
  estimateBudget,
  estimateInquiryBudget,
  parseInquiry,
  suggestLayout,
} from './ai.controller';

const router = express.Router();
router.post('/parse-inquiry', parseInquiry);
router.post('/estimate-inquiry-budget', estimateInquiryBudget);
router.post('/estimate-budget', requireAuth, estimateBudget);
router.post('/suggest-layout', requireAuth, suggestLayout);

export default router;
