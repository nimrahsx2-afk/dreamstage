import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { MODELS_PUBLIC_DIR, ASSET_THUMBNAILS_DIR } from '../../config/paths';

fs.mkdirSync(MODELS_PUBLIC_DIR, { recursive: true });
fs.mkdirSync(ASSET_THUMBNAILS_DIR, { recursive: true });

const combinedStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'model') {
      cb(null, MODELS_PUBLIC_DIR);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, ASSET_THUMBNAILS_DIR);
    } else {
      cb(new Error('Unexpected field'), '');
    }
  },
  filename: (_req, file, cb) => {
    if (file.fieldname === 'model') {
      cb(null, `${randomUUID()}.glb`);
    } else {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      const safe = allowed.includes(ext) ? ext : '.jpg';
      cb(null, `${randomUUID()}${safe}`);
    }
  },
});

const upload = multer({
  storage: combinedStorage,
  limits: { fileSize: 45 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'model') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.glb') {
        cb(new Error('Only .glb model files are allowed'));
        return;
      }
      cb(null, true);
      return;
    }
    if (file.fieldname === 'thumbnail') {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) {
        cb(new Error('Thumbnail must be JPG, PNG, or WEBP'));
        return;
      }
      cb(null, true);
      return;
    }
    cb(new Error('Unexpected field'));
  },
});

/** multipart: fields `model` (required .glb), `thumbnail` (optional image) */
export const adminAssetUpload = upload.fields([
  { name: 'model', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);
