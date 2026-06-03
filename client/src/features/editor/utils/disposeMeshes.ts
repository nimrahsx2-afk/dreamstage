import * as THREE from 'three';

/** Mark meshes that own their geometry/material (hitboxes, fallbacks) — safe to dispose on remove. */
export const DREAMSTAGE_DISPOSE_ON_REMOVE = 'dreamstageDisposeOnRemove';

const MATERIAL_TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'envMap',
  'lightMap',
  'specularMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
] as const;

export type DisposeThreeJsObjectOptions = {
  /**
   * When false (default), only disposes meshes tagged with DREAMSTAGE_DISPOSE_ON_REMOVE.
   * Use false for shallow-cloned GLB instances (shared geometry/material).
   * Use true when tearing down templates or fully owned graphs.
   */
  disposeSharedResources?: boolean;
  /** Detach from parent before disposing resources */
  detachFromParent?: boolean;
};

function safeDisposeGeometry(geometry: THREE.BufferGeometry | undefined): void {
  if (!geometry) return;
  try {
    geometry.dispose();
  } catch {
    /* already disposed */
  }
}

function safeDisposeTexture(texture: THREE.Texture | null | undefined): void {
  if (!texture) return;
  try {
    texture.dispose();
  } catch {
    /* already disposed */
  }
}

function safeDisposeMaterial(material: THREE.Material | undefined): void {
  if (!material) return;
  try {
    const matRecord = material as unknown as Record<string, unknown>;
    for (const key of MATERIAL_TEXTURE_KEYS) {
      const tex = matRecord[key];
      if (tex instanceof THREE.Texture) {
        safeDisposeTexture(tex);
      }
    }
    material.dispose();
  } catch {
    /* already disposed */
  }
}

function safeDisposeMaterialOrArray(
  material: THREE.Material | THREE.Material[] | undefined
): void {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach(safeDisposeMaterial);
  } else {
    safeDisposeMaterial(material);
  }
}

function shouldDisposeMesh(
  mesh: THREE.Mesh,
  disposeSharedResources: boolean
): boolean {
  if (disposeSharedResources) return true;
  return mesh.userData[DREAMSTAGE_DISPOSE_ON_REMOVE] === true;
}

/**
 * Dispose GPU resources on a mesh when allowed by options / userData flags.
 */
export function disposeMeshResources(
  mesh: THREE.Mesh,
  options: Pick<DisposeThreeJsObjectOptions, 'disposeSharedResources'> = {}
): void {
  const disposeShared = options.disposeSharedResources ?? false;
  if (!shouldDisposeMesh(mesh, disposeShared)) return;

  safeDisposeGeometry(mesh.geometry);
  safeDisposeMaterialOrArray(mesh.material);
  mesh.geometry = new THREE.BufferGeometry();
  mesh.material = new THREE.MeshBasicMaterial();
}

/**
 * Traverse an Object3D graph and dispose geometries, materials, and textures.
 * Detaches from parent when `detachFromParent` is true (default).
 */
export function disposeThreeJsObject(
  object: THREE.Object3D | null | undefined,
  options: DisposeThreeJsObjectOptions = {}
): void {
  if (!object) return;

  const disposeShared = options.disposeSharedResources ?? false;
  const detach = options.detachFromParent ?? true;

  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      disposeMeshResources(node, { disposeSharedResources: disposeShared });
    }
  });

  if (detach && object.parent) {
    try {
      object.parent.remove(object);
    } catch {
      /* ignore */
    }
  }
}

/** Tag a mesh so disposeThreeJsObject(..., { disposeSharedResources: false }) still frees it. */
export function markMeshForDisposal(mesh: THREE.Mesh): void {
  mesh.userData[DREAMSTAGE_DISPOSE_ON_REMOVE] = true;
}
