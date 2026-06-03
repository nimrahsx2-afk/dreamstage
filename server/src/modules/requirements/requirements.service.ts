import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../../db/client';
import { env } from '../../config/env';
import { NotFoundError } from '../../middleware/errorHandler';

export interface RequirementsMeta {
  eventId: string;
  eventName: string;
  plannerName: string;
  isSubmitted: boolean;
}

export interface RequirementsRow {
  id: string;
  eventId: string | null;
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
  isSubmitted: boolean;
  submittedAt: string | null;
  createdAt: string;
}

export interface RequirementsSubmitInput {
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
}

function buildPublicBaseUrl(): string {
  // Use CORS origin as the best proxy for frontend base URL in dev.
  // In production you should set CORS_ORIGIN to your deployed frontend origin.
  return env.CORS_ORIGIN?.replace(/\/$/, '') || '';
}

function transformRow(row: any): RequirementsRow {
  return {
    id: row.id,
    eventId: row.event_id,
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
    isSubmitted: row.is_submitted,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function generateLink(eventId: string): Promise<{ token: string; url: string }> {
  const token = uuidv4();
  const baseUrl = buildPublicBaseUrl();
  const url = `${baseUrl}/requirements/${token}`;

  await query(
    `INSERT INTO client_requirements (event_id, share_token)
     VALUES ($1, $2)
     ON CONFLICT (share_token) DO NOTHING`,
    [eventId, token]
  );

  return { token, url };
}

export async function getByToken(token: string): Promise<{ meta: RequirementsMeta; existing: RequirementsRow | null }> {
  const row = await queryOne(
    `SELECT
      cr.*,
      e.name as event_name,
      u.name as planner_name
     FROM client_requirements cr
     JOIN events e ON e.id = cr.event_id
     JOIN users u ON u.id = e.planner_id
     WHERE cr.share_token = $1`,
    [token]
  );

  if (!row) {
    throw new NotFoundError('Requirements link not found');
  }

  const meta: RequirementsMeta = {
    eventId: row.event_id,
    eventName: row.event_name,
    plannerName: row.planner_name,
    isSubmitted: row.is_submitted === true,
  };

  return { meta, existing: transformRow(row) };
}

export async function submitForm(token: string, data: RequirementsSubmitInput): Promise<void> {
  const updated = await queryOne(
    `UPDATE client_requirements
     SET
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
      is_submitted = true,
      submitted_at = NOW()
     WHERE share_token = $16
     RETURNING id`,
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
      token,
    ]
  );

  if (!updated) {
    throw new NotFoundError('Requirements link not found');
  }
}

export async function getForEvent(eventId: string): Promise<RequirementsRow | null> {
  const row = await queryOne(
    `SELECT * FROM client_requirements
     WHERE event_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [eventId]
  );

  return row ? transformRow(row) : null;
}

