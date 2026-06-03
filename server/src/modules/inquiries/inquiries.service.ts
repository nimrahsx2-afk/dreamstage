import { v4 as uuidv4 } from 'uuid';
import { query, queryAll, queryOne } from '../../db/client';
import { env } from '../../config/env';
import { ConflictError, NotFoundError } from '../../middleware/errorHandler';
import * as eventsService from '../events/events.service';

export interface InquiryMeta {
  plannerName: string;
  isSubmitted: boolean;
}

export interface InquiryRow {
  id: string;
  plannerId: string;
  shareToken: string;
  clientName: string | null;
  clientEmail: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  venueType: string | null;
  hallPreference: string | null;
  seatingStyle: string | null;
  seatingNotes: string | null;
  mealPreference: string | null;
  lightingPreference: string | null;
  decorationPreference: string | null;
  addons: string[] | null;
  budgetRange: string | null;
  specialRequests: string | null;
  inspirationImages: string[] | null;
  selectedVenueId?: string | null;
  selectedVenueName?: string | null;
  venueHoldExpiresAt?: string | null;
  convertedEventId?: string | null;
  convertedEventName?: string | null;
  convertedAt?: string | null;
  isSubmitted: boolean;
  submittedAt: string | null;
  createdAt: string;
}

export interface InquirySubmitInput {
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  venueType: string;
  hallPreference: string;
  seatingStyle: string;
  seatingNotes: string;
  mealPreference: string;
  addons: string[];
  budgetRange: string;
  lightingPreference: string;
  decorationPreference: string;
  specialRequests: string;
  inspirationImages: string[];
}

/** Full payload for planner PUT (replaces editable fields; keeps share_token, status, dates except submitted) */
export interface InquiryPlannerUpdatePayload {
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  venueType: string;
  hallPreference: string;
  seatingStyle: string;
  seatingNotes: string;
  mealPreference: string;
  addons: string[];
  budgetRange: string;
  lightingPreference: string;
  decorationPreference: string;
  specialRequests: string;
  inspirationImages: string[];
}

function buildPublicBaseUrl(): string {
  return env.CORS_ORIGIN?.replace(/\/$/, '') || '';
}

