// 3D Editor Constants - Primitive shapes, colors, and configurations

import type { AssetCategory, LightingSettings, VenueSettings, Vector3 } from './editor.types';

// Asset category visual configuration
export interface PrimitiveConfig {
  shape: 'box' | 'sphere' | 'cylinder';
  color: string;
  hoverColor: string;
  dimensions: Vector3;
  emissiveIntensity?: number;
  opacity?: number;
}

export const ASSET_PRIMITIVES: Record<AssetCategory, Record<string, PrimitiveConfig>> = {
  seating: {
    chair: {
      shape: 'box',
      color: '#F4A7B9',
      hoverColor: '#F8C4D0',
      dimensions: { x: 0.5, y: 0.8, z: 0.5 },
    },
    sofa: {
      shape: 'box',
      color: '#F4A7B9',
      hoverColor: '#F8C4D0',
      dimensions: { x: 1.8, y: 0.7, z: 0.8 },
    },
  },
  tables: {
    round: {
      shape: 'box',
      color: '#E8735A',
      hoverColor: '#EE9480',
      dimensions: { x: 1.2, y: 0.75, z: 1.2 },
    },
    rectangular: {
      shape: 'box',
      color: '#E8735A',
      hoverColor: '#EE9480',
      dimensions: { x: 2.0, y: 0.75, z: 1.0 },
    },
    cocktail: {
      shape: 'box',
      color: '#E8735A',
      hoverColor: '#EE9480',
      dimensions: { x: 0.6, y: 1.1, z: 0.6 },
    },
  },
  lighting: {
    chandelier: {
      shape: 'sphere',
      color: '#F9E45B',
      hoverColor: '#FBF08A',
      dimensions: { x: 0.8, y: 0.8, z: 0.8 },
      emissiveIntensity: 0.5,
    },
    pendant: {
      shape: 'sphere',
      color: '#F9E45B',
      hoverColor: '#FBF08A',
      dimensions: { x: 0.4, y: 0.4, z: 0.4 },
      emissiveIntensity: 0.5,
    },
  },
  decor: {
    centerpiece: {
      shape: 'cylinder',
      color: '#4DB8A4',
      hoverColor: '#6DC9B8',
      dimensions: { x: 0.3, y: 0.4, z: 0.3 },
    },
    floral: {
      shape: 'cylinder',
      color: '#4DB8A4',
      hoverColor: '#6DC9B8',
      dimensions: { x: 0.25, y: 0.35, z: 0.25 },
    },
    vase: {
      shape: 'cylinder',
      color: '#4DB8A4',
      hoverColor: '#6DC9B8',
      dimensions: { x: 0.15, y: 0.5, z: 0.15 },
    },
  },
  staging: {
    platform: {
      shape: 'box',
      color: '#B8A9E8',
      hoverColor: '#CBBFEF',
      dimensions: { x: 4.0, y: 0.3, z: 3.0 },
    },
    riser: {
      shape: 'box',
      color: '#B8A9E8',
      hoverColor: '#CBBFEF',
      dimensions: { x: 2.0, y: 0.5, z: 2.0 },
    },
  },
  backdrops: {
    standard: {
      shape: 'box',
      color: '#87CEEB',
      hoverColor: '#A8DBF0',
      dimensions: { x: 4.0, y: 3.0, z: 0.1 },
      opacity: 0.85,
    },
    arch: {
      shape: 'box',
      color: '#87CEEB',
      hoverColor: '#A8DBF0',
      dimensions: { x: 3.0, y: 3.5, z: 0.1 },
      opacity: 0.85,
    },
  },
  other: {
    item: {
      shape: 'box',
      color: '#CCCCCC',
      hoverColor: '#DDDDDD',
      dimensions: { x: 1, y: 1, z: 1 },
    },
  },
};

// Default primitive config for unknown asset types
export const DEFAULT_PRIMITIVE: PrimitiveConfig = {
  shape: 'box',
  color: '#CCCCCC',
  hoverColor: '#DDDDDD',
  dimensions: { x: 1, y: 1, z: 1 },
};

