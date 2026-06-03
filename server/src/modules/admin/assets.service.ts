/**
 * Asset inventory management service.
 * Handles CRUD operations for décor assets (admin only).
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import { NotFoundError, ValidationError } from '../../middleware/errorHandler';
import {
  CreateAssetInput,
  UpdateAssetInput,
  AssetResponse,
  DbAsset,
  AssetFilters,
  PaginationParams,
  PaginatedResponse,
} from './admin.types';
import { resolveModelRefForClient } from '../assets/assetTransforms';

/**
 * Get paginated list of assets with optional filters.
 */
export async function getAllAssets(
  filters: AssetFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<AssetResponse>> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (filters.category) {
    conditions.push(`category = $${paramIndex++}`);
    values.push(filters.category);
  }

  if (filters.isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    values.push(filters.isActive);
  }

  if (filters.search) {
    conditions.push(`name ILIKE $${paramIndex++}`);
    values.push(`%${filters.search}%`);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM assets ${whereClause}`,
    values
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get paginated assets
  const paginationValues = [...values, limit, offset];
  const assets = await queryAll<DbAsset>(
    `SELECT * FROM assets ${whereClause}
     ORDER BY category, name
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    paginationValues
  );

  return {
    data: assets.map(formatAssetResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single asset by ID.
 */
export async function getAssetById(id: string): Promise<AssetResponse> {
  const asset = await queryOne<DbAsset>(
    'SELECT * FROM assets WHERE id = $1',
    [id]
  );

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return formatAssetResponse(asset);
}

/**
 * Create a new asset.
 */
export async function createAsset(input: CreateAssetInput): Promise<AssetResponse> {
  if (input.defaultUnitPrice < 0) {
    throw new ValidationError('Price cannot be negative');
  }

  if (input.stockQuantity < 0) {
    throw new ValidationError('Stock quantity cannot be negative');
  }

  const mr = input.modelRef?.trim() || null;
  const fileUrl =
    mr && !mr.startsWith('/')
      ? `/models/${mr}`
      : mr && mr.startsWith('/')
        ? mr
        : null;

  const asset = await queryOne<DbAsset>(
    `INSERT INTO assets (id, name, category, default_unit_price, stock_quantity, description, thumbnail_url, model_ref, file_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      uuidv4(),
      input.name,
      input.category,
      input.defaultUnitPrice,
      input.stockQuantity,
      input.description ?? null,
      input.thumbnailUrl ?? null,
      mr,
      fileUrl,
    ]
  );

  if (!asset) {
    throw new Error('Failed to create asset');
  }

  return formatAssetResponse(asset);
}

/**
 * Update an existing asset.
 */
export async function updateAsset(
  id: string,
  input: UpdateAssetInput
): Promise<AssetResponse> {
  // Check asset exists
  const existing = await queryOne<DbAsset>(
    'SELECT id FROM assets WHERE id = $1',
    [id]
  );

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Validate inputs
  if (input.defaultUnitPrice !== undefined && input.defaultUnitPrice < 0) {
    throw new ValidationError('Price cannot be negative');
  }

  if (input.stockQuantity !== undefined && input.stockQuantity < 0) {
    throw new ValidationError('Stock quantity cannot be negative');
  }

  // Build dynamic update query
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
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.thumbnailUrl !== undefined) {
    updates.push(`thumbnail_url = $${paramIndex++}`);
    values.push(input.thumbnailUrl);
  }
  if (input.modelRef !== undefined) {
    updates.push(`model_ref = $${paramIndex++}`);
    values.push(input.modelRef);
  }

  if (updates.length === 0) {
    return getAssetById(id);
  }

  values.push(id);
  const asset = await queryOne<DbAsset>(
    `UPDATE assets 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (!asset) {
    throw new Error('Failed to update asset');
  }

  return formatAssetResponse(asset);
}

/**
 * Adjust stock quantity by a delta amount.
 * Use positive delta to add stock, negative to remove.
 */
export async function adjustStock(id: string, delta: number): Promise<AssetResponse> {
  // Use a query that prevents negative stock
  const asset = await queryOne<DbAsset>(
    `UPDATE assets 
     SET stock_quantity = GREATEST(0, stock_quantity + $1)
     WHERE id = $2
     RETURNING *`,
    [delta, id]
  );

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return formatAssetResponse(asset);
}

/**
 * Toggle asset active status (enable/disable).
 */
export async function toggleAssetActive(id: string): Promise<AssetResponse> {
  const asset = await queryOne<DbAsset>(
    `UPDATE assets 
     SET is_active = NOT is_active
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return formatAssetResponse(asset);
}

/**
 * Format database asset to response object.
 */
function formatAssetResponse(asset: DbAsset): AssetResponse {
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    defaultUnitPrice: parseFloat(asset.default_unit_price),
    stockQuantity: asset.stock_quantity,
    description: asset.description,
    thumbnailUrl: asset.thumbnail_url,
    modelRef: resolveModelRefForClient(asset.model_ref, asset.file_url ?? null),
    isActive: asset.is_active,
    createdAt: asset.created_at.toISOString(),
    updatedAt: asset.updated_at.toISOString(),
  };
}
