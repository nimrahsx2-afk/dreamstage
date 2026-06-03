import { Router } from 'express';
import * as assetsController from '../modules/assets/assets.controller';

const router = Router();

router.get('/assets', assetsController.listActiveAssets);

export default router;
