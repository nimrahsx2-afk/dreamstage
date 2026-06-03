/**
 * Admin controller - handles HTTP concerns for all admin endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as venuesService from './venues.service';
import type { UpdateVenueInput } from './admin.types';
import * as assetsService from './assets.service';
import * as catalogAssets from '../assets/assets.service';
import type { Asset } from '../inventory/inventory.types';
import * as plannersService from './planners.service';
import * as statsService from './admin.stats.service';
import * as activityService from './admin.activity.service';
// ===========================================
// Validation Schemas
// ===========================================

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

function queryFlagTrue(value: unknown): boolean {
  if (value === true || value === 'true' || value === 'all') return true;
  if (Array.isArray(value)) return value.some((v) => v === 'true' || v === 'all');
  return false;
}

const createVenueSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  capacity: z.number().int().positive('Capacity must be positive'),
  description: z.string().optional(),
  thumbnailUrl: z.string().max(2048).optional(),
  modelRef: z.string().max(500).optional(),
  glbModelUrl: z.string().max(500).optional().nullable(),
  pricePerHead: z.coerce.number().nonnegative().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  galleryImages: z.array(z.string().max(2048)).max(24).optional(),
  videoUrl: z.string().max(500).optional().nullable(),
});

/** Shared body for PUT and PATCH /venues/:id */
const updateVenueSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().max(2048).nullable().optional(),
  modelRef: z.string().max(500).nullable().optional(),
  glbModelUrl: z.string().max(500).nullable().optional(),
  pricePerHead: z.coerce.number().nonnegative().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  galleryImages: z.array(z.string().max(2048)).max(50).optional(),
  videoUrl: z.string().max(500).nullable().optional(),
});

const createAssetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  defaultUnitPrice: z.number().nonnegative('Price cannot be negative'),
  stockQuantity: z.number().int().nonnegative('Stock cannot be negative'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  modelRef: z.string().optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  defaultUnitPrice: z.number().nonnegative().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  modelRef: z.string().nullable().optional(),
});

const stockAdjustmentSchema = z.object({
  delta: z.number().int('Delta must be an integer'),
});

const uuidSchema = z.string().uuid('Invalid ID format');

const assetUploadBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  price_per_unit: z.coerce.number().nonnegative().optional().default(0),
});

const patchAssetMetadataSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(1).optional(),
  price_per_unit: z.coerce.number().nonnegative().optional(),
});

function assetToAdminPayload(asset: Asset) {
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    defaultUnitPrice: asset.defaultUnitPrice,
    stockQuantity: asset.stockQuantity,
    description: asset.description,
    thumbnailUrl: asset.thumbnailUrl,
    modelRef: asset.modelRef,
    isActive: asset.isActive,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// ===========================================
// Dashboard stats & activity
// ===========================================

/**
 * GET /api/admin/stats
 */
export async function getAdminStats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getAdminStats();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/activity
 */
export async function getAdminActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await activityService.getRecentActivity(15);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/budget-breakdown
 */
export async function getBudgetBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getBudgetBreakdown();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ===========================================
// Venue Controllers
// ===========================================

/**
 * GET /api/admin/venues
 */
export async function listVenues(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query.flat === 'true' || req.query.all === 'true') {
      const raw = parseInt(String(req.query.limit ?? '200'), 10);
      const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 500) : 200;
      const data = await venuesService.getVenuesFlat(limit);
      return res.json({ success: true, data });
    }

    const pagination = paginationSchema.parse(req.query);
    const result = await venuesService.getAllVenues(pagination);

    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }
    next(error);
  }
}

/**
 * GET /api/admin/venues/:id
 */
export async function getVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const venue = await venuesService.getVenueById(id);

    res.json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid venue ID' });
    }
    next(error);
  }
}

/**
 * POST /api/admin/venues
 */
export async function createVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createVenueSchema.parse(req.body);
    const input = {
      name: parsed.name,
      category: parsed.category,
      capacity: parsed.capacity,
      description: parsed.description,
      thumbnailUrl: parsed.thumbnailUrl ?? parsed.galleryImages?.[0],
      modelRef: parsed.modelRef ?? parsed.glbModelUrl ?? undefined,
      pricePerHead: parsed.pricePerHead ?? undefined,
      location: parsed.location ?? undefined,
      galleryImages: parsed.galleryImages,
      videoUrl: parsed.videoUrl ?? undefined,
    };
    const venue = await venuesService.createVenue(input);

    res.status(201).json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

function mapUpdateVenueBody(parsed: z.infer<typeof updateVenueSchema>): UpdateVenueInput {
  const out: UpdateVenueInput = {};
  if (parsed.name !== undefined) out.name = parsed.name;
  if (parsed.category !== undefined) out.category = parsed.category;
  if (parsed.capacity !== undefined) out.capacity = parsed.capacity;
  if (parsed.description !== undefined) out.description = parsed.description;
  if (parsed.thumbnailUrl !== undefined) out.thumbnailUrl = parsed.thumbnailUrl;
  if (parsed.modelRef !== undefined || parsed.glbModelUrl !== undefined) {
    out.modelRef = parsed.modelRef ?? parsed.glbModelUrl ?? null;
  }
  if (parsed.pricePerHead !== undefined) out.pricePerHead = parsed.pricePerHead;
  if (parsed.location !== undefined) out.location = parsed.location;
  if (parsed.galleryImages !== undefined) out.galleryImages = parsed.galleryImages;
  if (parsed.videoUrl !== undefined) out.videoUrl = parsed.videoUrl;
  return out;
}

