// Budget Controller - HTTP handlers for budget, vendor, and payment endpoints

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as budgetService from './budget.service';
import * as vendorService from './vendor.service';
import * as storageService from './storage.service';
import { isValidUUID } from '../../utils/validation';
import type { UserPayload } from '../auth/auth.types';

// Helper to validate UUID params
function validateEventId(res: Response, eventId: string): boolean {
  if (!isValidUUID(eventId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid event ID format',
    });
    return false;
  }
  return true;
}

// ============ ZOD SCHEMAS ============

const budgetItemSchema = z.object({
  assetId: z.string().uuid().optional(),
  description: z.string().min(1).max(255),
  category: z.string().min(1).max(50),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  unitPriceOverride: z.number().min(0).optional(),
  vendorId: z.string().uuid().optional(),
});

const budgetItemUpdateSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(50).optional(),
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().min(0).optional(),
  unitPriceOverride: z.number().min(0).nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
});

const vendorSchema = z.object({
  name: z.string().min(1).max(100),
  company: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  category: z.string().min(1).max(50),
  totalContractAmount: z.number().min(1, 'Total Contract Amount is required and must be at least Rs. 1'),
  notes: z.string().max(500).optional(),
});

const vendorUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  company: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  category: z.string().min(1).max(50).optional(),
  totalContractAmount: z.number().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['deposit', 'final']),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(255).optional(),
});

// ============ BUDGET ITEMS ============

