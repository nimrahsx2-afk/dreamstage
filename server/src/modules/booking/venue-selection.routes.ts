import express from 'express';
import { authenticate as requireAuth } from '../../middleware/auth';
import * as ctrl from './venue-selection.controller';

const router = express.Router();

// Planner shortlists venues for client
router.post('/inquiries/:inquiryId/shortlist-venues', requireAuth, ctrl.shortlistVenues);

// Get venue selection page data (public)
router.get('/venue-selection/:token', ctrl.getVenueSelection);

// Client selects a venue (public)
router.post('/venue-selection/:token/select', ctrl.selectVenue);

export default router;

