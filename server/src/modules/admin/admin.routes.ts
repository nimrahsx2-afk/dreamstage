/**
 * Admin routes - all routes require authentication and admin role.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/requireRole';
import * as adminController from './admin.controller';
import { uploadVenueImagesMulter } from './venueUpload.middleware';
import { adminAssetUpload } from './assetUpload.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ===========================================
// Dashboard
// ===========================================

router.get('/stats', adminController.getAdminStats);
router.get('/budget-breakdown', adminController.getBudgetBreakdown);
router.get('/activity', adminController.getAdminActivity);

// ===========================================
// Venue Routes
// ===========================================

router.get('/venues', adminController.listVenues);
router.get('/venues/:id', adminController.getVenue);
router.post('/venues', adminController.createVenue);
router.post('/venues/:id/images', uploadVenueImagesMulter, adminController.uploadVenueImages);
router.patch('/venues/:id/toggle', adminController.toggleVenue);
router
  .route('/venues/:id')
  .put(adminController.updateVenue)
  .patch(adminController.patchVenue);
router.delete('/venues/:id', adminController.deleteVenue);

// ===========================================
// Asset Routes
// ===========================================

router.get('/assets', adminController.listAssets);
router.get('/assets/:id', adminController.getAsset);
router.post('/assets', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    adminAssetUpload(req, res, (err) => {
      if (err) return next(err);
      adminController.createAssetUpload(req, res, next);
    });
  } else {
    adminController.createAsset(req, res, next);
  }
});
router.put('/assets/:id', adminController.updateAsset);
router.patch('/assets/:id/stock', adminController.adjustStock);
router.patch('/assets/:id/toggle', adminController.toggleAsset);
router.patch('/assets/:id', adminController.patchAssetMetadata);
router.delete('/assets/:id', adminController.deleteAssetSoft);

// ===========================================
// Planner Routes
// ===========================================

router.get('/planners', adminController.listPlanners);
router.get('/planners/:id', adminController.getPlanner);
router.patch('/planners/:id/suspend', adminController.suspendPlanner);
router.patch('/planners/:id/status', adminController.togglePlanner);

export default router;
