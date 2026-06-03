// Scene Serializer - Convert scene state to/from JSON for persistence

import type {
  SceneJson,
  PlacedAssetData,
  LightingSettings,
  VenueSettings,
} from '../editor.types';

const SCENE_VERSION = 1;

export function isValidPlacedAssetRow(asset: unknown): boolean {
  if (!asset || typeof asset !== 'object') return false;
  const a = asset as Record<string, unknown>;
  const t = a.transform as Record<string, unknown> | undefined;
  if (!t || typeof t !== 'object') return false;
  const pos = t.position as Record<string, unknown> | undefined;
  const rot = t.rotation as Record<string, unknown> | undefined;
  const scl = t.scale as Record<string, unknown> | undefined;
  return (
    (typeof a.unitPrice === 'number' || a.unitPrice === undefined) &&
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    typeof a.assetId === 'string' &&
    a.assetId.length > 0 &&
    typeof a.name === 'string' &&
    typeof a.category === 'string' &&
    pos != null &&
    typeof pos.x === 'number' &&
    typeof pos.y === 'number' &&
    typeof pos.z === 'number' &&
    rot != null &&
    typeof rot.x === 'number' &&
    typeof rot.y === 'number' &&
    typeof rot.z === 'number' &&
    scl != null &&
    typeof scl.x === 'number' &&
    typeof scl.y === 'number' &&
    typeof scl.z === 'number'
  );
}

// Serialize scene state to JSON for saving
export function serializeScene(
  placedAssets: PlacedAssetData[],
  lighting: LightingSettings,
  venue: VenueSettings
): SceneJson {
  return {
    version: SCENE_VERSION,
    placedAssets: placedAssets.map((asset) => ({
      id: asset.id,
      assetId: asset.assetId,
      name: asset.name,
      category: asset.category,
      transform: {
        position: { ...asset.transform.position },
        rotation: { ...asset.transform.rotation },
        scale: { ...asset.transform.scale },
      },
      unitPrice: asset.unitPrice,
      priceOverride: asset.priceOverride,
      modelRef: asset.modelRef ?? undefined,
    })),
    lighting: {
      ambientIntensity: lighting.ambientIntensity,
      directionalIntensity: lighting.directionalIntensity,
      directionalPosition: { ...lighting.directionalPosition },
    },
    venue: {
      templateId: venue.templateId,
      floorSize: { ...venue.floorSize },
      wallHeight: venue.wallHeight,
    },
    savedAt: new Date().toISOString(),
  };
}

// Deserialize JSON to scene state
export function deserializeScene(json: SceneJson): {
  placedAssets: PlacedAssetData[];
  lighting: LightingSettings;
  venue: VenueSettings;
} {
  // Handle version migrations if needed in the future
  if (json.version !== SCENE_VERSION) {
    console.warn(`Scene version ${json.version} differs from current ${SCENE_VERSION}`);
  }

  return {
    placedAssets: (json.placedAssets as unknown[])
      .filter((asset) => {
        if (isValidPlacedAssetRow(asset)) return true;
        console.warn('[DreamStage] Skipping invalid placed asset in scene JSON:', asset);
        return false;
      })
      .map((asset) => {
        const a = asset as PlacedAssetData;
        return {
          id: a.id,
          assetId: a.assetId,
          name: a.name,
          category: a.category,
          transform: {
            position: { ...a.transform.position },
            rotation: { ...a.transform.rotation },
            scale: { ...a.transform.scale },
          },
          unitPrice: typeof a.unitPrice === 'number' ? a.unitPrice : 0,
          priceOverride: a.priceOverride,
          modelRef: (a as { modelRef?: string | null; model_ref?: string | null }).modelRef
            ?? (a as { model_ref?: string | null }).model_ref
            ?? undefined,
        };
      }),
    lighting: {
      ambientIntensity: json.lighting.ambientIntensity,
      directionalIntensity: json.lighting.directionalIntensity,
      directionalPosition: { ...json.lighting.directionalPosition },
    },
    venue: {
      templateId: json.venue.templateId,
      floorSize: { ...json.venue.floorSize },
      wallHeight: json.venue.wallHeight,
    },
  };
}

// Validate scene JSON structure
export function validateSceneJson(json: unknown): json is SceneJson {
  if (!json || typeof json !== 'object') return false;

  const scene = json as Partial<SceneJson>;

  if (typeof scene.version !== 'number') return false;
  if (!Array.isArray(scene.placedAssets)) return false;
  if (!scene.lighting || typeof scene.lighting !== 'object') return false;
  if (!scene.venue || typeof scene.venue !== 'object') return false;

  // Validate each placed asset
  for (const asset of scene.placedAssets) {
    if (!asset.id || !asset.assetId || !asset.name || !asset.category) {
      return false;
    }
    if (!asset.transform?.position || !asset.transform?.rotation || !asset.transform?.scale) {
      return false;
    }
  }

  return true;
}

// Calculate scene statistics
export function getSceneStats(scene: SceneJson) {
  const totalAssets = scene.placedAssets.length;
  const totalBudget = scene.placedAssets.reduce(
    (sum, asset) => sum + (asset.priceOverride ?? asset.unitPrice),
    0
  );

  const assetsByCategory: Record<string, number> = {};
  scene.placedAssets.forEach((asset) => {
    assetsByCategory[asset.category] = (assetsByCategory[asset.category] || 0) + 1;
  });

  return {
    totalAssets,
    totalBudget,
    assetsByCategory,
    savedAt: scene.savedAt,
    version: scene.version,
  };
}