// GET /api/budget/:eventId/items
export async function getBudgetItems(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    if (!validateEventId(res, eventId)) return;

    const items = await budgetService.getBudgetItems(eventId);

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/budget/:eventId/items
export async function createBudgetItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    
    const parsed = budgetItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid budget item data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const item = await budgetService.createBudgetItem(eventId, parsed.data);

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/budget/:eventId/items/:itemId
export async function updateBudgetItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { itemId } = req.params;

    const parsed = budgetItemUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const item = await budgetService.updateBudgetItem(itemId, parsed.data);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Budget item not found',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/budget/:eventId/items/:itemId
export async function deleteBudgetItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { itemId } = req.params;

    const deleted = await budgetService.deleteBudgetItem(itemId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Budget item not found',
      });
    }

    res.json({
      success: true,
      message: 'Budget item deleted',
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/budget/:eventId/summary
export async function getBudgetSummary(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    if (!validateEventId(res, eventId)) return;

    const summary = await budgetService.getEventBudgetSummary(eventId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/events/:eventId/budget/sync-from-saved-scene - Sync budget from saved scene in DB
export async function syncFromSavedScene(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    if (!validateEventId(res, eventId)) return;

    const { getSceneLayout } = await import('../editor/editor.service');
    const layout = await getSceneLayout(eventId);

    const placedAssets = layout?.sceneJson?.placedAssets ?? [];
    const sceneAssets = placedAssets.map((a) => ({
      assetId: a.assetId,
      quantity: 1,
      priceOverride: a.priceOverride,
    }));

    await budgetService.syncBudgetFromScene(eventId, sceneAssets);

    res.json({
      success: true,
      message: 'Budget synced from saved scene',
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/events/:eventId/budget/sync-from-scene - Sync budget from 3D scene placed assets (client provides)
export async function syncFromScene(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    const schema = z.object({
      placedAssets: z.array(z.object({
        assetId: z.string().uuid(),
        quantity: z.number().int().positive().optional().default(1),
        priceOverride: z.number().min(0).optional(),
      })).default([]),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const sceneAssets = parsed.data.placedAssets.map((a) => ({
      assetId: a.assetId,
      quantity: a.quantity ?? 1,
      priceOverride: a.priceOverride,
    }));

    await budgetService.syncBudgetFromScene(eventId, sceneAssets);

    res.json({
      success: true,
      message: 'Budget synced from scene',
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/budget/:eventId/breakdown
export async function getCategoryBreakdown(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    if (!validateEventId(res, eventId)) return;
    const breakdown = await budgetService.getEventCategoryBreakdown(eventId);

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
}

// ============ VENDORS ============

// GET /api/budget/:eventId/vendors
export async function getVendors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    if (!validateEventId(res, eventId)) return;

    const vendors = await vendorService.getEventVendors(eventId);

    res.json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/budget/:eventId/vendors
export async function createVendor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    const parsed = vendorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vendor data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    // Clean empty email
    const input = { ...parsed.data };
    if (input.email === '') {
      input.email = undefined;
    }

    const vendor = await vendorService.createVendor(eventId, input);

    res.status(201).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/budget/:eventId/vendors/:vendorId
export async function updateVendor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, vendorId } = req.params;

    // Verify vendor belongs to event
    const belongs = await vendorService.verifyVendorOwnership(vendorId, eventId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const parsed = vendorUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const vendor = await vendorService.updateVendor(vendorId, parsed.data);

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/budget/:eventId/vendors/:vendorId
export async function deleteVendor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, vendorId } = req.params;

    const belongs = await vendorService.verifyVendorOwnership(vendorId, eventId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    await vendorService.deleteVendor(vendorId);

    res.json({
      success: true,
      message: 'Vendor deleted',
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/budget/:eventId/vendors/summaries
export async function getVendorSummaries(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    if (!validateEventId(res, eventId)) return;

    const summaries = await vendorService.getEventVendorSummaries(eventId);

    res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
}

// ============ VENDOR PAYMENTS ============

// GET /api/budget/:eventId/vendors/:vendorId/payments
export async function getVendorPayments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, vendorId } = req.params;

    const belongs = await vendorService.verifyVendorOwnership(vendorId, eventId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const payments = await vendorService.getVendorPayments(vendorId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/budget/:eventId/vendors/:vendorId/payments
export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, vendorId } = req.params;

    const belongs = await vendorService.verifyVendorOwnership(vendorId, eventId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const payment = await vendorService.createVendorPayment(vendorId, {
      ...parsed.data,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/budget/:eventId/vendors/:vendorId/payments/:paymentId
export async function deletePayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { paymentId } = req.params;

    const deleted = await vendorService.deleteVendorPayment(paymentId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted',
    });
  } catch (error) {
    next(error);
  }
}

// ============ VENDOR QUOTES (PDF UPLOADS) ============

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadMiddleware = upload.single('file');

// GET /api/budget/:eventId/vendors/:vendorId/quotes
export async function getVendorQuotes(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, vendorId } = req.params;

    const belongs = await vendorService.verifyVendorOwnership(vendorId, eventId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const quotes = await vendorService.getVendorQuotes(vendorId);

    res.json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/budget/:eventId/vendors/:vendorId/quotes
export async function uploadQuote(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId, vendorId } = req.params;

    const belongs = await vendorService.verifyVendorOwnership(vendorId, eventId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { originalname, buffer, mimetype } = req.file;

    // Upload to Firebase Storage
    const uploadResult = await storageService.uploadVendorQuote(
      vendorId,
      originalname,
      buffer,
      mimetype
    );

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        error: uploadResult.error || 'Upload failed',
      });
    }

    // Save quote record to database
    const quote = await vendorService.createVendorQuote(
      vendorId,
      uploadResult.fileName!,
      uploadResult.fileUrl!,
      uploadResult.fileSize!
    );

    res.status(201).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/budget/:eventId/vendors/:vendorId/quotes/:quoteId
export async function deleteQuote(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { quoteId } = req.params;

    // Get quote to find file URL
    const quotes = await vendorService.getVendorQuotes(req.params.vendorId);
    const quote = quotes.find((q) => q.id === quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
      });
    }

    // Delete from storage
    await storageService.deleteVendorQuoteFile(quote.fileUrl);

    // Delete from database
    await vendorService.deleteVendorQuote(quoteId);

    res.json({
      success: true,
      message: 'Quote deleted',
    });
  } catch (error) {
    next(error);
  }
}
