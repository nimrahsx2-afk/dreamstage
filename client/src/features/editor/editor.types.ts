// 3D Editor TypeScript Types

export type TransformMode = 'translate' | 'rotate' | 'scale';

export type ViewMode = 'orbit' | 'walkthrough';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  locked?: boolean;
}

export interface PlacedAssetData {
  id: string;
  assetId: string;
  name: string;
  category: AssetCategory;
  transform: Transform;
  unitPrice: number;
  priceOverride?: number;
  /** GLB path: basename (TABLE.glb) or absolute (/models/....glb) for useGLTF */
  modelRef?: string | null;
  parentId?: string | null;
}

export type AssetCategory =
  | 'seating'
  | 'tables'
  | 'lighting'
  | 'decor'
  | 'staging'
  | 'backdrops'
  | 'other';

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  defaultUnitPrice: number;
  stockQuantity: number;
  modelRef: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
}

export interface SceneState {
  placedAssets: PlacedAssetData[];
  lighting: LightingSettings;
  venue: VenueSettings;
}

export interface LightingSettings {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: Vector3;
}

export interface VenueSettings {
  templateId: string;
  floorSize: { width: number; depth: number };
  wallHeight: number;
}

export interface EditorHistoryEntry {
  placedAssets: PlacedAssetData[];
  timestamp: number;
}

export interface EditorState {
  // Scene data
  placedAssets: PlacedAssetData[];
  lighting: LightingSettings;
  venue: VenueSettings;

  // Selection & interaction
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  transformMode: TransformMode;
  viewMode: ViewMode;
  isShiftHeld: boolean;

  // Undo/redo
  history: EditorHistoryEntry[];
  historyIndex: number;

  // Status
  isDirty: boolean;
  isLocked: boolean;
  lastSavedAt: Date | null;

  // Event context
  eventId: string | null;
}

export interface SceneJson {
  version: number;
  placedAssets: PlacedAssetData[];
  lighting: LightingSettings;
  venue: VenueSettings;
  savedAt: string;
}

// API response types
export interface SaveSceneResponse {
  success: boolean;
  version: number;
  savedAt: string;
}

export interface LoadSceneResponse {
  sceneJson: SceneJson;
  isLocked: boolean;
  version: number;
}