// Selection outline color
export const SELECTION_OUTLINE_COLOR = '#FFD700';
export const SELECTION_OUTLINE_THICKNESS = 0.03;

/** Merged onto the venue floor mesh — raycast / transform logic must ignore it */
export const EDITOR_FLOOR_USERDATA = { isEditorFloor: true as const };

/** Banquet chair GLBs often use nested pivots / skinned meshes; root bbox mis-centers vs the table path */
export function isBanquetChairGlbPivotFix(assetName: string, modelRef: string | null | undefined): boolean {
  const n = assetName.toLowerCase();
  const m = (modelRef || '').toLowerCase();
  if (n.includes('banquet') && n.includes('chair')) return true;
  if (m.includes('banquet') && m.includes('chair')) return true;
  return false;
}

// Grid settings
export const GRID_SNAP_INCREMENT = 0.5;
export const GRID_SIZE = 20;
export const GRID_DIVISIONS = 40;

// Default venue settings
export const DEFAULT_VENUE: VenueSettings = {
  templateId: '',
  floorSize: { width: 20, depth: 30 },
  wallHeight: 4,
};

// Default lighting settings
export const DEFAULT_LIGHTING: LightingSettings = {
  ambientIntensity: 0.6,
  directionalIntensity: 0.8,
  directionalPosition: { x: 5, y: 10, z: 5 },
};

// Editor limits
export const UNDO_HISTORY_LIMIT = 50;
/** Debounced full scene save after any edit (place / move / rotate / delete / lighting / venue) */
export const SCENE_DEBOUNCED_SAVE_MS = 300;
/** @deprecated Prefer SCENE_DEBOUNCED_SAVE_MS — kept for any legacy references */
export const AUTO_SAVE_INTERVAL_MS = 60000;

/** Max wait for inventory + scene JSON + budget APIs before showing error / retry */
export const SCENE_DATA_LOAD_TIMEOUT_MS = 30_000;

/** Max wait for WebGL + GLTF Suspense after data is ready (large venue GLBs may need raising) */
export const SCENE_3D_LOAD_TIMEOUT_MS = 30_000;

/**
 * Fetch + GLTFLoader.parse in a Web Worker; main thread only rebuilds BufferGeometry.
 * Disable to fall back to drei GLTFLoader on the main thread.
 */
export const GLTF_WORKER_ENABLED = true;

/** Max parallel GLTF worker / main-thread loads (1 = sequential, 2 = limited parallel) */
export const GLTF_LOAD_MAX_CONCURRENCY = 1;

/** Pause between completed loads so GC can reclaim parse buffers (0 = idle callback only) */
export const GLTF_LOAD_YIELD_MS = 16;

// Camera settings
export const ORBIT_CAMERA_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 1000,
  position: { x: 3, y: 2, z: 26 } as Vector3,
  target: { x: 3, y: 1.0, z: 8 } as Vector3,
  minDistance: 1,
  maxDistance: 30,
  maxPolarAngle: Math.PI / 2 - 0.1,
};

export const WALKTHROUGH_CAMERA_CONFIG = {
  fov: 75,
  height: 1.7,
  moveSpeed: 5,
  lookSpeed: 0.1,
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  translate: 'g',
  rotate: 'r',
  scale: 's',
  delete: 'Delete',
  undo: 'z',
  redo: 'y',
} as const;

// Asset category display names
export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  seating: 'Seating',
  tables: 'Tables',
  lighting: 'Lighting',
  decor: 'Décor',
  staging: 'Staging',
  backdrops: 'Backdrops',
  other: 'Other',
};

// Floor and wall colors
export const VENUE_COLORS = {
  floor: '#E8E4DC',
  floorGrid: '#D0CCC4',
  walls: '#F5F2ED',
  wallEdge: '#D8D4CC',
};
