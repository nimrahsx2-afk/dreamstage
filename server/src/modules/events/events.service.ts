// Events Service - CRUD operations for planner events

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import type { Event, EventInput, EventUpdate, DbEvent } from './events.types';

// Transform database row to Event
function transformEvent(row: DbEvent): Event {
  return {
    id: row.id,
    plannerId: row.planner_id,
    venueTemplateId: row.venue_template_id,
    name: row.name,
    eventType: row.event_type,
    eventDate: row.event_date.toISOString().split('T')[0],
    status: row.status,
    shareToken: row.share_token,
    budgetCeiling: row.budget_ceiling ? parseFloat(row.budget_ceiling) : null,
    showBudgetDetails: row.show_budget_details,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// Get all events for a planner
export async function getPlannerEvents(plannerId: string): Promise<Event[]> {
  const rows = await queryAll<DbEvent>(
    `SELECT * FROM events WHERE planner_id = $1 ORDER BY event_date ASC`,
    [plannerId]
  );
  return rows.map(transformEvent);
}

// Get a single event by ID
export async function getEvent(eventId: string): Promise<Event | null> {
  const row = await queryOne<DbEvent>(
    `SELECT e.* FROM events e WHERE e.id = $1`,
    [eventId]
  );
  return row ? transformEvent(row) : null;
}

// Create a new event
export async function createEvent(
  plannerId: string,
  input: EventInput
): Promise<Event> {
  const id = uuidv4();

  const row = await queryOne<DbEvent>(
    `INSERT INTO events (id, planner_id, name, event_type, event_date, venue_template_id, budget_ceiling, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      plannerId,
      input.name,
      input.eventType,
      input.eventDate,
      input.venueTemplateId || null,
      input.budgetCeiling || null,
      input.notes || null,
    ]
  );

  return transformEvent(row!);
}

// Update an event
export async function updateEvent(
  eventId: string,
  input: EventUpdate
): Promise<Event | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.eventType !== undefined) {
    updates.push(`event_type = $${paramIndex++}`);
    values.push(input.eventType);
  }
  if (input.eventDate !== undefined) {
    updates.push(`event_date = $${paramIndex++}`);
    values.push(input.eventDate);
  }
  if (input.venueTemplateId !== undefined) {
    updates.push(`venue_template_id = $${paramIndex++}`);
    values.push(input.venueTemplateId);
  }
  if (input.budgetCeiling !== undefined) {
    updates.push(`budget_ceiling = $${paramIndex++}`);
    values.push(input.budgetCeiling);
  }
  if (input.showBudgetDetails !== undefined) {
    updates.push(`show_budget_details = $${paramIndex++}`);
    values.push(input.showBudgetDetails);
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }

  if (updates.length === 0) {
    return getEvent(eventId);
  }

  values.push(eventId);

  const row = await queryOne<DbEvent>(
    `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return row ? transformEvent(row) : null;
}

// Delete an event
export async function deleteEvent(eventId: string): Promise<boolean> {
  await query(`DELETE FROM scene_layouts WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM budget_items WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM vendors WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM venue_bookings WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM client_comments WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM checklist_items WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM milestones WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM timeline_entries WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM approvals WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM stock_reservations WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM inquiries WHERE converted_event_id = $1`, [eventId]);
  const result = await query(`DELETE FROM events WHERE id = $1`, [eventId]);
  return (result.rowCount ?? 0) > 0;
}

// Update share settings (password, show budget details)
export async function updateShareSettings(
  eventId: string,
  sharePassword: string | null,
  showBudgetDetails?: boolean
): Promise<Event | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (sharePassword !== undefined) {
    if (sharePassword === null || sharePassword === '') {
      updates.push(`share_password_hash = NULL`);
    } else {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash(sharePassword, 12);
      updates.push(`share_password_hash = $${paramIndex++}`);
      values.push(hash);
    }
  }
  if (showBudgetDetails !== undefined) {
    updates.push(`show_budget_details = $${paramIndex++}`);
    values.push(showBudgetDetails);
  }

  if (updates.length === 0) {
    return getEvent(eventId);
  }

  values.push(eventId);
  const row = await queryOne<DbEvent>(
    `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return row ? transformEvent(row) : null;
}

// Verify event belongs to planner
export async function verifyEventOwnership(
  eventId: string,
  plannerId: string
): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `SELECT id FROM events WHERE id = $1 AND planner_id = $2`,
    [eventId, plannerId]
  );
  return result !== null;
}
