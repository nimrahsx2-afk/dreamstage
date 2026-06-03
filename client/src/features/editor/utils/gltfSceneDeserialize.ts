import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

import type {
  GltfTransferPayload,
  SerializedMaterial,
  SerializedMesh,
  SerializedObject3D,
} from '../workers/gltfTransfer.types';

function applyMatrix(object: THREE.Object3D, matrix: number[]) {
  object.matrix.fromArray(matrix);
  object.matrix.decompose(object.position, object.quaternion, object.scale);
}

function buildMaterial(
  data: SerializedMaterial | undefined,
  mapBitmaps: ImageBitmap[],
  mapBitmapIndex?: number
): THREE.Material {
  const bitmap =
    mapBitmapIndex != null && mapBitmapIndex >= 0 ? mapBitmaps[mapBitmapIndex] : undefined;

  let map: THREE.Texture | undefined;
  if (bitmap) {
    map = new THREE.Texture(bitmap);
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
  }

  if (data?.kind === 'basic') {
    return new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: data.transparent,
      opacity: data.opacity,
      map,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: data?.kind === 'standard' ? data.color : 0xffffff,
    roughness: data?.kind === 'standard' ? data.roughness : 1,
    metalness: data?.kind === 'standard' ? data.metalness : 0,
    transparent: data?.transparent ?? false,
    opacity: data?.opacity ?? 1,
    map,
  });
}

function buildGeometry(mesh: SerializedMesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(mesh.position, mesh.positionItemSize)
  );
  if (mesh.normal) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normal, 3));
  }
  if (mesh.uv) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(mesh.uv, 2));
  }
  if (mesh.index) {
    geometry.setIndex(new THREE.BufferAttribute(mesh.index, 1));
  }
  return geometry;
}

function deserializeObject3D(
  data: SerializedObject3D,
  mapBitmaps: ImageBitmap[]
): THREE.Object3D {
  let object: THREE.Object3D;

  if (data.mesh) {
    const geometry = buildGeometry(data.mesh);
    const material = buildMaterial(
      data.mesh.material,
      mapBitmaps,
      data.mesh.mapBitmapIndex
    );
    object = new THREE.Mesh(geometry, material);
  } else {
    object = new THREE.Group();
  }

  object.name = data.name;
  applyMatrix(object, data.matrix);

  for (const child of data.children) {
    object.add(deserializeObject3D(child, mapBitmaps));
  }

  return object;
}

/** Rebuild a drei-compatible GLTF result on the main thread (cheap vs GLTFLoader.parse). */
export function deserializeGltfTransferPayload(payload: GltfTransferPayload): GLTF {
  const root = deserializeObject3D(payload.root, payload.mapBitmaps);
  root.updateMatrixWorld(true);

  const scene = new THREE.Group();
  scene.name = root.name || 'Scene';
  scene.add(root);

  return {
    scene,
    scenes: [scene],
    animations: [],
    cameras: [],
    asset: {},
    parser: null as unknown as GLTF['parser'],
    userData: { loadedViaWorker: true },
  };
}
