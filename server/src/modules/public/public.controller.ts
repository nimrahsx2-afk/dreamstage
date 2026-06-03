/**
 * Public Controller - Unauthenticated endpoints for homepage and marketing.
 */

import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../booking/booking.service';

/**
 * GET /api/public/venues - List active venue templates (no auth required)
 */
export async function getPublicVenues(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const venues = await bookingService.getVenueTemplates(true);

    res.json({
      success: true,
      data: venues,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/public/venues/:venueId - Get a single venue template (no auth required)
 */
export async function getPublicVenue(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { venueId } = req.params;
    const venue = await bookingService.getVenueTemplate(venueId);
    if (!venue) {
      res.status(404).json({ success: false, error: 'Venue not found' });
      return;
    }
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}
