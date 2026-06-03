// Inventory Routes - API endpoints for asset management and stock operations

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requirePlanner } from '../../middleware/requireRole';
import * as inventoryController from './inventory.controller';

const router = Router();

// ============ PUBLIC ASSET ROUTES (for editor) ============
// These need authentication but any role can access

router.use(authenticate);

// GET /api/inventory/assets - Get all active assets (for editor palette)
router.get('/assets', inventoryController.getAssets);

// GET /api/inventory/assets/category/:category - Get assets by category
router.get('/assets/category/:category', inventoryController.getAssetsByCategory);

// GET /api/inventory/assets/:assetId - Get single asset
router.get('/assets/:assetId', inventoryController.getAsset);

// ============ STOCK AVAILABILITY (for editor) ============

// GET /api/inventory/availability - Get all stock availability
router.get('/availability', inventoryController.getAllAvailability);

// GET /api/inventory/availability/:assetId - Get stock availability for an asset
router.get('/availability/:assetId', inventoryController.getAssetAvailability);

// GET /api/inventory/availability/:assetId/check - Fast stock check
router.get('/availability/:assetId/check', inventoryController.checkAvailability);

// ============ STOCK RESERVATIONS (for planner/editor) ============

// GET /api/inventory/events/:eventId/reservations - Get event reservations
router.get('/events/:eventId/reservations', requirePlanner, inventoryController.getEventReservations);

// POST /api/inventory/events/:eventId/reservations - Reserve stock
router.post('/events/:eventId/reservations', requirePlanner, inventoryController.reserveStock);

// DELETE /api/inventory/events/:eventId/reservations/:assetId - Release stock
router.delete(
  '/events/:eventId/reservations/:assetId',
  requirePlanner,
  inventoryController.releaseStock
);

// POST /api/inventory/events/:eventId/reservations/sync - Sync reservations from scene
router.post(
  '/events/:eventId/reservations/sync',
  requirePlanner,
  inventoryController.syncReservations
);

// ============ ADMIN ASSET MANAGEMENT ============

// POST /api/inventory/assets - Create asset (Admin only)
router.post('/assets', requireAdmin, inventoryController.createAsset);

// PUT /api/inventory/assets/:assetId - Update asset (Admin only)
router.put('/assets/:assetId', requireAdmin, inventoryController.updateAsset);

// DELETE /api/inventory/assets/:assetId - Delete asset (Admin only)
router.delete('/assets/:assetId', requireAdmin, inventoryController.deleteAsset);

export default router;
