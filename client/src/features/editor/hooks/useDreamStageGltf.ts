import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';

import { clearGltfTemplateCache } from '../utils/glbInstanceClone';
import { clearGltfWorkerCache } from '../services/gltfWorkerClient';
import { extendDreamStageGltfLoader } from '../utils/configureDreamStageGltfLoader';

/**
 * Project GLTF hook — Draco + Meshopt + extension inspection.
 * Same cache as useGLTF; pass this path to preload/clear as well.
 */
export function useDreamStageGltf(url: string): GLTF {
  return useGLTF(url, true, true, extendDreamStageGltfLoader) as GLTF;
}

useDreamStageGltf.preload = (url: string) => {
  return useGLTF.preload(url, true, true, extendDreamStageGltfLoader);
};

useDreamStageGltf.clear = (url: string) => {
  clearGltfTemplateCache(url);
  clearGltfWorkerCache(url);
  useGLTF.clear(url);
};
