import type { AssetCategory } from '../inventory/inventory.types';

/** Map legacy DB categories to editor palette categories. */
export function normalizeAssetCategory(raw: string): AssetCategory {
  const c = raw.toLowerCase().trim();
  const map: Record<string, AssetCategory> = {
    seating: 'seating',
    chairs: 'seating',
    chair: 'seating',
    tables: 'tables',
    table: 'tables',
    lighting: 'lighting',
    light: 'lighting',
    decor: 'decor',
    décor: 'decor',
    centerpieces: 'decor',
    linens: 'decor',
    staging: 'staging',
    backdrops: 'backdrops',
    backdrop: 'backdrops',
    other: 'other',
  };
  return map[c] ?? 'other';
}

/** Path passed to the client for useGLTF / preload (absolute path under site root). */
export function resolveModelRefForClient(
  modelRef: string | null | undefined,
  fileUrl: string | null | undefined
): string | null {
  const u = fileUrl?.trim();
  if (u) return u;
  const m = modelRef?.trim();
  if (!m) return null;
  if (m.startsWith('/')) return m;
  return `/models/${m}`;
}
