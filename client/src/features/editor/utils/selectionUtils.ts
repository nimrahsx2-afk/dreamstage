// Raycast → placed instance id, and scene → TransformControls attach root (stable for all GLB hierarchies)

import * as THREE from 'three';

import type { Transform } from '../editor.types';

/**
 * Prefer the outer placed-asset group (`userData.type === 'placedAsset'`) so we never
 * resolve selection from a nested GLB mesh that might carry wrong/stale userData.assetId.
 */
export function findPlacedInstanceIdFromHit(hit: THREE.Object3D | null): string | null {
  let current: THREE.Object3D | null = hit;
  while (current) {
    if (current.userData?.type === 'placedAsset' && typeof current.userData.assetId === 'string') {
      return current.userData.assetId;
    }
    current = current.parent;
  }
  current = hit;
  while (current) {
    const id = current.userData?.assetId;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
    current = current.parent;
  }
  return null;
}

/** Shallowest `asset-{placedInstanceId}` with `placedAsset` marker wins if duplicates exist. */
export function resolvePlacedAssetTransformRoot(
  scene: THREE.Object3D,
  placedInstanceId: string
): THREE.Object3D | null {
  const wantName = `asset-${placedInstanceId}`;
  const candidates: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name === wantName && o.userData?.type === 'placedAsset') {
      candidates.push(o);
    }
  });
  if (candidates.length === 0) return null;
  if (candidates.length > 1 && import.meta.env.DEV) {
    console.warn(
      '[DreamStage] Multiple transform roots for',
      wantName,
      '— using shallowest (depth from scene).'
    );
  }
  const depth = (o: THREE.Object3D): number => {
    let d = 0;
    let p: THREE.Object3D | null = o;
    while (p != null && p !== scene) {
      d += 1;
      p = p.parent;
    }
    return d;
  };
  let best = candidates[0]!;
  let bestDepth = depth(best);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!;
    const d = depth(c);
    if (d < bestDepth) {
      bestDepth = d;
      best = c;
    }
  }
  return best;
}

export function isFiniteTransform(t: Transform): boolean {
  const ok = (o: { x: number; y: number; z: number }) =>
    [o.x, o.y, o.z].every((n) => typeof n === 'number' && Number.isFinite(n));
  return ok(t.position) && ok(t.rotation) && ok(t.scale);
}

const finiteOrZero = (n: number) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);

/** Keeps the 3D tree valid if bad numbers ever enter store JSON (prevents R3F/Html white-screen). */
export function sanitizeTransformForRender(t: Transform): Transform {
  return {
    position: {
      x: finiteOrZero(t.position.x),
      y: finiteOrZero(t.position.y),
      z: finiteOrZero(t.position.z),
    },
    rotation: {
      x: finiteOrZero(t.rotation.x),
      y: finiteOrZero(t.rotation.y),
      z: finiteOrZero(t.rotation.z),
    },
    scale: {
      x: Math.max(finiteOrZero(t.scale.x), 1e-4),
      y: Math.max(finiteOrZero(t.scale.y), 1e-4),
      z: Math.max(finiteOrZero(t.scale.z), 1e-4),
    },
  };
}

export function isFiniteObjectWorldMatrix(o: THREE.Object3D): boolean {
  try {
    o.updateMatrixWorld(true);
    const e = o.matrixWorld.elements;
    for (let i = 0; i < 16; i++) {
      if (!Number.isFinite(e[i]!)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
