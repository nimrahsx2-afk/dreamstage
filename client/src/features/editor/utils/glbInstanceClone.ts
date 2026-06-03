/**
 * Fast per-instance GLB graphs: one processed template per URL (single deep clone),
 * then shallow instance clones that reuse BufferGeometry + Material from the template.
 */

import * as THREE from 'three';

import { disposeThreeJsObject } from './disposeMeshes';
import { getCachedGlbExtensionReport } from './glbInspect';
import { applyGltfMaterialFallbacks } from './gltfMaterialUtils';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from './gltfExtensions.constants';

type GlbBoundsMode = 'root' | 'meshes';

export type ProcessedGltfTemplate = {
  root: THREE.Object3D;
  normScale: number;
  normSize: THREE.Vector3;
};

const glbMetadataCache = new Map<string, { normScale: number; normSize: THREE.Vector3 }>();
const gltfTemplateCache = new Map<string, ProcessedGltfTemplate>();

export function getGltfTemplateCacheStats(): {
  templateCount: number;
  metadataCount: number;
  templateKeys: string[];
} {
  return {
    templateCount: gltfTemplateCache.size,
    metadataCount: glbMetadataCache.size,
    templateKeys: [...gltfTemplateCache.keys()],
  };
}

function unwrapGltfSceneRootIfNeeded(root: THREE.Object3D): THREE.Object3D {
  if (!(root instanceof THREE.Scene)) return root;
  const group = new THREE.Group();
  group.name = root.name || 'GlbRoot';
  Object.assign(group.userData, root.userData);
  while (root.children.length > 0) {
    group.add(root.children[0]);
  }
  return group;
}

function makeGlbFallbackMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb45309,
    metalness: 0.2,
    roughness: 0.85,
  });
}

function isBufferGeometryRenderable(geom: THREE.BufferGeometry | null): boolean {
  if (!geom) return false;
  const pos = geom.attributes?.position;
  if (!pos || !pos.array || pos.count === 0) return false;
  return true;
}

/** Run once on the template — fixes broken meshes without touching the drei cache. */
function sanitizeMeshesInGraph(root: THREE.Object3D, modelPath: string): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mesh = obj;
    let g = mesh.geometry;

    if (!isBufferGeometryRenderable(g)) {
      try {
        g?.dispose();
      } catch {
        /* ignore */
      }
      mesh.geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      console.warn('[DreamStage] GLB mesh missing or empty geometry — using box:', modelPath, mesh.name);
    } else {
      try {
        g!.computeBoundingSphere();
        const sp = g!.boundingSphere;
        if (!sp || !Number.isFinite(sp.radius) || sp.radius <= 0) {
          throw new Error('invalid bounding sphere');
        }
      } catch {
        try {
          g?.dispose();
        } catch {
          /* ignore */
        }
        mesh.geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        console.warn('[DreamStage] GLB geometry failed bounds check — using box:', modelPath, mesh.name);
      }
    }

    const mat = mesh.material;
    if (mat == null) {
      mesh.material = makeGlbFallbackMaterial();
    } else if (Array.isArray(mat)) {
      mesh.material = mat.map((m) => (m == null ? makeGlbFallbackMaterial() : m));
    } else if (!(mat instanceof THREE.Material)) {
      mesh.material = makeGlbFallbackMaterial();
    }
  });
}

function unionBoundsFromMeshes(root: THREE.Object3D): THREE.Box3 | null {
  root.updateMatrixWorld(true);
  const union = new THREE.Box3();
  let any = false;
  root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) {
      child.updateMatrixWorld(true);
    }
    if (child instanceof THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(child);
      if (box.isEmpty()) return;
      if (!any) {
        union.copy(box);
        any = true;
      } else {
        union.union(box);
      }
    }
  });
  return any ? union : null;
}

function recenterAndGroundGlbRoot(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;

  const centerWorld = box.getCenter(new THREE.Vector3());
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const offsetLocal = centerWorld.clone().applyMatrix4(inv);
  root.position.sub(offsetLocal);

  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  if (box2.isEmpty()) return;
  if (Math.abs(box2.min.y) < 1e-5) return;

  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  root.matrixWorld.decompose(new THREE.Vector3(), quat, scale);
  const lift = new THREE.Vector3(0, -box2.min.y, 0).applyQuaternion(quat.clone().invert());
  root.position.add(lift);
  root.updateMatrixWorld(true);
}

function recenterAndGroundGlbRootFromMeshBounds(root: THREE.Object3D): void {
  const box0 = unionBoundsFromMeshes(root);
  if (!box0 || box0.isEmpty()) return;

  const centerWorld = box0.getCenter(new THREE.Vector3());
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const offsetLocal = centerWorld.clone().applyMatrix4(inv);
  root.position.sub(offsetLocal);

  root.updateMatrixWorld(true);
  const box2 = unionBoundsFromMeshes(root);
  if (!box2 || box2.isEmpty()) return;
  if (Math.abs(box2.min.y) < 1e-5) return;

  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  root.matrixWorld.decompose(new THREE.Vector3(), quat, scale);
  const lift = new THREE.Vector3(0, -box2.min.y, 0).applyQuaternion(quat.clone().invert());
  root.position.add(lift);
  root.updateMatrixWorld(true);
}

