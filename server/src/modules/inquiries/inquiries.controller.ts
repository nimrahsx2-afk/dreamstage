import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as inquiriesService from './inquiries.service';
import * as storageService from '../budget/storage.service';

const submitFieldsSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().max(255),
  eventType: z.string().min(1).max(100),
  eventDate: z.string().min(1).max(20),
  guestCount: z.coerce.number().int().min(1),
  venueType: z.string().min(1).max(100),
  hallPreference: z.string().max(255).optional().default(''),
  seatingStyle: z.string().min(1).max(100),
  seatingNotes: z.string().max(5000).optional().default(''),
  mealPreference: z.string().min(1).max(100),
  addons: z.array(z.string().min(1).max(255)).default([]),
  budgetRange: z.string().min(1).max(100),
  lightingPreference: z.string().min(1).max(100),
  decorationPreference: z.string().max(255).optional().default(''),
  specialRequests: z.string().max(5000).optional().default(''),
});

const plannerUpdateSchema = submitFieldsSchema
  .omit({ guestCount: true })
  .extend({
    guestCount: z.coerce.number().int().min(0).max(100000),
    inspirationImages: z.array(z.string().min(1).max(2048)).default([]),
  });

export const inquirySubmitUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
}).array('inspiration', 5);

function parseAddons(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string');
  if (typeof raw !== 'string') return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// POST /api/inquiries/generate-link
export async function generateLink(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const result = await inquiriesService.generateLink(user.id);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

// GET /api/inquiries
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const rows = await inquiriesService.listForPlanner(user.id);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// GET /api/inquiries/:token (public)
export async function getByToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const data = await inquiriesService.getByToken(token);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

// POST /api/inquiries/:token/submit (public, multipart)
export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];

    const parsedFields = submitFieldsSchema.safeParse({
      clientName: req.body.clientName,
      clientEmail: req.body.clientEmail,
      eventType: req.body.eventType,
      eventDate: req.body.eventDate,
      guestCount: req.body.guestCount,
      venueType: req.body.venueType,
      hallPreference: req.body.hallPreference,
      seatingStyle: req.body.seatingStyle,
      seatingNotes: req.body.seatingNotes,
      mealPreference: req.body.mealPreference,
      addons: parseAddons(req.body.addons),
      budgetRange: req.body.budgetRange,
      lightingPreference: req.body.lightingPreference,
      decorationPreference: req.body.decorationPreference,
      specialRequests: req.body.specialRequests,
    });

    if (!parsedFields.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form data',
        details: parsedFields.error.flatten().fieldErrors,
      });
    }

    const inspirationUrls: string[] = [];
    for (const f of files) {
      const up = await storageService.uploadInquiryImage(token, f.originalname, f.buffer, f.mimetype);
      if (!up.success) {
        return res.status(files.length && up.error === 'Storage not configured' ? 503 : 400).json({
          success: false,
          error: up.error || 'Image upload failed',
        });
      }
      inspirationUrls.push(up.fileUrl!);
    }

    await inquiriesService.submitForm(token, {
      ...parsedFields.data,
      inspirationImages: inspirationUrls,
    });

    res.json({ success: true, data: { message: 'Submitted' } });
  } catch (e) {
    next(e);
  }
}

const uuidParam = z.string().uuid();

// PUT /api/inquiries/:id
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const idParse = uuidParam.safeParse(req.params.id);
    if (!idParse.success) {
      return res.status(400).json({ success: false, error: 'Invalid inquiry id' });
    }

    const parsed = plannerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const user = req.user!;
    const row = await inquiriesService.updateInquiry(idParse.data, user.id, parsed.data);
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
}

// DELETE /api/inquiries/:id
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const idParse = uuidParam.safeParse(req.params.id);
    if (!idParse.success) {
      return res.status(400).json({ success: false, error: 'Invalid inquiry id' });
    }

    const user = req.user!;
    await inquiriesService.deleteInquiry(idParse.data, user.id);
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (e) {
    next(e);
  }
}
