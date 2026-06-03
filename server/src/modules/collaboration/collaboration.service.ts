// Collaboration Service - Shared view, comments, approval (no auth, token-based)

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import * as editorService from '../editor/editor.service';
import * as budgetService from '../budget/budget.service';
import type { SharedViewData, ClientComment, ClientCommentInput } from './collaboration.types';

// Get event by share token (for validation)
async function getEventByShareToken(shareToken: string): Promise<{
  id: string;
  name: string;
  event_type: string;
  event_date: Date;
  status: string;
  share_password_hash: string | null;
  show_budget_details: boolean;
} | null> {
  return queryOne(
    `SELECT id, name, event_type, event_date, status, share_password_hash, show_budget_details
     FROM events WHERE share_token = $1`,
    [shareToken]
  );
}

// Validate token and optional password, return event id or null
export async function validateShareAccess(
  shareToken: string,
  password?: string | null
): Promise<string | null> {
  const event = await getEventByShareToken(shareToken);
  if (!event) return null;

  if (event.share_password_hash) {
    if (!password || !(await bcrypt.compare(password, event.share_password_hash))) {
      return null;
    }
  }

  return event.id;
}

// Get full shared view data (event, scene, budget summary)
export async function getSharedViewData(
  eventId: string,
  includeBudget: boolean
): Promise<SharedViewData | null> {
  const event = await queryOne<{
    id: string;
    name: string;
    event_type: string;
    event_date: Date;
    status: string;
    show_budget_details: boolean;
    venue_template_id: string | null;
    venue_model_ref: string | null;
  }>(
    `SELECT
        e.id,
        e.name,
        e.event_type,
        e.event_date,
        e.status,
        e.show_budget_details,
        vt.id as venue_template_id,
        vt.model_ref as venue_model_ref
     FROM events e
     LEFT JOIN venue_bookings vb
       ON vb.event_id = e.id
       AND vb.status = 'confirmed'
     LEFT JOIN venue_templates vt
       ON vt.id = vb.venue_template_id
     WHERE e.id = $1`,
    [eventId]
  );

  if (!event) return null;

  const sceneLayout = await editorService.getSceneLayout(eventId);
  let sceneJson = sceneLayout?.sceneJson ?? null;

  // Enrich placed assets with modelRef from assets table (client view needs it for GLB rendering)
  if (sceneJson?.placedAssets?.length) {
    const assetIds = [...new Set((sceneJson.placedAssets as { assetId: string }[]).map((a) => a.assetId))];
    const rows = await queryAll<{ id: string; model_ref: string | null }>(
      `SELECT id, model_ref FROM assets WHERE id = ANY($1)`,
      [assetIds]
    );
    const modelRefMap = new Map(rows.map((r) => [r.id, r.model_ref]));

    sceneJson = {
      ...sceneJson,
      placedAssets: (sceneJson.placedAssets as any[]).map((pa) => ({
        ...pa,
        modelRef: pa.modelRef ?? pa.model_ref ?? modelRefMap.get(pa.assetId) ?? null,
      })),
    };
  }

  const isLocked = sceneLayout?.isLocked ?? false;

  let budgetSummary: SharedViewData['budgetSummary'] | undefined;
  if (includeBudget && event.show_budget_details) {
    const summary = await budgetService.getEventBudgetSummary(eventId);
    budgetSummary = {
      grandTotal: summary.grandTotal,
      budgetCeiling: summary.budgetCeiling,
      isOverBudget: summary.isOverBudget,
    };
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      eventType: event.event_type,
      eventDate: event.event_date.toISOString().split('T')[0],
      status: event.status as 'draft' | 'approved' | 'locked',
      showBudgetDetails: event.show_budget_details,
      venueTemplateId: event.venue_template_id,
      venueModelRef: event.venue_model_ref,
    },
    sceneJson,
    isLocked,
    budgetSummary,
  };
}

// Get comments for event (threaded)
export async function getComments(eventId: string): Promise<ClientComment[]> {
  const rows = await queryAll<{
    id: string;
    parent_comment_id: string | null;
    client_identifier: string;
    content: string;
    is_planner_reply: boolean;
    created_at: Date;
  }>(
    `SELECT id, parent_comment_id, client_identifier, content, is_planner_reply, created_at
     FROM client_comments WHERE event_id = $1 ORDER BY created_at ASC`,
    [eventId]
  );

  const result = rows.map((r) => ({
    id: r.id,
    parentCommentId: r.parent_comment_id,
    clientIdentifier: r.client_identifier,
    content: r.content,
    isPlannerReply: r.is_planner_reply,
    createdAt: r.created_at.toISOString(),
  }));
  console.log('[Comments] GET', { eventId, count: result.length, comments: result });
  return result;
}

// Add comment (client or planner reply)
export async function addComment(
  eventId: string,
  input: ClientCommentInput,
  isPlannerReply: boolean = false
): Promise<ClientComment> {
  const id = uuidv4();
  const parentId = input.parentCommentId ?? null;
  // client_identifier is NOT NULL; planner name may be missing from JWT, default to "Event Planner"
  const clientIdentifier =
    input.clientIdentifier?.trim() || (isPlannerReply ? 'Event Planner' : 'Client');
  console.log('[Comments] INSERT', {
    id,
    eventId,
    parent_comment_id: parentId,
    clientIdentifier,
    isPlannerReply,
    contentLength: input.content?.length,
  });
  await query(
    `INSERT INTO client_comments (id, event_id, parent_comment_id, client_identifier, content, is_planner_reply)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, eventId, parentId, clientIdentifier, input.content, isPlannerReply]
  );

  const row = await queryOne<{
    id: string;
    parent_comment_id: string | null;
    client_identifier: string;
    content: string;
    is_planner_reply: boolean;
    created_at: Date;
  }>(`SELECT id, parent_comment_id, client_identifier, content, is_planner_reply, created_at
      FROM client_comments WHERE id = $1`, [id]);

  return {
    id: row!.id,
    parentCommentId: row!.parent_comment_id,
    clientIdentifier: row!.client_identifier,
    content: row!.content,
    isPlannerReply: row!.is_planner_reply,
    createdAt: row!.created_at.toISOString(),
  };
}

// Submit approval (client action)
export async function submitApproval(
  eventId: string,
  clientIdentifier: string
): Promise<{ success: boolean; error?: string }> {
  const event = await queryOne<{ status: string }>(
    `SELECT status FROM events WHERE id = $1`,
    [eventId]
  );
  if (!event) return { success: false, error: 'Event not found' };
  if (event.status !== 'draft') {
    return { success: false, error: 'Event is not in draft status' };
  }

  const sceneLayout = await editorService.getSceneLayout(eventId);
  const sceneVersion = sceneLayout?.version ?? 0;

  await query('BEGIN');

  try {
    await query(
      `INSERT INTO approvals (id, event_id, client_identifier, scene_version_ref)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), eventId, clientIdentifier, sceneVersion]
    );
    await query(
      `UPDATE events SET status = 'approved' WHERE id = $1`,
      [eventId]
    );
    await editorService.lockScene(eventId);
    await query('COMMIT');
  } catch (e) {
    await query('ROLLBACK');
    throw e;
  }

  return { success: true };
}