function getGlbMetadata(
  scene: THREE.Object3D,
  path: string,
  boundsMode: GlbBoundsMode
): { normScale: number; normSize: THREE.Vector3 } {
  const cacheKey = `${path}::${boundsMode}`;
  const cached = glbMetadataCache.get(cacheKey);
  if (cached != null) return cached;

  const box =
    boundsMode === 'meshes'
      ? unionBoundsFromMeshes(scene)
      : new THREE.Box3().setFromObject(scene);
  if (!box || box.isEmpty()) {
    const fallback = { normScale: 1, normSize: new THREE.Vector3(1, 1, 1) };
    glbMetadataCache.set(cacheKey, fallback);
    return fallback;
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const normScale = 1 / maxDim;
  const normSize = new THREE.Vector3(
    size.x * normScale,
    size.y * normScale,
    size.z * normScale
  );
  const meta = { normScale, normSize };
  glbMetadataCache.set(cacheKey, meta);
  return meta;
}

function copyObject3DTransform(target: THREE.Object3D, source: THREE.Object3D): void {
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
  target.scale.copy(source.scale);
  target.matrix.copy(source.matrix);
  target.matrixAutoUpdate = source.matrixAutoUpdate;
}

/**
 * Shallow hierarchy clone: new Object3D nodes, shared geometry/material buffers.
 * Safe for many instances of the same modelRef.
 */
export function shallowCloneGltfHierarchy(source: THREE.Object3D): THREE.Object3D {
  let clone: THREE.Object3D;

  if (source instanceof THREE.SkinnedMesh) {
    const skinned = new THREE.SkinnedMesh(source.geometry, source.material);
    skinned.name = source.name;
    skinned.bindMode = source.bindMode;
    skinned.bindMatrix.copy(source.bindMatrix);
    skinned.bindMatrixInverse.copy(source.bindMatrixInverse);
    if (source.skeleton) {
      skinned.skeleton = source.skeleton;
    }
    clone = skinned;
  } else if (source instanceof THREE.Mesh) {
    const mesh = new THREE.Mesh(source.geometry, source.material);
    mesh.name = source.name;
    clone = mesh;
  } else if (source instanceof THREE.Group) {
    const group = new THREE.Group();
    group.name = source.name;
    clone = group;
  } else {
    const group = new THREE.Group();
    group.name = source.name;
    clone = group;
  }

  copyObject3DTransform(clone, source);
  clone.visible = source.visible;
  clone.castShadow = source.castShadow;
  clone.receiveShadow = source.receiveShadow;
  clone.frustumCulled = source.frustumCulled;
  clone.renderOrder = source.renderOrder;

  for (const child of source.children) {
    clone.add(shallowCloneGltfHierarchy(child));
  }

  return clone;
}

function groundTemplateRoot(s: THREE.Object3D, normScale: number): void {
  const prevScale = s.scale.clone();
  s.scale.setScalar(normScale);
  s.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(s);
  if (!box.isEmpty()) {
    const bottomY = box.min.y;
    if (Number.isFinite(bottomY) && Math.abs(bottomY) > 1e-6) {
      s.position.y -= bottomY;
      s.updateMatrixWorld(true);
    }
  }
  s.scale.copy(prevScale);
  s.updateMatrixWorld(true);
}

/**
 * Build (or return cached) processed template: one deep clone per path + bounds mode.
 */
export function getProcessedGltfTemplate(
  cachedScene: THREE.Object3D,
  path: string,
  useMeshBoundsRecenter: boolean
): ProcessedGltfTemplate {
  const boundsMode: GlbBoundsMode = useMeshBoundsRecenter ? 'meshes' : 'root';
  const templateKey = `${path}::${boundsMode}`;
  const hit = gltfTemplateCache.get(templateKey);
  if (hit) return hit;

  const raw = cachedScene.clone(true);
  const root = unwrapGltfSceneRootIfNeeded(raw);
  sanitizeMeshesInGraph(root, path);

  const extReport = getCachedGlbExtensionReport(path);
  applyGltfMaterialFallbacks(root, {
    modelPath: path,
    usedDeprecatedSpecGloss: extReport?.deprecated.includes(
      KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS
    ),
  });

  if (useMeshBoundsRecenter) {
    recenterAndGroundGlbRootFromMeshBounds(root);
  } else {
    recenterAndGroundGlbRoot(root);
  }

  const meta = getGlbMetadata(root, path, boundsMode);
  groundTemplateRoot(root, meta.normScale);

  const entry: ProcessedGltfTemplate = {
    root,
    normScale: meta.normScale,
    normSize: meta.normSize,
  };
  gltfTemplateCache.set(templateKey, entry);
  return entry;
}

function disposeTemplateEntry(entry: ProcessedGltfTemplate): void {
  try {
    disposeThreeJsObject(entry.root, {
      disposeSharedResources: true,
      detachFromParent: true,
    });
  } catch (err) {
    console.warn('[DreamStage] Failed to dispose GLTF template root:', err);
  }
}

/** Drop processed templates when GLTF cache is cleared (tab cleanup / useGLTF.clear). */
export function clearGltfTemplateCache(modelPath?: string): void {
  if (!modelPath) {
    for (const entry of gltfTemplateCache.values()) {
      disposeTemplateEntry(entry);
    }
    gltfTemplateCache.clear();
    glbMetadataCache.clear();
    return;
  }
  for (const [key, entry] of [...gltfTemplateCache.entries()]) {
    if (key.startsWith(modelPath)) {
      disposeTemplateEntry(entry);
      gltfTemplateCache.delete(key);
    }
  }
  for (const key of [...glbMetadataCache.keys()]) {
    if (key.startsWith(modelPath)) glbMetadataCache.delete(key);
  }
}