/**
 * PUT /api/admin/venues/:id
 */
export async function updateVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const parsed = updateVenueSchema.parse(req.body);
    const venue = await venuesService.updateVenue(id, mapUpdateVenueBody(parsed));

    res.json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

/** PATCH /api/admin/venues/:id — same body rules as PUT */
export const patchVenue = updateVenue;

/**
 * POST /api/admin/venues/:id/images — multipart field "images"
 */
export async function uploadVenueImages(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      return res.status(400).json({ success: false, error: 'No image files provided' });
    }
    const basenames = files.map((f) => f.filename);
    const venue = await venuesService.appendVenueImages(id, basenames);
    res.json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid venue ID' });
    }
    next(error);
  }
}

/**
 * PATCH /api/admin/venues/:id/toggle
 */
export async function toggleVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const venue = await venuesService.toggleVenueActive(id);

    res.json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid venue ID' });
    }
    next(error);
  }
}

/**
 * DELETE /api/admin/venues/:id
 */
export async function deleteVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    await venuesService.deleteVenue(id);

    res.json({ success: true, message: 'Venue deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid venue ID' });
    }
    next(error);
  }
}

// ===========================================
// Asset Controllers
// ===========================================

/**
 * GET /api/admin/assets
 */
export async function listAssets(req: Request, res: Response, next: NextFunction) {
  try {
    if (queryFlagTrue(req.query.flat) || queryFlagTrue(req.query.all)) {
      // Flat inventory list: exclude soft-deleted unless ?all=true (audit / full export).
      const activeOnly =
        queryFlagTrue(req.query.flat) && !queryFlagTrue(req.query.all);
      const data = await catalogAssets.getAllAssetsOrdered(activeOnly);
      return res.json({ success: true, data: data.map(assetToAdminPayload) });
    }

    const pagination = paginationSchema.parse(req.query);
    const filters = {
      category: req.query.category as string | undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string | undefined,
    };

    const result = await assetsService.getAllAssets(filters, pagination);

    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }
    next(error);
  }
}

/**
 * GET /api/admin/assets/:id
 */
export async function getAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const asset = await assetsService.getAssetById(id);

    res.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    next(error);
  }
}

/**
 * POST /api/admin/assets
 */
export async function createAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAssetSchema.parse(req.body);
    const asset = await assetsService.createAsset(input);

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

/**
 * POST /api/admin/assets (multipart) — GLB + optional thumbnail
 */
export async function createAssetUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as
      | { model?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] }
      | undefined;
    const model = files?.model?.[0];
    if (!model) {
      return res.status(400).json({ success: false, error: 'GLB model file is required' });
    }

    const parsed = assetUploadBodySchema.parse(req.body);
    const thumb = files?.thumbnail?.[0];
    const thumbnailUrl = thumb ? `/uploads/assets/${thumb.filename}` : null;

    const asset = await catalogAssets.insertAssetUploaded({
      name: parsed.name,
      category: parsed.category,
      modelFileName: model.filename,
      thumbnailUrl,
      pricePerUnit: parsed.price_per_unit,
    });

    res.status(201).json({ success: true, data: assetToAdminPayload(asset) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/admin/assets/:id — metadata only (name, category, price)
 */
export async function patchAssetMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const body = patchAssetMetadataSchema.parse(req.body);
    const asset = await catalogAssets.updateAssetMetadata(id, {
      name: body.name,
      category: body.category,
      pricePerUnit: body.price_per_unit,
    });
    res.json({ success: true, data: assetToAdminPayload(asset) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/admin/assets/:id — soft delete
 */
export async function deleteAssetSoft(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    await catalogAssets.softDeleteAsset(id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    next(error);
  }
}

/**
 * PUT /api/admin/assets/:id
 */
export async function updateAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const input = updateAssetSchema.parse(req.body);
    const asset = await assetsService.updateAsset(id, input);

    res.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/admin/assets/:id/stock
 */
export async function adjustStock(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const { delta } = stockAdjustmentSchema.parse(req.body);
    const asset = await assetsService.adjustStock(id, delta);

    res.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/admin/assets/:id/toggle
 */
export async function toggleAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const asset = await assetsService.toggleAssetActive(id);

    res.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    next(error);
  }
}

// ===========================================
// Planner Controllers
// ===========================================

/**
 * GET /api/admin/planners
 */
export async function listPlanners(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query.flat === 'true' || req.query.all === 'true') {
      const data = await plannersService.getPlannersFlat(500);
      return res.json({ success: true, data });
    }

    const pagination = paginationSchema.parse(req.query);
    const result = await plannersService.getAllPlanners(pagination);

    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }
    next(error);
  }
}

/**
 * GET /api/admin/planners/:id
 */
export async function getPlanner(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const planner = await plannersService.getPlannerById(id);

    res.json({ success: true, data: planner });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid planner ID' });
    }
    next(error);
  }
}

/**
 * PATCH /api/admin/planners/:id/status
 */
export async function togglePlanner(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const planner = await plannersService.togglePlannerStatus(id);

    res.json({ success: true, data: planner });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid planner ID' });
    }
    next(error);
  }
}

/** PATCH /api/admin/planners/:id/suspend — alias of status toggle */
export const suspendPlanner = togglePlanner;
