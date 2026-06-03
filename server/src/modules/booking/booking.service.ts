// Venue Booking Service - Venue management and booking with conflict detection

import { queryOne, queryAll, getPool } from '../../db/client';
import type {
  VenueTemplate,
  VenueTemplateInput,
  VenueTemplateUpdate,
  VenueBooking,
  VenueBookingWithDetails,
  BookVenueInput,
  BookingStatus,
  VenueAvailability,
  DbVenueTemplate,
  DbVenueBooking,
  DbVenueBookingWithDetails,
} from './booking.types';

// ============ TRANSFORM FUNCTIONS ============

function parseGalleryImages(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function transformVenueTemplate(row: DbVenueTemplate): VenueTemplate {
  const price =
    row.price_per_head != null && row.price_per_head !== ''
      ? parseFloat(String(row.price_per_head))
      : null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    capacity: row.capacity,
    thumbnailUrl: row.thumbnail_url,
    modelRef: row.model_ref,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    galleryImages: parseGalleryImages(row.gallery_images),
    videoUrl: row.video_url ?? null,
    pricePerHead: price != null && Number.isFinite(price) ? price : null,
    location: row.location ?? null,
  };
}

function transformVenueBooking(row: DbVenueBooking): VenueBooking {
  return {
    id: row.id,
    eventId: row.event_id,
    venueTemplateId: row.venue_template_id,
    bookingDate: row.booking_date.toISOString().split('T')[0],
    status: row.status as BookingStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function transformVenueBookingWithDetails(row: DbVenueBookingWithDetails): VenueBookingWithDetails {
  return {
    ...transformVenueBooking(row),
    venueName: row.venue_name,
    venueCategory: row.venue_category,
    venueCapacity: row.venue_capacity,
    thumbnailUrl: row.thumbnail_url ?? null,
    location: row.location ?? null,
    bookedByClient: row.booked_by_client === true,
  };
}

// ============ VENUE TEMPLATE CRUD (Admin) ============

// Get all venue templates
export async function getVenueTemplates(activeOnly: boolean = true): Promise<VenueTemplate[]> {
  const query = activeOnly
    ? `SELECT * FROM venue_templates WHERE is_active = true ORDER BY category, name`
    : `SELECT * FROM venue_templates ORDER BY category, name`;

  const rows = await queryAll<DbVenueTemplate>(query);
  return rows.map(transformVenueTemplate);
}

// Get venue templates by category
export async function getVenueTemplatesByCategory(category: string): Promise<VenueTemplate[]> {
  const rows = await queryAll<DbVenueTemplate>(
    `SELECT * FROM venue_templates WHERE category = $1 AND is_active = true ORDER BY name`,
    [category]
  );
  return rows.map(transformVenueTemplate);
}

// Get a single venue template
export async function getVenueTemplate(venueId: string): Promise<VenueTemplate | null> {
  const row = await queryOne<DbVenueTemplate>(
    `SELECT * FROM venue_templates WHERE id = $1`,
    [venueId]
  );
  return row ? transformVenueTemplate(row) : null;
}

// Create venue template (Admin)
export async function createVenueTemplate(input: VenueTemplateInput): Promise<VenueTemplate> {
  const row = await queryOne<DbVenueTemplate>(
    `INSERT INTO venue_templates (name, category, capacity, thumbnail_url, model_ref, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.name,
      input.category,
      input.capacity,
      input.thumbnailUrl || null,
      input.modelRef || null,
      input.description || null,
      input.isActive ?? true,
    ]
  );

  return transformVenueTemplate(row!);
}

// Update venue template (Admin)
export async function updateVenueTemplate(
  venueId: string,
  input: VenueTemplateUpdate
): Promise<VenueTemplate | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.capacity !== undefined) {
    updates.push(`capacity = $${paramIndex++}`);
    values.push(input.capacity);
  }
  if (input.thumbnailUrl !== undefined) {
    updates.push(`thumbnail_url = $${paramIndex++}`);
    values.push(input.thumbnailUrl);
  }
  if (input.modelRef !== undefined) {
    updates.push(`model_ref = $${paramIndex++}`);
    values.push(input.modelRef);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }

  if (updates.length === 0) {
    return getVenueTemplate(venueId);
  }

  values.push(venueId);

  const row = await queryOne<DbVenueTemplate>(
    `UPDATE venue_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return row ? transformVenueTemplate(row) : null;
}

// Delete venue template (soft delete)
export async function deleteVenueTemplate(venueId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `UPDATE venue_templates SET is_active = false WHERE id = $1 RETURNING id`,
    [venueId]
  );
  return result !== null;
}

// ============ VENUE AVAILABILITY ============

// Check if a venue is available on a specific date
export async function checkVenueAvailability(
  venueTemplateId: string,
  date: string
): Promise<{ available: boolean; bookedBy?: string }> {
  const row = await queryOne<{ event_id: string }>(
    `SELECT event_id FROM venue_bookings 
     WHERE venue_template_id = $1 AND booking_date = $2`,
    [venueTemplateId, date]
  );

  if (row) {
    return { available: false, bookedBy: row.event_id };
  }

  return { available: true };
}

// Get availability for a venue across a date range
export async function getVenueAvailabilityRange(
  venueTemplateId: string,
  startDate: string,
  endDate: string
): Promise<VenueAvailability[]> {
  // Get venue name
  const venue = await getVenueTemplate(venueTemplateId);
  if (!venue) return [];

  // Get all bookings in range
  const bookings = await queryAll<{ booking_date: Date; event_id: string }>(
    `SELECT booking_date, event_id FROM venue_bookings 
     WHERE venue_template_id = $1 AND booking_date BETWEEN $2 AND $3`,
    [venueTemplateId, startDate, endDate]
  );

  const bookedDates = new Map<string, string>();
  bookings.forEach((b) => {
    bookedDates.set(b.booking_date.toISOString().split('T')[0], b.event_id);
  });

  // Generate availability for each date in range
  const availability: VenueAvailability[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const bookedBy = bookedDates.get(dateStr);

    availability.push({
      venueTemplateId,
      venueName: venue.name,
      date: dateStr,
      isAvailable: !bookedBy,
      bookedBy,
    });

    current.setDate(current.getDate() + 1);
  }

  return availability;
}

// Get all booked dates for a venue
export async function getVenueBookedDates(venueTemplateId: string): Promise<string[]> {
  const rows = await queryAll<{ booking_date: Date }>(
    `SELECT booking_date FROM venue_bookings 
     WHERE venue_template_id = $1 AND booking_date >= CURRENT_DATE
     ORDER BY booking_date`,
    [venueTemplateId]
  );

  return rows.map((r) => r.booking_date.toISOString().split('T')[0]);
}

// ============ VENUE BOOKINGS ============

// Get booking for an event
export async function getEventBooking(eventId: string): Promise<VenueBookingWithDetails | null> {
  const row = await queryOne<any>(
    `SELECT 
        vb.id,
        vb.status,
        COALESCE(vb.booking_date, e.event_date) as booking_date,
        COALESCE(vb.venue_template_id, e.venue_template_id) as venue_template_id,
        vt.name as venue_name,
        vt.category as venue_category,
        vt.capacity as venue_capacity,
        vt.location as location,
        vt.thumbnail_url as thumbnail_url
     FROM events e
     LEFT JOIN venue_bookings vb ON vb.event_id = e.id
     LEFT JOIN venue_templates vt 
       ON vt.id = COALESCE(vb.venue_template_id, e.venue_template_id)
     WHERE e.id = $1
     LIMIT 1`,
    [eventId]
  );

  if (!row?.venue_template_id) return null;

  const fallbackId = row.id || `fallback-${eventId}`;
  const status = (row.status as BookingStatus | null) ?? 'confirmed';

  return {
    id: String(fallbackId),
    eventId,
    venueTemplateId: String(row.venue_template_id),
    bookingDate: row.booking_date ? new Date(row.booking_date).toISOString().split('T')[0] : '',
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    venueName: row.venue_name ?? 'Venue booked',
    venueCategory: row.venue_category ?? 'other',
    venueCapacity: Number(row.venue_capacity ?? 0) || 0,
    thumbnailUrl: row.thumbnail_url ?? null,
    location: row.location ?? null,
  };
}

// Get all bookings for a venue
export async function getVenueBookings(venueTemplateId: string): Promise<VenueBooking[]> {
  const rows = await queryAll<DbVenueBooking>(
    `SELECT * FROM venue_bookings WHERE venue_template_id = $1 ORDER BY booking_date`,
    [venueTemplateId]
  );

  return rows.map(transformVenueBooking);
}

// Book a venue - uses transaction for atomic conflict check
export async function bookVenue(
  eventId: string,
  input: BookVenueInput
): Promise<{ success: boolean; booking?: VenueBookingWithDetails; error?: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if venue exists and is active
    const venueResult = await client.query<DbVenueTemplate>(
      `SELECT * FROM venue_templates WHERE id = $1 AND is_active = true`,
      [input.venueTemplateId]
    );

    if (venueResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Venue not found or inactive' };
    }

    const venue = venueResult.rows[0];

    // Lock and check for existing booking on this date (prevents race condition)
    const conflictResult = await client.query<{ event_id: string }>(
      `SELECT event_id FROM venue_bookings 
       WHERE venue_template_id = $1 AND booking_date = $2
       FOR UPDATE`,
      [input.venueTemplateId, input.bookingDate]
    );

    if (conflictResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Venue "${venue.name}" is already booked on ${input.bookingDate}`,
      };
    }

    // Check if event already has a booking (and remove it if so)
    await client.query(
      `DELETE FROM venue_bookings WHERE event_id = $1`,
      [eventId]
    );

    // Create the new booking
    const bookingResult = await client.query<DbVenueBooking>(
      `INSERT INTO venue_bookings (event_id, venue_template_id, booking_date, status)
       VALUES ($1, $2, $3, 'provisional')
       RETURNING *`,
      [eventId, input.venueTemplateId, input.bookingDate]
    );

    // Update event's venue_template_id reference
    await client.query(
      `UPDATE events SET venue_template_id = $1 WHERE id = $2`,
      [input.venueTemplateId, eventId]
    );

    await client.query('COMMIT');

    const booking = bookingResult.rows[0];

    return {
      success: true,
      booking: {
        id: booking.id,
        eventId: booking.event_id,
        venueTemplateId: booking.venue_template_id,
        bookingDate: booking.booking_date.toISOString().split('T')[0],
        status: booking.status as BookingStatus,
        createdAt: booking.created_at.toISOString(),
        updatedAt: booking.updated_at.toISOString(),
        venueName: venue.name,
        venueCategory: venue.category,
        venueCapacity: venue.capacity,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Confirm a provisional booking
export async function confirmBooking(
  eventId: string
): Promise<{ success: boolean; booking?: VenueBooking; error?: string }> {
  const row = await queryOne<DbVenueBooking>(
    `UPDATE venue_bookings SET status = 'confirmed' 
     WHERE event_id = $1 AND status = 'provisional'
     RETURNING *`,
    [eventId]
  );

  if (!row) {
    return { success: false, error: 'No provisional booking found for this event' };
  }

  return { success: true, booking: transformVenueBooking(row) };
}

// Cancel a booking
export async function cancelBooking(eventId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `DELETE FROM venue_bookings WHERE event_id = $1 RETURNING id`,
    [eventId]
  );

  if (result) {
    // Clear venue reference from event
    await queryOne(
      `UPDATE events SET venue_template_id = NULL WHERE id = $1`,
      [eventId]
    );
  }

  return result !== null;
}

// Change booking date (with conflict check)
export async function changeBookingDate(
  eventId: string,
  newDate: string
): Promise<{ success: boolean; booking?: VenueBookingWithDetails; error?: string }> {
  // Get current booking
  const currentBooking = await getEventBooking(eventId);
  if (!currentBooking) {
    return { success: false, error: 'No booking found for this event' };
  }

  // Book with new date (handles conflict check and transaction)
  return bookVenue(eventId, {
    venueTemplateId: currentBooking.venueTemplateId,
    bookingDate: newDate,
  });
}
