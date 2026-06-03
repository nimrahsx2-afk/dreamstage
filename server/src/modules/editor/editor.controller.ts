// Editor Controller - HTTP handlers for scene operations

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as editorService from './editor.service';
import type { UserPayload } from '../auth/auth.types';

// Zod schemas for validation
const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const transformSchema = z.object({
  position: vector3Schema,
  rotation: vector3Schema,
  scale: vector3Schema,
});

const placedAssetSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  transform: transformSchema,
  unitPrice: z.number().min(0),
  priceOverride: z.number().min(0).optional(),
});

const lightingSchema = z.object({
  ambientIntensity: z.number().min(0).max(2),
  directionalIntensity: z.number().min(0).max(2),
  directionalPosition: vector3Schema,
});

const venueSchema = z.object({
  templateId: z.string(),
  floorSize: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
  }),
  wallHeight: z.number().positive(),
});

const sceneJsonSchema = z.object({
  version: z.number().int().positive(),
  placedAssets: z.array(placedAssetSchema),
  lighting: lightingSchema,
  venue: venueSchema,
  savedAt: z.string(),
});

const saveSceneSchema = z.object({
  sceneJson: sceneJsonSchema,
});

// GET /api/editor/:eventId/scene - Load scene for an event
export async function loadScene(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = req.user as UserPayload;

    // Verify event ownership for planners
    if (user.role === 'planner') {
      const isOwner = await editorService.verifyEventOwnership(eventId, user.id);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this event',
        });
      }
    }

    // Get event details
    const event = await editorService.getEventForEditor(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Get scene layout
    const scene = await editorService.getSceneLayout(eventId);

    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          budgetCeiling: event.budgetCeiling,
          venueTemplateId: event.venueTemplateId,
          status: event.status,
        },
        scene: scene || {
          sceneJson: null,
          isLocked: false,
          version: 0,
          lastSavedAt: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/editor/:eventId/scene - Save scene
export async function saveScene(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = req.user as UserPayload;

    // Verify event ownership
    const isOwner = await editorService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this event',
      });
    }

    // Validate input
    const parsed = saveSceneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scene data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    // Save scene
    const result = await editorService.saveSceneLayout(eventId, parsed.data.sceneJson);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message?.includes('locked')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
}

// POST /api/editor/:eventId/lock - Lock scene after approval
export async function lockSceneHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    await editorService.lockScene(eventId);

    res.json({
      success: true,
      message: 'Scene locked successfully',
    });
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('locked')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
}

// POST /api/editor/:eventId/unlock - Unlock scene (planner only)
export async function unlockSceneHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;
    const user = req.user as UserPayload;

    // Verify event ownership
    const isOwner = await editorService.verifyEventOwnership(eventId, user.id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this event',
      });
    }

    await editorService.unlockScene(eventId);

    res.json({
      success: true,
      message: 'Scene unlocked successfully',
    });
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('unlocked')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
}

// GET /api/editor/:eventId/status - Check scene lock status
export async function getSceneStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { eventId } = req.params;

    const isLocked = await editorService.isSceneLocked(eventId);
    const version = await editorService.getSceneVersion(eventId);

    res.json({
      success: true,
      data: {
        isLocked,
        version,
      },
    });
  } catch (error) {
    next(error);
  }
}
