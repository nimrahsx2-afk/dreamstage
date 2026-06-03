import type { PlacedAssetData } from '../editor.types';
import { resolveGlbUrl } from './glbPath';
import { clearGltfTemplateCache } from './glbInstanceClone';
import { disposeThreeJsObject } from './disposeMeshes';
import { useDreamStageGltf } from '../hooks/useDreamStageGltf';

type RegistryEntry = {
  root: import('three').Object3D;
  modelRef: string | null;
  disposeSharedResources: boolean;
};

const registry = new Map<string, RegistryEntry>();

export function registerPlacedAssetObject(
  assetId: string,
  root: import('three').Object3D,
  modelRef: string | null | undefined,
  options?: { disposeSharedResources?: boolean }
): void {
  registry.set(assetId, {
    root,
    modelRef: modelRef?.trim() || null,
    disposeSharedResources: options?.disposeSharedResources ?? false,
  });
}

export function unregisterPlacedAssetObject(assetId: string): void {
  registry.delete(assetId);
}

/**
 * Dispose instance graph (not shared GLB buffers) and drop registry entry.
 */
export function disposePlacedAssetById(assetId: string): void {
  const entry = registry.get(assetId);
  if (!entry) return;

  try {
    disposeThreeJsObject(entry.root, {
      disposeSharedResources: entry.disposeSharedResources,
      detachFromParent: true,
    });
  } catch (err) {
    console.warn('[DreamStage] disposePlacedAssetById failed:', assetId, err);
  } finally {
    registry.delete(assetId);
  }
}

export function disposeAllPlacedAssetObjects(): void {
  for (const assetId of [...registry.keys()]) {
    disposePlacedAssetById(assetId);
  }
}

/**
 * Clear drei/worker/template cache when no placed asset still references this model.
 */
export function maybeClearGltfCacheForModel(
  modelRef: string | null | undefined,
  remainingAssets: PlacedAssetData[]
): void {
  const url = resolveGlbUrl(modelRef);
  if (!url) return;

  const stillUsed = remainingAssets.some(
    (a) => resolveGlbUrl(a.modelRef) === url
  );
  if (stillUsed) return;

  try {
    clearGltfTemplateCache(url);
    useDreamStageGltf.clear(url);
  } catch (err) {
    console.warn('[DreamStage] maybeClearGltfCacheForModel failed:', url, err);
  }
}
