import { Request, Response } from 'express';
import { query, queryAll, queryOne } from '../../db/client';
import crypto from 'crypto';

// Planner shortlists 1-3 venues
export async function shortlistVenues(req: Request, res: Response): Promise<void> {
  try {
    const { inquiryId } = req.params;
    const { venueIds } = req.body as { venueIds: string[] };

    if (!venueIds || venueIds.length === 0 || venueIds.length > 3) {
      res.status(400).json({
        success: false,
        error: 'Select 1-3 venues to shortlist',
      });
      return;
    }

    const plannerId = (req as any).user?.id as string | undefined;
    if (!plannerId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');

    await query(
      `UPDATE inquiries
       SET shortlisted_venue_ids = $1,
           venue_selection_token = $2
       WHERE id = $3
         AND planner_id = $4`,
      [venueIds, token, inquiryId, plannerId]
    );

    const selectionUrl = `${
      process.env.CLIENT_URL || 'http://localhost:5173'
    }/select-venue/${token}`;

    res.json({
      success: true,
      data: {
        token,
        selectionUrl,
        venueCount: venueIds.length,
      },
    });
  } catch (err) {
    console.error('Shortlist venues error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to shortlist venues',
    });
  }
}

// Client views venue options (public)
export async function getVenueSelection(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const inquiry = await queryOne<{
      id: string;
      client_name: string | null;
      event_type: string | null;
      event_date: string | null;
      guest_count: number | null;
      budget_range: string | null;
      shortlisted_venue_ids: string[] | null;
      selected_venue_id: string | null;
      venue_hold_expires_at: string | null;
    }>(
      `SELECT id, client_name, event_type,
              event_date, guest_count, budget_range,
              shortlisted_venue_ids, selected_venue_id,
              venue_hold_expires_at
       FROM inquiries
       WHERE venue_selection_token = $1`,
      [token]
    );

    if (!inquiry) {
      res.status(404).json({
        success: false,
        error: 'Invalid or expired link',
      });
      return;
    }

    const venueIds = inquiry.shortlisted_venue_ids ?? [];
    const venues =
      venueIds.length === 0
        ? []
        : await queryAll<{
            id: string;
            name: string;
            category: string;
            capacity: number;
            price_per_head: string | null;
            description: string | null;
            location: string | null;
            thumbnail_url: string | null;
            video_url: string | null;
            gallery_images: any;
          }>(
            `SELECT id, name, category, capacity,
                    price_per_head, description, location,
                    thumbnail_url, video_url, gallery_images
             FROM venue_templates
             WHERE id = ANY($1)`,
            [venueIds]
          );

    res.json({
      success: true,
      data: {
        inquiry: {
          clientName: inquiry.client_name,
          eventType: inquiry.event_type,
          eventDate: inquiry.event_date,
          guestCount: inquiry.guest_count,
          budgetRange: inquiry.budget_range,
        },
        venues: venues.map((v) => ({
          ...v,
          price_per_head: v.price_per_head ? Number(v.price_per_head) : null,
        })),
        selectedVenueId: inquiry.selected_venue_id,
        holdExpiresAt: inquiry.venue_hold_expires_at,
        alreadySelected: !!inquiry.selected_venue_id,
      },
    });
  } catch (err) {
    console.error('Get venue selection error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load venue options',
    });
  }
}

// Client selects a venue (public)
export async function selectVenue(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const { venueId } = req.body as { venueId: string };

    const inquiry = await queryOne<{
      id: string;
      planner_id: string;
      event_date: string | null;
      shortlisted_venue_ids: string[] | null;
      selected_venue_id: string | null;
      guest_count: number | null;
      converted_event_id: string | null;
    }>(
      `SELECT id, planner_id, event_date, 
       shortlisted_venue_ids, selected_venue_id, 
       guest_count, converted_event_id
       FROM inquiries
       WHERE venue_selection_token = $1`,
      [token]
    );

    if (!inquiry) {
      res.status(404).json({
        success: false,
        error: 'Invalid link',
      });
      return;
    }

    if (inquiry.selected_venue_id) {
      res.status(400).json({
        success: false,
        error: 'You have already selected a venue',
      });
      return;
    }

    const allowed = (inquiry.shortlisted_venue_ids ?? []).includes(venueId);
    if (!allowed) {
      res.status(400).json({
        success: false,
        error: 'Venue is not in the shortlisted options',
      });
      return;
    }

    const holdExpires = new Date();
    holdExpires.setHours(holdExpires.getHours() + 24);

    await query(
      `UPDATE inquiries
       SET selected_venue_id = $1,
           venue_selected_at = NOW(),
           venue_hold_expires_at = $2
       WHERE venue_selection_token = $3`,
      [venueId, holdExpires, token]
    );

    // Auto-book the venue if an event already exists for this inquiry
    const linkedEvent = inquiry.converted_event_id
      ? { id: inquiry.converted_event_id }
      : null;

    let autoBooked = false;
    if (linkedEvent) {
      // If inquiry has no date we cannot book into venue_bookings (booking_date is NOT NULL)
      if (!inquiry.event_date) {
        res.status(400).json({
          success: false,
          error: 'Cannot book venue: inquiry is missing an event date',
        });
        return;
      }

      const existingBooking = await queryOne<{ id: string }>(
        `SELECT id FROM venue_bookings
         WHERE event_id = $1`,
        [linkedEvent.id]
      );

      if (existingBooking) {
        await query(
          `UPDATE venue_bookings
           SET venue_template_id = $1,
               status = 'confirmed',
               booking_date = $2,
               updated_at = NOW()
           WHERE event_id = $3`,
          [venueId, inquiry.event_date, linkedEvent.id]
        );
      } else {
        await query(
          `INSERT INTO venue_bookings (
            event_id,
            venue_template_id,
            booking_date,
            status,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3,
            'confirmed',
            NOW(),
            NOW()
          )`,
          [linkedEvent.id, venueId, inquiry.event_date]
        );
      }

      await query(
        `UPDATE events
         SET venue_template_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [venueId, linkedEvent.id]
      );

      autoBooked = true;
    }

    res.json({
      success: true,
      data: {
        message: autoBooked ? 'Venue booked successfully!' : 'Venue selected successfully',
        autoBooked,
        holdExpiresAt: holdExpires.toISOString(),
      },
    });
  } catch (err) {
    console.error('Select venue error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to book venue',
    });
  }
}