function transformRow(row: any): InquiryRow {
  return {
    id: row.id,
    plannerId: row.planner_id,
    shareToken: row.share_token,
    clientName: row.client_name,
    clientEmail: row.client_email,
    eventType: row.event_type,
    eventDate: row.event_date ? new Date(row.event_date).toISOString().split('T')[0] : null,
    guestCount: row.guest_count,
    venueType: row.venue_type,
    hallPreference: row.hall_preference,
    seatingStyle: row.seating_style,
    seatingNotes: row.seating_notes,
    mealPreference: row.meal_preference,
    lightingPreference: row.lighting_preference,
    decorationPreference: row.decoration_preference,
    addons: row.addons ?? null,
    budgetRange: row.budget_range,
    specialRequests: row.special_requests,
    inspirationImages: row.inspiration_images ?? null,
    selectedVenueId: row.selected_venue_id ?? null,
    selectedVenueName: row.selected_venue_name ?? null,
    venueHoldExpiresAt: row.venue_hold_expires_at ? new Date(row.venue_hold_expires_at).toISOString() : null,
    convertedEventId: row.converted_event_id ?? null,
    convertedEventName: row.converted_event_name ?? null,
    convertedAt: row.converted_at ? new Date(row.converted_at).toISOString() : null,
    isSubmitted: row.is_submitted === true,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function generateLink(plannerId: string): Promise<{ token: string; url: string }> {
  const token = uuidv4();
  const baseUrl = buildPublicBaseUrl();
  const url = `${baseUrl}/inquiry/${token}`;

  await query(
    `INSERT INTO inquiries (planner_id, share_token)
     VALUES ($1, $2)`,
    [plannerId, token]
  );

  return { token, url };
}

export async function listForPlanner(plannerId: string): Promise<InquiryRow[]> {
  const rows = await queryAll(
    `SELECT
        i.*,
        svt.name AS selected_venue_name,
        e.name AS converted_event_name
     FROM inquiries i
     LEFT JOIN venue_templates svt ON svt.id = i.selected_venue_id
     LEFT JOIN events e ON e.id = i.converted_event_id
     WHERE i.planner_id = $1
     ORDER BY i.created_at DESC`,
    [plannerId]
  );
  return rows.map(transformRow);
}

export async function getByToken(token: string): Promise<{ meta: InquiryMeta }> {
  const row = await queryOne(
    `SELECT i.is_submitted, u.name AS planner_name
     FROM inquiries i
     JOIN users u ON u.id = i.planner_id
     WHERE i.share_token = $1`,
    [token]
  );

  if (!row) {
    throw new NotFoundError('Inquiry link not found');
  }

  return {
    meta: {
      plannerName: row.planner_name,
      isSubmitted: row.is_submitted === true,
    },
  };
}

export async function submitForm(token: string, data: InquirySubmitInput): Promise<void> {
  const existing = await queryOne(
    `SELECT id, is_submitted FROM inquiries WHERE share_token = $1`,
    [token]
  );

  if (!existing) {
    throw new NotFoundError('Inquiry link not found');
  }
  if (existing.is_submitted === true) {
    throw new ConflictError('This form has already been submitted');
  }

  await query(
    `UPDATE inquiries SET
      client_name = $1,
      client_email = $2,
      event_type = $3,
      event_date = $4,
      guest_count = $5,
      venue_type = $6,
      hall_preference = $7,
      seating_style = $8,
      seating_notes = $9,
      meal_preference = $10,
      addons = $11,
      budget_range = $12,
      lighting_preference = $13,
      decoration_preference = $14,
      special_requests = $15,
      inspiration_images = $16,
      is_submitted = true,
      submitted_at = NOW()
     WHERE share_token = $17`,
    [
      data.clientName || null,
      data.clientEmail || null,
      data.eventType || null,
      data.eventDate || null,
      Number.isFinite(data.guestCount) ? data.guestCount : null,
      data.venueType || null,
      data.hallPreference || null,
      data.seatingStyle || null,
      data.seatingNotes || null,
      data.mealPreference || null,
      data.addons && data.addons.length ? data.addons : null,
      data.budgetRange || null,
      data.lightingPreference || null,
      data.decorationPreference || null,
      data.specialRequests || null,
      data.inspirationImages && data.inspirationImages.length ? data.inspirationImages : null,
      token,
    ]
  );
}

export async function updateInquiry(
  inquiryId: string,
  plannerId: string,
  data: InquiryPlannerUpdatePayload
): Promise<InquiryRow> {
  const existing = await queryOne(
    `SELECT id FROM inquiries WHERE id = $1 AND planner_id = $2`,
    [inquiryId, plannerId]
  );
  if (!existing) {
    throw new NotFoundError('Inquiry not found');
  }

  const row = await queryOne(
    `UPDATE inquiries SET
      client_name = $1,
      client_email = $2,
      event_type = $3,
      event_date = $4,
      guest_count = $5,
      venue_type = $6,
      hall_preference = $7,
      seating_style = $8,
      seating_notes = $9,
      meal_preference = $10,
      addons = $11,
      budget_range = $12,
      lighting_preference = $13,
      decoration_preference = $14,
      special_requests = $15,
      inspiration_images = $16
     WHERE id = $17 AND planner_id = $18
     RETURNING *`,
    [
      data.clientName || null,
      data.clientEmail || null,
      data.eventType || null,
      data.eventDate || null,
      Number.isFinite(data.guestCount) ? data.guestCount : null,
      data.venueType || null,
      data.hallPreference || null,
      data.seatingStyle || null,
      data.seatingNotes || null,
      data.mealPreference || null,
      data.addons && data.addons.length ? data.addons : null,
      data.budgetRange || null,
      data.lightingPreference || null,
      data.decorationPreference || null,
      data.specialRequests || null,
      data.inspirationImages && data.inspirationImages.length ? data.inspirationImages : null,
      inquiryId,
      plannerId,
    ]
  );

  return transformRow(row!);
}

export async function deleteInquiry(inquiryId: string, plannerId: string): Promise<void> {
  const row = await queryOne<{ converted_event_id: string | null }>(
    `SELECT converted_event_id FROM inquiries WHERE id = $1 AND planner_id = $2`,
    [inquiryId, plannerId]
  );
  if (!row) {
    throw new NotFoundError('Inquiry not found');
  }

  if (row.converted_event_id) {
    const owns = await queryOne<{ id: string }>(
      `SELECT id FROM events WHERE id = $1 AND planner_id = $2`,
      [row.converted_event_id, plannerId]
    );
    if (owns) {
      await eventsService.deleteEvent(row.converted_event_id);
      return;
    }
  }

  const result = await queryOne(
    `DELETE FROM inquiries WHERE id = $1 AND planner_id = $2 RETURNING id`,
    [inquiryId, plannerId]
  );
  if (!result) {
    throw new NotFoundError('Inquiry not found');
  }
}
