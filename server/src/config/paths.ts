import path from 'path';

/** Repo `client/public` — uploads and Vite public assets (from `server/src/config`). */
export const CLIENT_PUBLIC_ROOT = path.resolve(__dirname, '../../../client/public');

export const VENUE_UPLOADS_DIR = path.join(CLIENT_PUBLIC_ROOT, 'uploads', 'venues');

/** GLB venue décor models served at /models/ */
export const MODELS_PUBLIC_DIR = path.join(CLIENT_PUBLIC_ROOT, 'models');

/** Admin-uploaded asset thumbnails */
export const ASSET_THUMBNAILS_DIR = path.join(CLIENT_PUBLIC_ROOT, 'uploads', 'assets');
