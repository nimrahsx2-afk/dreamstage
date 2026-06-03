import * as THREE from 'three';

import type {
  GltfTransferPayload,
  SerializedMaterial,
  SerializedMesh,
  SerializedObject3D,
} from './gltfTransfer.types';

function serializeMaterial(
  material: THREE.Material | THREE.Material[],
  mapBitmaps: ImageBitmap[]
): { material?: SerializedMaterial; mapBitmapIndex?: number } {
  const mat = Array.isArray(material) ? material[0] : material;
  if (!mat) return {};

  let mapBitmapIndex: number | undefined;
  const map = (mat as THREE.MeshStandardMaterial).map;
  if (map?.image) {
    const image = map.image as ImageBitmap | { width?: number; height?: number };
    if (image instanceof ImageBitmap) {
      const existing = mapBitmaps.indexOf(image);
      if (existing !== -1) {
        mapBitmapIndex = existing;
      } else {
        mapBitmapIndex = mapBitmaps.length;
        mapBitmaps.push(image);
      }
    }
  }

  if (mat instanceof THREE.MeshStandardMaterial) {
    return {
      mapBitmapIndex,
      material: {
        kind: 'standard',
        color: mat.color.getHex(),
        roughness: mat.roughness,
        metalness: mat.metalness,
        transparent: mat.transparent,
        opacity: mat.opacity,
        hasMap: mapBitmapIndex != null,
      },
    };
  }

  if (mat instanceof THREE.MeshBasicMaterial) {
    return {
      mapBitmapIndex,
      material: {
        kind: 'basic',
        color: mat.color.getHex(),
        transparent: mat.transparent,
        opacity: mat.opacity,
        hasMap: mapBitmapIndex != null,
      },
    };
  }

  return {};
}

function serializeMeshGeometry(mesh: THREE.Mesh): SerializedMesh | null {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.getAttribute('position');
  if (!posAttr) return null;

  const position = new Float32Array(posAttr.array as ArrayLike<number>);
  const serialized: SerializedMesh = {
    position,
    positionItemSize: posAttr.itemSize,
  };

  const normalAttr = geom.getAttribute('normal');
  if (normalAttr) {
    serialized.normal = new Float32Array(normalAttr.array as ArrayLike<number>);
  }

  const uvAttr = geom.getAttribute('uv');
  if (uvAttr) {
    serialized.uv = new Float32Array(uvAttr.array as ArrayLike<number>);
  }

  if (geom.index) {
    const idx = geom.index.array;
    serialized.index =
      idx instanceof Uint32Array ? new Uint32Array(idx) : new Uint16Array(idx as ArrayLike<number>);
  }

  return serialized;
}

function serializeObject3D(
  object: THREE.Object3D,
  mapBitmaps: ImageBitmap[]
): SerializedObject3D {
  const node: SerializedObject3D = {
    name: object.name,
    matrix: object.matrix.toArray(),
    children: [],
  };

  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh;
    const geometry = serializeMeshGeometry(mesh);
    if (geometry) {
      const { material, mapBitmapIndex } = serializeMaterial(mesh.material, mapBitmaps);
      node.mesh = geometry;
      node.mesh.material = material;
      node.mesh.mapBitmapIndex = mapBitmapIndex;
    }
  }

  for (const child of object.children) {
    node.children.push(serializeObject3D(child, mapBitmaps));
  }

  return node;
}

/** Collect transferable ArrayBuffers + ImageBitmaps for postMessage. */
export function collectTransferables(payload: GltfTransferPayload): Transferable[] {
  const out: Transferable[] = [...payload.mapBitmaps];

  const walk = (node: SerializedObject3D) => {
    const mesh = node.mesh;
    if (mesh) {
      out.push(mesh.position.buffer);
      if (mesh.normal) out.push(mesh.normal.buffer);
      if (mesh.uv) out.push(mesh.uv.buffer);
      if (mesh.index) out.push(mesh.index.buffer);
    }
    node.children.forEach(walk);
  };

  walk(payload.root);
  return out;
}

export function serializeGltfScene(scene: THREE.Object3D): GltfTransferPayload {
  const mapBitmaps: ImageBitmap[] = [];
  const root = serializeObject3D(scene, mapBitmaps);
  return { root, mapBitmaps };
}
