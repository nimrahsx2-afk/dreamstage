// Venue Booking Controller - HTTP handlers for venue and booking operations

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bookingService from './booking.service';
import { isValidUUID } from '../../utils/validation';

// Zod schemas
const venueTemplateInputSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(50),
  capacity: z.number().int().min(1),
  thumbnailUrl: z.string().url().max(500).optional(),
  modelRef: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

const venueTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).optional(),
  thumbnailUrl: z.string().url().max(500).nullable().optional(),
  modelRef: z.string().max(500).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

const bookVenueSchema = z.object({
  venueTemplateId: z.string().uuid(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

const changeDateSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

// ============ VENUE TEMPLATES ============

// GET /api/booking/venues - Get all venue templates
export async function getVenueTemplates(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const venues = await bookingService.getVenueTemplates(activeOnly);

    res.json({
      success: true,
      data: venues,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/booking/venues/:venueId - Get single venue
export async function getVenueTemplate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { venueId } = req.params;

    if (!isValidUUID(venueId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid venue ID format',
      });
    }

    const venue = await bookingService.getVenueTemplate(venueId);

    if (!venue) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found',
      });
    }

    res.json({
      success: true,
      data: venue,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/booking/venues - Create venue (Admin)
export async function createVenueTemplate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = venueTemplateInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid venue data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const venue = await bookingService.createVenueTemplate(parsed.data);

    res.status(201).json({
      success: true,
      data: venue,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/booking/venues/:venueId - Update venue (Admin)
export async function updateVenueTemplate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { venueId } = req.params;

    if (!isValidUUID(venueId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid venue ID format',
      });
    }

    const parsed = venueTemplateUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const venue = await bookingService.updateVenueTemplate(venueId, parsed.data);

    if (!venue) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found',
      });
    }

    res.json({
      success: true,
      data: venue,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/booking/venues/:venueId - Delete venue (Admin)
export async function deleteVenueTemplate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { venueId } = req.params;

    if (!isValidUUID(venueId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid venue ID format',
      });
    }

    const deleted = await bookingService.deleteVenueTemplate(venueId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found',
      });
    }

    res.json({
      success: true,
      message: 'Venue deactivated',
    });
  } catch (error) {
    next(error);
  }
}

// ============ VENUE AVAILABILITY ============

// GET /api/booking/venues/:venueId/availability - Check availability
export async function checkVenueAvailability(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { venueId } = req.params;
    const { date, startDate, endDate } = req.query;

    if (!isValidUUID(venueId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid venue ID format',
      });
    }

    // Single date check
    if (date && typeof date === 'string') {
      const availability = await bookingService.checkVenueAvailability(venueId, date);
      return res.json({
        success: true,
        data: availability,
      });
    }

    // Date range check
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const availability = await bookingService.getVenueAvailabilityRange(
        venueId,
        startDate,
        endDate
      );
      return res.json({
        success: true,
        data: availability,
      });
    }

    // Default: get all booked dates
    const bookedDates = await bookingService.getVenueBookedDates(venueId);
    res.json({
      success: true,
      data: { bookedDates },
    });
  } catch (error) {
    next(error);
  }
}

// ============ EVENT BOOKINGS ============

// GET /api/booking/events/:eventId - Get booking for event
export async function getEventBooking(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const booking = await bookingService.getEventBooking(eventId);

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/booking/events/:eventId - Book venue for event
export async function bookVenue(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const parsed = bookVenueSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await bookingService.bookVenue(eventId, parsed.data);

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: result.error,
      });
    }

    res.status(201).json({
      success: true,
      data: result.booking,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/booking/events/:eventId/confirm - Confirm booking
export async function confirmBooking(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const result = await bookingService.confirmBooking(eventId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.booking,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/booking/events/:eventId/date - Change booking date
export async function changeBookingDate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const parsed = changeDateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await bookingService.changeBookingDate(eventId, parsed.data.newDate);

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.booking,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/booking/events/:eventId - Cancel booking
export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const cancelled = await bookingService.cancelBooking(eventId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'No booking found for this event',
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled',
    });
  } catch (error) {
    next(error);
  }
}
