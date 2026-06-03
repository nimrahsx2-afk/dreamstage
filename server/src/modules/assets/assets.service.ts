/**
 * Shared asset catalog queries (public list + admin upload helpers).
 */

import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne } from '../../db/client';
import { NotFoundError } from '../../middleware/errorHandler';
import type { Asset } from '../inventory/inventory.types';
import { normalizeAssetCategory, resolveModelRefForClient } from './assetTransforms';

export interface DbAssetRow {
  id: string;
  name: string;
  category: string;
  default_unit_price: string;
  stock_quantity: number;
  model_ref: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: DbAssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    category: normalizeAssetCategory(row.category),
    defaultUnitPrice: parseFloat(row.default_unit_price),
    stockQuantity: row.stock_quantity,
    modelRef: resolveModelRefForClient(row.model_ref, row.file_url),
    thumbnailUrl: row.thumbnail_url,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getActiveAssets(): Promise<Asset[]> {
  const rows = await queryAll<DbAssetRow>(
    `SELECT * FROM assets WHERE is_active = true ORDER BY category, name`
  );
  return rows.map(mapRow);
}

export async function getAllAssetsOrdered(activeOnly = false): Promise<Asset[]> {
  const sql = activeOnly
    ? `SELECT * FROM assets WHERE is_active = true ORDER BY category, name`
    : `SELECT * FROM assets ORDER BY category, name`;
  const rows = await queryAll<DbAssetRow>(sql);
  return rows.map(mapRow);
}

export async function insertAssetUploaded(input: {
  name: string;
  category: string;
  modelFileName: string;
  thumbnailUrl: string | null;
  pricePerUnit: number;
}): Promise<Asset> {
  const file_url = `/models/${input.modelFileName}`;
  const model_ref = input.modelFileName;
  const row = await queryOne<DbAssetRow>(
    `INSERT INTO assets (id, name, category, default_unit_price, stock_quantity, model_ref, file_url, thumbnail_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING *`,
    [
      uuidv4(),
      input.name,
      input.category.toLowerCase(),
      input.pricePerUnit,
      999,
      model_ref,
      file_url,
      input.thumbnailUrl,
    ]
  );
  if (!row) {
    throw new Error('Failed to create asset');
  }
  return mapRow(row);
}

export async function updateAssetMetadata(
  id: string,
  data: { name?: string; category?: string; pricePerUnit?: number }
): Promise<Asset> {
  const existing = await queryOne<DbAssetRow>('SELECT id FROM assets WHERE id = $1', [id]);
  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(data.name);
  }
  if (data.category !== undefined) {
    updates.push(`category = $${i++}`);
    values.push(data.category.toLowerCase());
  }
  if (data.pricePerUnit !== undefined) {
    updates.push(`default_unit_price = $${i++}`);
    values.push(data.pricePerUnit);
  }

  if (updates.length === 0) {
    const row = await queryOne<DbAssetRow>('SELECT * FROM assets WHERE id = $1', [id]);
    return mapRow(row!);
  }

  values.push(id);
  const row = await queryOne<DbAssetRow>(
    `UPDATE assets SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!row) {
    throw new Error('Failed to update asset');
  }
  return mapRow(row);
}

export async function softDeleteAsset(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `UPDATE assets SET is_active = false WHERE id = $1 RETURNING id`,
    [id]
  );
  return result !== null;
}
