/**
 * Post-load fixes when glTF uses removed extensions (e.g. KHR_materials_pbrSpecularGlossiness)
 * or materials load without maps. Permanent fix: convert assets with npm run models:metalrough.
 */

import * as THREE from 'three';
import type { Object3D } from 'three';

import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from './gltfExtensions.constants';

export type GltfMaterialFallbackOptions = {
  modelPath: string;
  /** Set when inspectGlbExtensions found spec/gloss extension */
  usedDeprecatedSpecGloss?: boolean;
};

function hasUsableMap(mat: THREE.MeshStandardMaterial): boolean {
  return !!(mat.map ?? mat.normalMap ?? mat.roughnessMap ?? mat.metalnessMap);
}

function upgradeMaterial(
  mat: THREE.Material,
  opts: GltfMaterialFallbackOptions
): THREE.Material {
  if (!(mat instanceof THREE.MeshStandardMaterial)) {
    if (mat instanceof THREE.MeshBasicMaterial) {
      const std = new THREE.MeshStandardMaterial({
        color: mat.color,
        map: mat.map,
        transparent: mat.transparent,
        opacity: mat.opacity,
        side: mat.side,
      });
      mat.dispose();
      return std;
    }
    return mat;
  }

  const std = mat;

  if (std.envMap) {
    std.envMap = null;
  }

  std.needsUpdate = true;

  const missingMaps = !hasUsableMap(std);
  const veryDark =
    std.color.r < 0.08 && std.color.g < 0.08 && std.color.b < 0.08 && missingMaps;

  if (opts.usedDeprecatedSpecGloss && (missingMaps || veryDark)) {
    if (import.meta.env.DEV) {
      console.warn(
        '[DreamStage] Spec/gloss material without usable maps — applying neutral PBR fallback:',
        opts.modelPath,
        std.name
      );
    }
    std.color.setHex(0xb8b0a8);
    std.metalness = 0.15;
    std.roughness = 0.75;
    std.metalnessMap = null;
    std.roughnessMap = null;
  }

  return std;
}

/** Traverse a loaded or cloned scene graph and upgrade materials. */
export function applyGltfMaterialFallbacks(
  root: Object3D,
  opts: GltfMaterialFallbackOptions
): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mesh = obj;

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) =>
        m ? upgradeMaterial(m, opts) : m
      );
    } else if (mesh.material) {
      mesh.material = upgradeMaterial(mesh.material, opts);
    }
  });

  if (opts.usedDeprecatedSpecGloss) {
    root.userData.dreamstageDeprecatedExtensions = [KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS];
  }
}
