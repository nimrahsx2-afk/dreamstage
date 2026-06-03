import { Request, Response, NextFunction } from 'express';
import * as assetsService from './assets.service';

/**
 * GET /api/assets — active catalog for editor (no JWT).
 */
export async function listActiveAssets(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await assetsService.getActiveAssets();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
