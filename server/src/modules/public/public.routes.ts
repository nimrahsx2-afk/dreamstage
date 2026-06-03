/**
 * Public routes - No authentication required.
 */

import { Router } from 'express';
import * as publicController from './public.controller';

const router = Router();

// GET /api/public/venues - List active venues for homepage
router.get('/venues', publicController.getPublicVenues);
// GET /api/public/venues/:venueId - Get single venue for detail page
router.get('/venues/:venueId', publicController.getPublicVenue);

export default router;
