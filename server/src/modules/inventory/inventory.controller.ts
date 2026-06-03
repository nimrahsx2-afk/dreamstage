// Inventory Controller - HTTP handlers for asset management and stock operations

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as inventoryService from './inventory.service';
import { isValidUUID } from '../../utils/validation';
import type { AssetCategory } from './inventory.types';

const ASSET_CATEGORIES: AssetCategory[] = [
  'seating',
  'tables',
  'lighting',
  'decor',
  'staging',
  'backdrops',
  'other',
];

// Zod schemas
const assetInputSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['seating', 'tables', 'lighting', 'decor', 'staging', 'backdrops', 'other']),
  defaultUnitPrice: z.number().min(0),
  stockQuantity: z.number().int().min(0),
  modelRef: z.string().max(500).optional(),
  thumbnailUrl: z.string().url().max(500).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

const assetUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z
    .enum(['seating', 'tables', 'lighting', 'decor', 'staging', 'backdrops', 'other'])
    .optional(),
  defaultUnitPrice: z.number().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  modelRef: z.string().max(500).nullable().optional(),
  thumbnailUrl: z.string().url().max(500).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

const reserveStockSchema = z.object({
  assetId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const syncReservationsSchema = z.object({
  placedAssets: z.array(
    z.object({
      assetId: z.string().uuid(),
      quantity: z.number().int().min(1),
    })
  ),
});

// ============ ASSET CRUD (Admin) ============

// GET /api/inventory/assets - Get all assets
export async function getAssets(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('[Inventory] GET /assets - fetching assets');
    const activeOnly = req.query.activeOnly !== 'false';
    const assets = await inventoryService.getAssets(activeOnly);
    console.log(`[Inventory] Found ${assets.length} assets`);

    res.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    console.error('[Inventory] Error fetching assets:', error);
    next(error);
  }
}

// GET /api/inventory/assets/category/:category - Get assets by category
export async function getAssetsByCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { category } = req.params;

    if (!ASSET_CATEGORIES.includes(category as AssetCategory)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${ASSET_CATEGORIES.join(', ')}`,
      });
    }

    const assets = await inventoryService.getAssetsByCategory(category as AssetCategory);

    res.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/inventory/assets/:assetId - Get single asset
export async function getAsset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assetId } = req.params;

    if (!isValidUUID(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format',
      });
    }

    const asset = await inventoryService.getAsset(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/inventory/assets - Create asset (Admin only)
export async function createAsset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = assetInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const asset = await inventoryService.createAsset(parsed.data);

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/inventory/assets/:assetId - Update asset (Admin only)
export async function updateAsset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assetId } = req.params;

    if (!isValidUUID(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format',
      });
    }

    const parsed = assetUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const asset = await inventoryService.updateAsset(assetId, parsed.data);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/inventory/assets/:assetId - Delete asset (Admin only, soft delete)
export async function deleteAsset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assetId } = req.params;

    if (!isValidUUID(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format',
      });
    }

    const deleted = await inventoryService.deleteAsset(assetId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    res.json({
      success: true,
      message: 'Asset deactivated',
    });
  } catch (error) {
    next(error);
  }
}

// ============ STOCK AVAILABILITY ============

// GET /api/inventory/availability - Get all stock availability
export async function getAllAvailability(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('[Inventory] GET /availability - fetching stock availability');
    const availability = await inventoryService.getAllStockAvailability();
    console.log(`[Inventory] Found availability for ${availability.length} assets`);

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('[Inventory] Error fetching availability:', error);
    next(error);
  }
}

// GET /api/inventory/availability/:assetId - Get stock availability for an asset
export async function getAssetAvailability(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assetId } = req.params;

    if (!isValidUUID(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format',
      });
    }

    const availability = await inventoryService.getAssetStockAvailability(assetId);

    if (!availability) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/inventory/availability/:assetId/check - Fast stock check
export async function checkAvailability(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assetId } = req.params;
    const quantity = parseInt(req.query.quantity as string) || 1;

    if (!isValidUUID(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format',
      });
    }

    const result = await inventoryService.checkStockAvailable(assetId, quantity);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============ STOCK RESERVATIONS ============

// GET /api/inventory/events/:eventId/reservations - Get event reservations
export async function getEventReservations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const reservations = await inventoryService.getEventReservations(eventId);

    res.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/inventory/events/:eventId/reservations - Reserve stock
export async function reserveStock(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const parsed = reserveStockSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await inventoryService.reserveStock(eventId, parsed.data);

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: result.error,
        data: {
          assetId: result.assetId,
          availableAfter: result.availableAfter,
        },
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/inventory/events/:eventId/reservations/:assetId - Release stock
export async function releaseStock(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, assetId } = req.params;
    const quantity = req.query.quantity ? parseInt(req.query.quantity as string) : undefined;

    if (!isValidUUID(eventId) || !isValidUUID(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    const result = await inventoryService.releaseStock(eventId, assetId, quantity);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/inventory/events/:eventId/reservations/sync - Sync reservations from scene
export async function syncReservations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const parsed = syncReservationsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await inventoryService.syncReservationsFromScene(
      eventId,
      parsed.data.placedAssets
    );

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: 'Some reservations failed',
        data: { errors: result.errors },
      });
    }

    res.json({
      success: true,
      message: 'Reservations synced successfully',
    });
  } catch (error) {
    next(error);
  }
}
