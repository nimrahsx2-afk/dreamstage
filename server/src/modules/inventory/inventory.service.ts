// Inventory Service - Asset management and stock reservation with transactions

import { queryOne, queryAll, getPool } from '../../db/client';
import type {
  Asset,
  AssetCategory,
  AssetInput,
  AssetUpdate,
  StockReservation,
  StockAvailability,
  EventStockReservation,
  ReserveStockInput,
  ReserveStockResult,
  DbAsset,
  DbStockReservation,
  DbStockAvailability,
} from './inventory.types';
import { normalizeAssetCategory, resolveModelRefForClient } from '../assets/assetTransforms';

// ============ TRANSFORM FUNCTIONS ============

function transformAsset(row: DbAsset): Asset {
  return {
    id: row.id,
    name: row.name,
    category: normalizeAssetCategory(row.category),
    defaultUnitPrice: parseFloat(row.default_unit_price),
    stockQuantity: row.stock_quantity,
    modelRef: resolveModelRefForClient(row.model_ref, row.file_url ?? null),
    thumbnailUrl: row.thumbnail_url,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function transformStockReservation(row: DbStockReservation): StockReservation {
  return {
    id: row.id,
    eventId: row.event_id,
    assetId: row.asset_id,
    quantityReserved: row.quantity_reserved,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ============ ASSET CRUD (Admin) ============

// Get all assets (optionally filter by active status)
export async function getAssets(activeOnly: boolean = true): Promise<Asset[]> {
  const query = activeOnly
    ? `SELECT * FROM assets WHERE is_active = true ORDER BY category, name`
    : `SELECT * FROM assets ORDER BY category, name`;

  const rows = await queryAll<DbAsset>(query);
  return rows.map(transformAsset);
}

// Get assets by category
export async function getAssetsByCategory(
  category: AssetCategory
): Promise<Asset[]> {
  const rows = await queryAll<DbAsset>(
    `SELECT * FROM assets WHERE category = $1 AND is_active = true ORDER BY name`,
    [category]
  );
  return rows.map(transformAsset);
}

// Get a single asset by ID
export async function getAsset(assetId: string): Promise<Asset | null> {
  const row = await queryOne<DbAsset>(
    `SELECT * FROM assets WHERE id = $1`,
    [assetId]
  );
  return row ? transformAsset(row) : null;
}

// Create a new asset (Admin only)
export async function createAsset(input: AssetInput): Promise<Asset> {
  const row = await queryOne<DbAsset>(
    `INSERT INTO assets (name, category, default_unit_price, stock_quantity, model_ref, thumbnail_url, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.name,
      input.category,
      input.defaultUnitPrice,
      input.stockQuantity,
      input.modelRef || null,
      input.thumbnailUrl || null,
      input.description || null,
      input.isActive ?? true,
    ]
  );

  return transformAsset(row!);
}

// Update an asset (Admin only)
export async function updateAsset(
  assetId: string,
  input: AssetUpdate
): Promise<Asset | null> {
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
  if (input.defaultUnitPrice !== undefined) {
    updates.push(`default_unit_price = $${paramIndex++}`);
    values.push(input.defaultUnitPrice);
  }
  if (input.stockQuantity !== undefined) {
    updates.push(`stock_quantity = $${paramIndex++}`);
    values.push(input.stockQuantity);
  }
  if (input.modelRef !== undefined) {
    updates.push(`model_ref = $${paramIndex++}`);
    values.push(input.modelRef);
  }
  if (input.thumbnailUrl !== undefined) {
    updates.push(`thumbnail_url = $${paramIndex++}`);
    values.push(input.thumbnailUrl);
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
    return getAsset(assetId);
  }

  values.push(assetId);

  const row = await queryOne<DbAsset>(
    `UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return row ? transformAsset(row) : null;
}

// Delete an asset (soft delete by setting is_active = false)
export async function deleteAsset(assetId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `UPDATE assets SET is_active = false WHERE id = $1 RETURNING id`,
    [assetId]
  );
  return result !== null;
}

// ============ STOCK AVAILABILITY ============

// Get stock availability for all active assets
export async function getAllStockAvailability(): Promise<StockAvailability[]> {
  const rows = await queryAll<DbStockAvailability>(
    `SELECT 
       a.id as asset_id,
       a.name as asset_name,
       a.stock_quantity as total_stock,
       COALESCE(SUM(sr.quantity_reserved), 0) as total_reserved
     FROM assets a
     LEFT JOIN stock_reservations sr ON sr.asset_id = a.id
     WHERE a.is_active = true
     GROUP BY a.id, a.name, a.stock_quantity
     ORDER BY a.category, a.name`
  );

  return rows.map((row) => {
    const totalStock = row.total_stock;
    const totalReserved = parseInt(row.total_reserved) || 0;
    const availableStock = totalStock - totalReserved;

    return {
      assetId: row.asset_id,
      assetName: row.asset_name,
      totalStock,
      totalReserved,
      availableStock,
      isAvailable: availableStock > 0,
    };
  });
}

// Get stock availability for a specific asset
export async function getAssetStockAvailability(
  assetId: string
): Promise<StockAvailability | null> {
  const row = await queryOne<DbStockAvailability>(
    `SELECT 
       a.id as asset_id,
       a.name as asset_name,
       a.stock_quantity as total_stock,
       COALESCE(SUM(sr.quantity_reserved), 0) as total_reserved
     FROM assets a
     LEFT JOIN stock_reservations sr ON sr.asset_id = a.id
     WHERE a.id = $1 AND a.is_active = true
     GROUP BY a.id, a.name, a.stock_quantity`,
    [assetId]
  );

  if (!row) return null;

  const totalStock = row.total_stock;
  const totalReserved = parseInt(row.total_reserved) || 0;
  const availableStock = totalStock - totalReserved;

  return {
    assetId: row.asset_id,
    assetName: row.asset_name,
    totalStock,
    totalReserved,
    availableStock,
    isAvailable: availableStock > 0,
  };
}

// Check if a specific quantity is available (fast check for <300ms requirement)
export async function checkStockAvailable(
  assetId: string,
  quantityNeeded: number
): Promise<{ available: boolean; currentAvailable: number }> {
  const availability = await getAssetStockAvailability(assetId);

  if (!availability) {
    return { available: false, currentAvailable: 0 };
  }

  return {
    available: availability.availableStock >= quantityNeeded,
    currentAvailable: availability.availableStock,
  };
}

// ============ STOCK RESERVATIONS ============

// Get all reservations for an event
export async function getEventReservations(
  eventId: string
): Promise<EventStockReservation[]> {
  const rows = await queryAll<{
    asset_id: string;
    asset_name: string;
    category: string;
    quantity_reserved: number;
    default_unit_price: string;
  }>(
    `SELECT 
       sr.asset_id,
       a.name as asset_name,
       a.category,
       sr.quantity_reserved,
       a.default_unit_price
     FROM stock_reservations sr
     JOIN assets a ON a.id = sr.asset_id
     WHERE sr.event_id = $1
     ORDER BY a.category, a.name`,
    [eventId]
  );

  return rows.map((row) => ({
    assetId: row.asset_id,
    assetName: row.asset_name,
    category: normalizeAssetCategory(row.category),
    quantityReserved: row.quantity_reserved,
    unitPrice: parseFloat(row.default_unit_price),
  }));
}

// Get reservation for a specific asset in an event
export async function getEventAssetReservation(
  eventId: string,
  assetId: string
): Promise<StockReservation | null> {
  const row = await queryOne<DbStockReservation>(
    `SELECT * FROM stock_reservations WHERE event_id = $1 AND asset_id = $2`,
    [eventId, assetId]
  );

  return row ? transformStockReservation(row) : null;
}

// Reserve stock for an event - uses transaction for atomic operation
export async function reserveStock(
  eventId: string,
  input: ReserveStockInput
): Promise<ReserveStockResult> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the asset row for update to prevent race conditions
    const assetResult = await client.query<DbAsset>(
      `SELECT * FROM assets WHERE id = $1 AND is_active = true FOR UPDATE`,
      [input.assetId]
    );

    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        assetId: input.assetId,
        quantityReserved: 0,
        availableAfter: 0,
        error: 'Asset not found or inactive',
      };
    }

    const asset = assetResult.rows[0];

    // Get current total reservations for this asset (excluding this event)
    const reservedResult = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(quantity_reserved), 0) as total 
       FROM stock_reservations 
       WHERE asset_id = $1 AND event_id != $2`,
      [input.assetId, eventId]
    );

    const otherReserved = parseInt(reservedResult.rows[0].total) || 0;

    // Get current reservation for this event
    const currentReservationResult = await client.query<{ quantity_reserved: number }>(
      `SELECT quantity_reserved FROM stock_reservations 
       WHERE event_id = $1 AND asset_id = $2`,
      [eventId, input.assetId]
    );

    const currentReserved = currentReservationResult.rows[0]?.quantity_reserved || 0;
    const totalStock = asset.stock_quantity;
    const availableForEvent = totalStock - otherReserved;

    // Check if requested quantity is available
    if (input.quantity > availableForEvent) {
      await client.query('ROLLBACK');
      return {
        success: false,
        assetId: input.assetId,
        quantityReserved: currentReserved,
        availableAfter: availableForEvent,
        error: `Only ${availableForEvent} units available (requested ${input.quantity})`,
      };
    }

    // Upsert the reservation
    await client.query(
      `INSERT INTO stock_reservations (event_id, asset_id, quantity_reserved)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, asset_id) 
       DO UPDATE SET quantity_reserved = $3`,
      [eventId, input.assetId, input.quantity]
    );

    await client.query('COMMIT');

    const newAvailable = totalStock - otherReserved - input.quantity;

    return {
      success: true,
      assetId: input.assetId,
      quantityReserved: input.quantity,
      availableAfter: newAvailable,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Release stock reservation (reduce quantity or remove entirely)
export async function releaseStock(
  eventId: string,
  assetId: string,
  quantityToRelease?: number
): Promise<{ success: boolean; newQuantity: number }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current reservation
    const currentResult = await client.query<{ id: string; quantity_reserved: number }>(
      `SELECT id, quantity_reserved FROM stock_reservations 
       WHERE event_id = $1 AND asset_id = $2 FOR UPDATE`,
      [eventId, assetId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: true, newQuantity: 0 };
    }

    const current = currentResult.rows[0];

    if (quantityToRelease === undefined || quantityToRelease >= current.quantity_reserved) {
      // Remove the reservation entirely
      await client.query(
        `DELETE FROM stock_reservations WHERE id = $1`,
        [current.id]
      );
      await client.query('COMMIT');
      return { success: true, newQuantity: 0 };
    } else {
      // Reduce the quantity
      const newQuantity = current.quantity_reserved - quantityToRelease;
      await client.query(
        `UPDATE stock_reservations SET quantity_reserved = $1 WHERE id = $2`,
        [newQuantity, current.id]
      );
      await client.query('COMMIT');
      return { success: true, newQuantity };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Sync reservations from scene - update reservations based on placed assets
export async function syncReservationsFromScene(
  eventId: string,
  placedAssets: Array<{ assetId: string; quantity: number }>
): Promise<{ success: boolean; errors: string[] }> {
  const pool = getPool();
  const client = await pool.connect();
  const errors: string[] = [];

  try {
    await client.query('BEGIN');

    // Group placed assets by assetId and sum quantities
    const assetQuantities = new Map<string, number>();
    for (const asset of placedAssets) {
      const current = assetQuantities.get(asset.assetId) || 0;
      assetQuantities.set(asset.assetId, current + asset.quantity);
    }

    // Get current reservations for this event
    const currentReservations = await client.query<{ asset_id: string; quantity_reserved: number }>(
      `SELECT asset_id, quantity_reserved FROM stock_reservations WHERE event_id = $1`,
      [eventId]
    );

    const currentMap = new Map<string, number>();
    for (const row of currentReservations.rows) {
      currentMap.set(row.asset_id, row.quantity_reserved);
    }

    // Process each asset that should be reserved
    for (const [assetId, quantity] of assetQuantities) {
      // Check stock availability
      const assetResult = await client.query<DbAsset>(
        `SELECT * FROM assets WHERE id = $1 AND is_active = true FOR UPDATE`,
        [assetId]
      );

      if (assetResult.rows.length === 0) {
        errors.push(`Asset ${assetId} not found`);
        continue;
      }

      const asset = assetResult.rows[0];

      // Get reservations from other events
      const otherReservedResult = await client.query<{ total: string }>(
        `SELECT COALESCE(SUM(quantity_reserved), 0) as total 
         FROM stock_reservations 
         WHERE asset_id = $1 AND event_id != $2`,
        [assetId, eventId]
      );

      const otherReserved = parseInt(otherReservedResult.rows[0].total) || 0;
      const availableForEvent = asset.stock_quantity - otherReserved;

      if (quantity > availableForEvent) {
        errors.push(`${asset.name}: only ${availableForEvent} available (need ${quantity})`);
        continue;
      }

      // Upsert reservation
      await client.query(
        `INSERT INTO stock_reservations (event_id, asset_id, quantity_reserved)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, asset_id) 
         DO UPDATE SET quantity_reserved = $3`,
        [eventId, assetId, quantity]
      );

      currentMap.delete(assetId);
    }

    // Remove reservations for assets no longer in scene
    for (const [assetId] of currentMap) {
      await client.query(
        `DELETE FROM stock_reservations WHERE event_id = $1 AND asset_id = $2`,
        [eventId, assetId]
      );
    }

    await client.query('COMMIT');

    return { success: errors.length === 0, errors };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
