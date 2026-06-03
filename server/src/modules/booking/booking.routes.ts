// Venue Booking Routes - API endpoints for venue and booking operations

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requirePlanner, requireAuthenticated } from '../../middleware/requireRole';
import * as bookingController from './booking.controller';

const router = Router();

router.use(authenticate);

// ============ PUBLIC VENUE ROUTES (any authenticated user) ============

// GET /api/booking/venues - Get all venue templates
router.get('/venues', bookingController.getVenueTemplates);

// GET /api/booking/venues/:venueId - Get single venue
router.get('/venues/:venueId', bookingController.getVenueTemplate);

// GET /api/booking/venues/:venueId/availability - Check availability
router.get('/venues/:venueId/availability', bookingController.checkVenueAvailability);

// ============ EVENT BOOKING ROUTES (planner) ============

// GET /api/booking/events/:eventId - Get booking for event
router.get('/events/:eventId', requirePlanner, bookingController.getEventBooking);

// POST /api/booking/events/:eventId - Book venue for event
router.post('/events/:eventId', requirePlanner, bookingController.bookVenue);

// PUT /api/booking/events/:eventId/confirm - Confirm booking
router.put('/events/:eventId/confirm', requirePlanner, bookingController.confirmBooking);

// PUT /api/booking/events/:eventId/date - Change booking date
router.put('/events/:eventId/date', requirePlanner, bookingController.changeBookingDate);

// DELETE /api/booking/events/:eventId - Cancel booking
router.delete('/events/:eventId', requirePlanner, bookingController.cancelBooking);

// ============ ADMIN VENUE MANAGEMENT ============

// POST /api/booking/venues - Create venue (Admin)
router.post('/venues', requireAdmin, bookingController.createVenueTemplate);

// PUT /api/booking/venues/:venueId - Update venue (Admin)
router.put('/venues/:venueId', requireAdmin, bookingController.updateVenueTemplate);

// DELETE /api/booking/venues/:venueId - Delete venue (Admin)
router.delete('/venues/:venueId', requireAdmin, bookingController.deleteVenueTemplate);

export default router;
