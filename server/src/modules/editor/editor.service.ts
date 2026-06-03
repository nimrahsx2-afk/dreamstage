// Editor Service - Scene persistence and lock management

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../../db/client';
import type {
  SceneJson,
  SceneLayoutRow,
  LoadSceneResponse,
  SaveSceneResponse,
} from './editor.types';
import { syncBudgetFromScene } from '../budget/budget.service';

// Retrieve scene layout for an event, returns null if none exists
export async function getSceneLayout(eventId: string): Promise<LoadSceneResponse | null> {
  const result = await queryOne<SceneLayoutRow>(
    `SELECT id, event_id, scene_json, version, locked, created_at, updated_at
     FROM scene_layouts
     WHERE event_id = $1`,
    [eventId]
  );

  if (!result) {
    return null;
  }

  return {
    sceneJson: result.scene_json,
    isLocked: result.locked,
    version: result.version,
    lastSavedAt: result.updated_at?.toISOString() || null,
  };
}

// Save scene layout - creates new or updates existing
export async function saveSceneLayout(
  eventId: string,
  sceneJson: SceneJson
): Promise<SaveSceneResponse> {
  const existing = await queryOne<{ id: string; locked: boolean; version: number }>(
    `SELECT id, locked, version FROM scene_layouts WHERE event_id = $1`,
    [eventId]
  );

  let version: number;

  if (existing) {
    // Prevent saving if scene is locked
    if (existing.locked) {
      throw new Error('Cannot save: scene is locked after client approval');
    }

    // Update existing scene
    version = existing.version + 1;
    await query(
      `UPDATE scene_layouts 
       SET scene_json = $1, version = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(sceneJson), version, existing.id]
    );
  } else {
    // Create new scene layout
    version = 1;
    const id = uuidv4();
    await query(
      `INSERT INTO scene_layouts (id, event_id, scene_json, version, locked)
       VALUES ($1, $2, $3, 1, false)`,
      [id, eventId, JSON.stringify(sceneJson)]
    );
  }

  // Sync budget items from placed assets
  if (sceneJson.placedAssets && sceneJson.placedAssets.length > 0) {
    const sceneAssets = sceneJson.placedAssets.map((asset) => ({
      assetId: asset.assetId,
      quantity: 1,
      priceOverride: asset.priceOverride,
    }));
    await syncBudgetFromScene(eventId, sceneAssets);
  } else {
    // Clear budget items if no assets placed
    await syncBudgetFromScene(eventId, []);
  }

  return {
    success: true,
    version,
    savedAt: new Date().toISOString(),
  };
}

// Lock scene after client approval
export async function lockScene(eventId: string): Promise<void> {
  const result = await query(
    `UPDATE scene_layouts SET locked = true, updated_at = NOW()
     WHERE event_id = $1 AND locked = false`,
    [eventId]
  );

  if (result.rowCount === 0) {
    throw new Error('Scene not found or already locked');
  }
}

// Unlock scene (planner action with confirmation)
export async function unlockScene(eventId: string): Promise<void> {
  const result = await query(
    `UPDATE scene_layouts SET locked = false, updated_at = NOW()
     WHERE event_id = $1 AND locked = true`,
    [eventId]
  );

  if (result.rowCount === 0) {
    throw new Error('Scene not found or already unlocked');
  }
}

// Check if scene is locked
export async function isSceneLocked(eventId: string): Promise<boolean> {
  const result = await queryOne<{ locked: boolean }>(
    `SELECT locked FROM scene_layouts WHERE event_id = $1`,
    [eventId]
  );

  return result?.locked ?? false;
}

// Delete scene layout (used when deleting an event)
export async function deleteSceneLayout(eventId: string): Promise<void> {
  await query(`DELETE FROM scene_layouts WHERE event_id = $1`, [eventId]);
}

// Get scene version history count
export async function getSceneVersion(eventId: string): Promise<number> {
  const result = await queryOne<{ version: number }>(
    `SELECT version FROM scene_layouts WHERE event_id = $1`,
    [eventId]
  );

  return result?.version ?? 0;
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

// Get event details for editor context
export async function getEventForEditor(eventId: string): Promise<{
  id: string;
  name: string;
  budgetCeiling: number | null;
  venueTemplateId: string | null;
  status: string;
} | null> {
  const result = await queryOne<{
    id: string;
    name: string;
    budget_ceiling: string | null;
    status: string;
  }>(
    `SELECT e.id, e.name, e.budget_ceiling, e.status
     FROM events e
     WHERE e.id = $1`,
    [eventId]
  );

  if (!result) {
    return null;
  }

  // Get venue template if booked
  const booking = await queryOne<{ venue_template_id: string }>(
    `SELECT venue_template_id FROM venue_bookings 
     WHERE event_id = $1 AND status = 'confirmed'`,
    [eventId]
  );

  return {
    id: result.id,
    name: result.name,
    budgetCeiling: result.budget_ceiling ? parseFloat(result.budget_ceiling) : null,
    venueTemplateId: booking?.venue_template_id || null,
    status: result.status,
  };
}
