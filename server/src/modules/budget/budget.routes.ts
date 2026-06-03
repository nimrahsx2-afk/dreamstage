// Budget Routes - Nested under /api/events/:eventId/budget

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePlanner } from '../../middleware/requireRole';
import * as budgetController from './budget.controller';

const router = Router();

// All routes require authentication and planner role
router.use(authenticate);
router.use(requirePlanner);

// ============ BUDGET SUMMARY ============

// GET /api/events/:eventId/budget/summary - Get budget summary
router.get('/:eventId/budget/summary', budgetController.getBudgetSummary);

// POST /api/events/:eventId/budget/sync-from-scene - Sync budget from 3D scene (client payload)
router.post('/:eventId/budget/sync-from-scene', budgetController.syncFromScene);

// POST /api/events/:eventId/budget/sync-from-saved-scene - Sync budget from saved scene in DB
router.post('/:eventId/budget/sync-from-saved-scene', budgetController.syncFromSavedScene);

// GET /api/events/:eventId/budget/breakdown - Get category breakdown
router.get('/:eventId/budget/breakdown', budgetController.getCategoryBreakdown);

// ============ BUDGET ITEMS ============

// GET /api/events/:eventId/budget/items - Get all budget items
router.get('/:eventId/budget/items', budgetController.getBudgetItems);

// POST /api/events/:eventId/budget/items - Create budget item
router.post('/:eventId/budget/items', budgetController.createBudgetItem);

// PUT /api/events/:eventId/budget/items/:itemId - Update budget item
router.put('/:eventId/budget/items/:itemId', budgetController.updateBudgetItem);

// DELETE /api/events/:eventId/budget/items/:itemId - Delete budget item
router.delete('/:eventId/budget/items/:itemId', budgetController.deleteBudgetItem);

// ============ VENDORS ============

// GET /api/events/:eventId/budget/vendors - Get all vendors
router.get('/:eventId/budget/vendors', budgetController.getVendors);

// POST /api/events/:eventId/budget/vendors - Create vendor
router.post('/:eventId/budget/vendors', budgetController.createVendor);

// PUT /api/events/:eventId/budget/vendors/:vendorId - Update vendor
router.put('/:eventId/budget/vendors/:vendorId', budgetController.updateVendor);

// DELETE /api/events/:eventId/budget/vendors/:vendorId - Delete vendor
router.delete('/:eventId/budget/vendors/:vendorId', budgetController.deleteVendor);

// GET /api/events/:eventId/budget/vendors/summaries - Get vendor summaries with payment status
router.get('/:eventId/budget/vendors/summaries', budgetController.getVendorSummaries);

// ============ VENDOR PAYMENTS ============

// GET /api/events/:eventId/budget/vendors/:vendorId/payments - Get vendor payments
router.get(
  '/:eventId/budget/vendors/:vendorId/payments',
  budgetController.getVendorPayments
);

// POST /api/events/:eventId/budget/vendors/:vendorId/payments - Create payment
router.post(
  '/:eventId/budget/vendors/:vendorId/payments',
  budgetController.createPayment
);

// DELETE /api/events/:eventId/budget/vendors/:vendorId/payments/:paymentId - Delete payment
router.delete(
  '/:eventId/budget/vendors/:vendorId/payments/:paymentId',
  budgetController.deletePayment
);

// ============ VENDOR QUOTES (PDF UPLOADS) ============

// GET /api/events/:eventId/budget/vendors/:vendorId/quotes - Get vendor quotes
router.get(
  '/:eventId/budget/vendors/:vendorId/quotes',
  budgetController.getVendorQuotes
);

// POST /api/events/:eventId/budget/vendors/:vendorId/quotes - Upload quote
router.post(
  '/:eventId/budget/vendors/:vendorId/quotes',
  budgetController.uploadMiddleware,
  budgetController.uploadQuote
);

// DELETE /api/events/:eventId/budget/vendors/:vendorId/quotes/:quoteId - Delete quote
router.delete(
  '/:eventId/budget/vendors/:vendorId/quotes/:quoteId',
  budgetController.deleteQuote
);

export default router;
