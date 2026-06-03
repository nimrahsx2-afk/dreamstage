// Editor Module Types

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

export interface PlacedAsset {
  id: string;
  assetId: string;
  name: string;
  category: string;
  transform: Transform;
  unitPrice: number;
  priceOverride?: number;
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

export interface SceneJson {
  version: number;
  placedAssets: PlacedAsset[];
  lighting: LightingSettings;
  venue: VenueSettings;
  savedAt: string;
}

export interface SaveSceneInput {
  sceneJson: SceneJson;
}

export interface SceneLayoutRow {
  id: string;
  event_id: string;
  scene_json: SceneJson;
  version: number;
  locked: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoadSceneResponse {
  sceneJson: SceneJson;
  isLocked: boolean;
  version: number;
  lastSavedAt: string | null;
}

export interface SaveSceneResponse {
  success: boolean;
  version: number;
  savedAt: string;
}
