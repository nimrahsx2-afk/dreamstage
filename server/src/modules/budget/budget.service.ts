// Budget Service - CRUD operations for budget items

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import type {
  BudgetItem,
  BudgetItemInput,
  BudgetItemUpdate,
  DbBudgetItem,
  BudgetSummary,
  CategoryBreakdown,
} from './budget.types';
import {
  calculateBudgetSummary,
  calculateCategoryBreakdown,
} from './budget.calculations';

// Transform database row to BudgetItem
function transformBudgetItem(row: DbBudgetItem): BudgetItem {
  return {
    id: row.id,
    eventId: row.event_id,
    assetId: row.asset_id,
    description: row.description,
    category: row.category,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
    unitPriceOverride: row.unit_price_override
      ? parseFloat(row.unit_price_override)
      : null,
    vendorId: row.vendor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Get all budget items for an event
export async function getBudgetItems(eventId: string): Promise<BudgetItem[]> {
  const rows = await queryAll<DbBudgetItem>(
    `SELECT bi.*, a.name as asset_name, a.category as asset_category
     FROM budget_items bi
     LEFT JOIN assets a ON bi.asset_id = a.id
     WHERE bi.event_id = $1 ORDER BY bi.created_at DESC`,
    [eventId]
  );
  return rows.map(transformBudgetItem);
}

// Get a single budget item
export async function getBudgetItem(
  itemId: string
): Promise<BudgetItem | null> {
  const row = await queryOne<DbBudgetItem>(
    `SELECT bi.*, a.name as asset_name, a.category as asset_category
     FROM budget_items bi
     LEFT JOIN assets a ON bi.asset_id = a.id
     WHERE bi.id = $1`,
    [itemId]
  );
  return row ? transformBudgetItem(row) : null;
}

// Create a new budget item
export async function createBudgetItem(
  eventId: string,
  input: BudgetItemInput
): Promise<BudgetItem> {
  const id = uuidv4();

  // Get asset price if assetId provided
  let unitPrice = input.unitPrice;
  if (input.assetId && !unitPrice) {
    const asset = await queryOne<{ default_unit_price: string }>(
      `SELECT default_unit_price FROM assets WHERE id = $1`,
      [input.assetId]
    );
    if (asset) {
      unitPrice = parseFloat(asset.default_unit_price);
    }
  }

  const row = await queryOne<DbBudgetItem>(
    `INSERT INTO budget_items (id, event_id, asset_id, quantity, unit_price_override)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *, (SELECT name FROM assets WHERE id = $3) as asset_name,
                  (SELECT category FROM assets WHERE id = $3) as asset_category`,
    [
      id,
      eventId,
      input.assetId || null,
      input.quantity,
      input.unitPriceOverride || null,
    ]
  );

  return transformBudgetItem(row!);
}

// Update a budget item
export async function updateBudgetItem(
  itemId: string,
  input: BudgetItemUpdate
): Promise<BudgetItem | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.quantity !== undefined) {
    updates.push(`quantity = $${paramIndex++}`);
    values.push(input.quantity);
  }
  if (input.unitPriceOverride !== undefined) {
    updates.push(`unit_price_override = $${paramIndex++}`);
    values.push(input.unitPriceOverride);
  }

  if (updates.length === 0) {
    return getBudgetItem(itemId);
  }

  values.push(itemId);

  const row = await queryOne<DbBudgetItem>(
    `UPDATE budget_items SET ${updates.join(', ')} 
     WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return row ? transformBudgetItem(row) : null;
}

// Delete a budget item
export async function deleteBudgetItem(itemId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM budget_items WHERE id = $1`,
    [itemId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Get budget summary for an event
export async function getEventBudgetSummary(
  eventId: string
): Promise<BudgetSummary> {
  // Get budget items with asset prices
  const itemRows = await queryAll<{
    id: string;
    event_id: string;
    asset_id: string | null;
    quantity: number;
    unit_price_override: string | null;
    default_unit_price: string;
    asset_name: string;
    asset_category: string;
  }>(
    `SELECT bi.id, bi.event_id, bi.asset_id, bi.quantity, bi.unit_price_override,
            a.default_unit_price, a.name as asset_name, a.category as asset_category
     FROM budget_items bi
     JOIN assets a ON bi.asset_id = a.id
     WHERE bi.event_id = $1`,
    [eventId]
  );

  const items: BudgetItem[] = itemRows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    assetId: row.asset_id,
    description: row.asset_name || '',
    category: row.asset_category || 'other',
    quantity: row.quantity,
    unitPrice: parseFloat(row.default_unit_price),
    unitPriceOverride: row.unit_price_override
      ? parseFloat(row.unit_price_override)
      : null,
    vendorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Get all payments for vendors in this event
  const payments = await queryAll<{
    id: string;
    vendor_id: string;
    amount: string;
    payment_type: 'deposit' | 'final';
    paid_at: Date;
  }>(
    `SELECT vp.id, vp.vendor_id, vp.amount, vp.payment_type, vp.paid_at
     FROM vendor_payments vp
     JOIN vendors v ON vp.vendor_id = v.id
     WHERE v.event_id = $1`,
    [eventId]
  );

  const transformedPayments = payments.map((p) => ({
    id: p.id,
    vendorId: p.vendor_id,
    amount: parseFloat(p.amount),
    type: p.payment_type,
    paidAt: p.paid_at,
    notes: null,
    receiptUrl: null,
    createdAt: p.paid_at,
  }));

  // Get budget ceiling from event
  const event = await queryOne<{ budget_ceiling: string | null }>(
    `SELECT budget_ceiling FROM events WHERE id = $1`,
    [eventId]
  );

  const budgetCeiling = event?.budget_ceiling
    ? parseFloat(event.budget_ceiling)
    : null;

  // Sum of all vendor contract amounts (Total Spent = assets + this)
  const vendorSum = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(total_contract_amount), 0)::text as total
     FROM vendors WHERE event_id = $1`,
    [eventId]
  );
  const totalVendorContractAmount = parseFloat(vendorSum?.total ?? '0');

  return calculateBudgetSummary(
    items,
    transformedPayments,
    budgetCeiling,
    totalVendorContractAmount
  );
}

// Get category breakdown for an event
export async function getEventCategoryBreakdown(
  eventId: string
): Promise<CategoryBreakdown[]> {
  const items = await getBudgetItems(eventId);
  return calculateCategoryBreakdown(items);
}

// Sync budget items from placed assets in scene
export async function syncBudgetFromScene(
  eventId: string,
  sceneAssets: { assetId: string; quantity: number; priceOverride?: number }[]
): Promise<void> {
  // Remove existing asset-based budget items
  await query(
    `DELETE FROM budget_items WHERE event_id = $1`,
    [eventId]
  );

  // Aggregate assets by assetId, tracking quantity and price override
  const aggregated = new Map<string, { quantity: number; priceOverride?: number }>();
  
  sceneAssets.forEach((asset) => {
    const existing = aggregated.get(asset.assetId);
    if (existing) {
      existing.quantity += asset.quantity;
      // Keep price override if any asset has one
      if (asset.priceOverride !== undefined) {
        existing.priceOverride = asset.priceOverride;
      }
    } else {
      aggregated.set(asset.assetId, {
        quantity: asset.quantity,
        priceOverride: asset.priceOverride,
      });
    }
  });

  // Insert aggregated budget items
  for (const [assetId, data] of aggregated.entries()) {
    await query(
      `INSERT INTO budget_items (id, event_id, asset_id, quantity, unit_price_override)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, asset_id) DO UPDATE SET quantity = $4, unit_price_override = $5`,
      [uuidv4(), eventId, assetId, data.quantity, data.priceOverride || null]
    );
  }
}
