// Checklist Service - ChecklistItem, Milestone, TimelineEntry

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import { generateChecklistItems } from '../../config/checklistRules';
import * as eventsService from '../events/events.service';
import type { ChecklistItem, Milestone, TimelineEntry } from './checklist.types';

// ---------- Checklist Items ----------

export async function getChecklistItems(eventId: string): Promise<ChecklistItem[]> {
  await upsertSystemChecklistItems(eventId);

  const rows = await queryAll<{
    id: string;
    event_id: string;
    title: string;
    description: string | null;
    due_date: Date | null;
    is_complete: boolean;
    is_system_generated: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, event_id, title, description, due_date, is_complete, is_system_generated, completed_at, created_at, updated_at
     FROM checklist_items WHERE event_id = $1 ORDER BY due_date ASC NULLS LAST, created_at ASC`,
    [eventId]
  );

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    title: r.title,
    description: r.description,
    dueDate: r.due_date ? r.due_date.toISOString().split('T')[0] : null,
    isComplete: r.is_complete,
    isSystemGenerated: r.is_system_generated,
    completedAt: r.completed_at ? r.completed_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }));
}

async function upsertSystemChecklistItems(eventId: string): Promise<void> {
  const event = await eventsService.getEvent(eventId);
  if (!event) return;

  const eventDate = new Date(event.eventDate + 'T12:00:00Z');
  const systemItems = generateChecklistItems(eventDate);

  for (const item of systemItems) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM checklist_items
       WHERE event_id = $1 AND is_system_generated = true AND title = $2`,
      [eventId, item.title]
    );

    if (!existing) {
      await query(
        `INSERT INTO checklist_items (id, event_id, title, description, due_date, is_system_generated)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [uuidv4(), eventId, item.title, item.description || null, item.dueDate]
      );
    }
  }
}

export async function toggleChecklistItem(
  eventId: string,
  itemId: string,
  isComplete: boolean
): Promise<ChecklistItem | null> {
  const item = await queryOne<{ event_id: string }>(
    `SELECT event_id FROM checklist_items WHERE id = $1 AND event_id = $2`,
    [itemId, eventId]
  );
  if (!item) return null;

  await query(
    `UPDATE checklist_items
     SET is_complete = $1, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END, updated_at = NOW()
     WHERE id = $2 AND event_id = $3`,
    [isComplete, itemId, eventId]
  );

  const updated = await queryOne<{
    id: string;
    event_id: string;
    title: string;
    description: string | null;
    due_date: Date | null;
    is_complete: boolean;
    is_system_generated: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, event_id, title, description, due_date, is_complete, is_system_generated, completed_at, created_at, updated_at
     FROM checklist_items WHERE id = $1`,
    [itemId]
  );

  if (!updated) return null;

  return {
    id: updated.id,
    eventId: updated.event_id,
    title: updated.title,
    description: updated.description,
    dueDate: updated.due_date ? updated.due_date.toISOString().split('T')[0] : null,
    isComplete: updated.is_complete,
    isSystemGenerated: updated.is_system_generated,
    completedAt: updated.completed_at ? updated.completed_at.toISOString() : null,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
  };
}

export async function addManualChecklistItem(
  eventId: string,
  title: string,
  dueDate?: string | null
): Promise<ChecklistItem> {
  const id = uuidv4();
  await query(
    `INSERT INTO checklist_items (id, event_id, title, due_date, is_system_generated)
     VALUES ($1, $2, $3, $4, false)`,
    [id, eventId, title, dueDate || null]
  );

  const row = await queryOne<{
    id: string;
    event_id: string;
    title: string;
    description: string | null;
    due_date: Date | null;
    is_complete: boolean;
    is_system_generated: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(`SELECT * FROM checklist_items WHERE id = $1`, [id]);

  return {
    id: row!.id,
    eventId: row!.event_id,
    title: row!.title,
    description: row!.description,
    dueDate: row!.due_date ? row!.due_date.toISOString().split('T')[0] : null,
    isComplete: row!.is_complete,
    isSystemGenerated: row!.is_system_generated,
    completedAt: row!.completed_at ? row!.completed_at.toISOString() : null,
    createdAt: row!.created_at.toISOString(),
    updatedAt: row!.updated_at.toISOString(),
  };
}

export async function deleteChecklistItem(
  eventId: string,
  itemId: string
): Promise<boolean> {
  const item = await queryOne<{ is_system_generated: boolean }>(
    `SELECT is_system_generated FROM checklist_items WHERE id = $1 AND event_id = $2`,
    [itemId, eventId]
  );
  if (!item || item.is_system_generated) return false;

  const result = await query(
    `DELETE FROM checklist_items WHERE id = $1 AND event_id = $2`,
    [itemId, eventId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------- Milestones ----------

export async function getMilestones(eventId: string): Promise<Milestone[]> {
  const rows = await queryAll<{
    id: string;
    event_id: string;
    title: string;
    target_date: Date;
    is_complete: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, event_id, title, target_date, is_complete, completed_at, created_at, updated_at
     FROM milestones WHERE event_id = $1 ORDER BY target_date ASC`,
    [eventId]
  );

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    title: r.title,
    targetDate: r.target_date.toISOString().split('T')[0],
    isComplete: r.is_complete,
    completedAt: r.completed_at ? r.completed_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }));
}

export async function createMilestone(
  eventId: string,
  title: string,
  targetDate: string
): Promise<Milestone> {
  const id = uuidv4();
  await query(
    `INSERT INTO milestones (id, event_id, title, target_date) VALUES ($1, $2, $3, $4)`,
    [id, eventId, title, targetDate]
  );

  const row = await queryOne<{
    id: string;
    event_id: string;
    title: string;
    target_date: Date;
    is_complete: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(`SELECT * FROM milestones WHERE id = $1`, [id]);

  return {
    id: row!.id,
    eventId: row!.event_id,
    title: row!.title,
    targetDate: row!.target_date.toISOString().split('T')[0],
    isComplete: row!.is_complete,
    completedAt: row!.completed_at ? row!.completed_at.toISOString() : null,
    createdAt: row!.created_at.toISOString(),
    updatedAt: row!.updated_at.toISOString(),
  };
}

export async function updateMilestone(
  eventId: string,
  milestoneId: string,
  updates: { title?: string; targetDate?: string; isComplete?: boolean }
): Promise<Milestone | null> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (updates.title !== undefined) {
    updatesList.push(`title = $${i++}`);
    values.push(updates.title);
  }
  if (updates.targetDate !== undefined) {
    updatesList.push(`target_date = $${i++}`);
    values.push(updates.targetDate);
  }
  if (updates.isComplete !== undefined) {
    const idx = i++;
    updatesList.push(`is_complete = $${idx}`);
    updatesList.push(`completed_at = CASE WHEN $${idx} THEN NOW() ELSE NULL END`);
    values.push(updates.isComplete);
  }

  if (updatesList.length === 0) {
    return getMilestones(eventId).then((m) => m.find((x) => x.id === milestoneId) ?? null);
  }

  updatesList.push('updated_at = NOW()');
  values.push(milestoneId, eventId);

  await query(
    `UPDATE milestones SET ${updatesList.join(', ')} WHERE id = $${i} AND event_id = $${i + 1}`,
    values
  );

  const row = await queryOne<{
    id: string;
    event_id: string;
    title: string;
    target_date: Date;
    is_complete: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(`SELECT * FROM milestones WHERE id = $1 AND event_id = $2`, [milestoneId, eventId]);

  if (!row) return null;

  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    targetDate: row.target_date.toISOString().split('T')[0],
    isComplete: row.is_complete,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function deleteMilestone(
  eventId: string,
  milestoneId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM milestones WHERE id = $1 AND event_id = $2`,
    [milestoneId, eventId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------- Timeline Entries ----------

export async function getTimelineEntries(eventId: string): Promise<TimelineEntry[]> {
  const rows = await queryAll<{
    id: string;
    event_id: string;
    time_slot: string;
    title: string;
    description: string | null;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, event_id, time_slot, title, description, sort_order, created_at, updated_at
     FROM timeline_entries WHERE event_id = $1 ORDER BY sort_order ASC, time_slot ASC`,
    [eventId]
  );

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    timeSlot: r.time_slot,
    title: r.title,
    description: r.description,
    sortOrder: r.sort_order,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }));
}

export async function createTimelineEntry(
  eventId: string,
  timeSlot: string,
  title: string,
  description?: string | null,
  sortOrder?: number
): Promise<TimelineEntry> {
  const id = uuidv4();
  const order =
    sortOrder ??
    (await queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM timeline_entries WHERE event_id = $1`,
      [eventId]
    ))?.max ?? 0;

  await query(
    `INSERT INTO timeline_entries (id, event_id, time_slot, title, description, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, eventId, timeSlot, title, description ?? null, order]
  );

  const row = await queryOne<{
    id: string;
    event_id: string;
    time_slot: string;
    title: string;
    description: string | null;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  }>(`SELECT * FROM timeline_entries WHERE id = $1`, [id]);

  return {
    id: row!.id,
    eventId: row!.event_id,
    timeSlot: row!.time_slot,
    title: row!.title,
    description: row!.description,
    sortOrder: row!.sort_order,
    createdAt: row!.created_at.toISOString(),
    updatedAt: row!.updated_at.toISOString(),
  };
}

export async function updateTimelineEntry(
  eventId: string,
  entryId: string,
  updates: { timeSlot?: string; title?: string; description?: string | null; sortOrder?: number }
): Promise<TimelineEntry | null> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (updates.timeSlot !== undefined) {
    updatesList.push(`time_slot = $${i++}`);
    values.push(updates.timeSlot);
  }
  if (updates.title !== undefined) {
    updatesList.push(`title = $${i++}`);
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    updatesList.push(`description = $${i++}`);
    values.push(updates.description);
  }
  if (updates.sortOrder !== undefined) {
    updatesList.push(`sort_order = $${i++}`);
    values.push(updates.sortOrder);
  }

  if (updatesList.length === 0) {
    return getTimelineEntries(eventId).then((t) => t.find((x) => x.id === entryId) ?? null);
  }

  updatesList.push('updated_at = NOW()');
  values.push(entryId, eventId);

  await query(
    `UPDATE timeline_entries SET ${updatesList.join(', ')} WHERE id = $${i} AND event_id = $${i + 1}`,
    values
  );

  const row = await queryOne<{
    id: string;
    event_id: string;
    time_slot: string;
    title: string;
    description: string | null;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  }>(`SELECT * FROM timeline_entries WHERE id = $1 AND event_id = $2`, [entryId, eventId]);

  if (!row) return null;

  return {
    id: row.id,
    eventId: row.event_id,
    timeSlot: row.time_slot,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function deleteTimelineEntry(
  eventId: string,
  entryId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM timeline_entries WHERE id = $1 AND event_id = $2`,
    [entryId, eventId]
  );
  return (result.rowCount ?? 0) > 0;
}
