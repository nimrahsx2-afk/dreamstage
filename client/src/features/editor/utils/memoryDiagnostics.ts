/**
 * Memory diagnostics for the DreamStage editor. Inspect the live scene, GLTF caches,
 * editor store, and JS heap (when supported) — safe to call from the browser console.
 *
 * Usage (browser console):
 *   window.runMemoryDiagnostics()
 */

import * as THREE from 'three';

import { useEditorStore } from '../store/editorStore';
import { getGltfTemplateCacheStats } from './glbInstanceClone';
import { getGltfWorkerStats } from '../services/gltfWorkerClient';
import { getEditorThreeRefs } from './editorThreeRefs';

const LOG_PREFIX = '[DreamStage:MemoryDiag]';

export type ThreeSceneCounts = {
  total: number;
  meshes: number;
  groups: number;
  scenes: number;
  cameras: number;
  lights: number;
  geometries: number;
  uniqueGeometries: number;
  materials: number;
  uniqueMaterials: number;
  textures: number;
  uniqueTextures: number;
};

export type HeapUsage = {
  supported: boolean;
  usedBytes: number;
  totalBytes: number;
  limitBytes: number;
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentOfLimit: number;
};

export type MemoryDiagnosticsReport = {
  timestamp: string;
  three: ThreeSceneCounts;
  rendererInfo: {
    supported: boolean;
    geometries: number;
    textures: number;
    drawCalls: number;
    triangles: number;
  };
  gltfWorker: {
    cachedCount: number;
    pendingCount: number;
    cachedUrls: string[];
    pendingUrls: string[];
    workerActive: boolean;
  };
  gltfTemplates: {
    templateCount: number;
    metadataCount: number;
    templateKeys: string[];
  };
  editorStore: {
    placedAssets: number;
    isDirty: boolean;
    isLocked: boolean;
    hasVenueModel: boolean;
  };
  heap: HeapUsage;
  warnings: string[];
};

function emptyThreeCounts(): ThreeSceneCounts {
  return {
    total: 0,
    meshes: 0,
    groups: 0,
    scenes: 0,
    cameras: 0,
    lights: 0,
    geometries: 0,
    uniqueGeometries: 0,
    materials: 0,
    uniqueMaterials: 0,
    textures: 0,
    uniqueTextures: 0,
  };
}

function collectTextures(material: THREE.Material, set: Set<THREE.Texture>): void {
  const rec = material as unknown as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    const val = rec[key];
    if (val instanceof THREE.Texture) set.add(val);
  }
}

function countSceneObjects(scene: THREE.Scene | null): ThreeSceneCounts {
  const counts = emptyThreeCounts();
  if (!scene) return counts;

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  try {
    scene.traverse((obj) => {
      counts.total += 1;

      if (obj instanceof THREE.Scene) counts.scenes += 1;
      else if ((obj as THREE.Camera).isCamera) counts.cameras += 1;
      else if ((obj as THREE.Light).isLight) counts.lights += 1;
      else if (obj instanceof THREE.Mesh) counts.meshes += 1;
      else if (obj instanceof THREE.Group) counts.groups += 1;

      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          counts.geometries += 1;
          geometries.add(obj.geometry);
        }
        const mat = obj.material;
        if (Array.isArray(mat)) {
          for (const m of mat) {
            if (m) {
              counts.materials += 1;
              materials.add(m);
              collectTextures(m, textures);
            }
          }
        } else if (mat) {
          counts.materials += 1;
          materials.add(mat);
          collectTextures(mat, textures);
        }
      }
    });
  } catch (err) {
    console.warn(LOG_PREFIX, 'scene traversal failed:', err);
  }

  counts.uniqueGeometries = geometries.size;
  counts.uniqueMaterials = materials.size;
  counts.textures = textures.size;
  counts.uniqueTextures = textures.size;
  return counts;
}

function readRendererInfo(): MemoryDiagnosticsReport['rendererInfo'] {
  const { gl } = getEditorThreeRefs();
  if (!gl) {
    return {
      supported: false,
      geometries: 0,
      textures: 0,
      drawCalls: 0,
      triangles: 0,
    };
  }
  try {
    return {
      supported: true,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    };
  } catch (err) {
    console.warn(LOG_PREFIX, 'renderer info read failed:', err);
    return {
      supported: false,
      geometries: 0,
      textures: 0,
      drawCalls: 0,
      triangles: 0,
    };
  }
}

function readHeap(): HeapUsage {
  const perf = (typeof performance !== 'undefined' ? performance : null) as
    | (Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      })
    | null;

  const mem = perf?.memory;
  if (!mem) {
    return {
      supported: false,
      usedBytes: 0,
      totalBytes: 0,
      limitBytes: 0,
      usedMB: 0,
      totalMB: 0,
      limitMB: 0,
      percentOfLimit: 0,
    };
  }
  const usedMB = mem.usedJSHeapSize / 1024 / 1024;
  const totalMB = mem.totalJSHeapSize / 1024 / 1024;
  const limitMB = mem.jsHeapSizeLimit / 1024 / 1024;
  const percentOfLimit =
    mem.jsHeapSizeLimit > 0
      ? (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
      : 0;

  return {
    supported: true,
    usedBytes: mem.usedJSHeapSize,
    totalBytes: mem.totalJSHeapSize,
    limitBytes: mem.jsHeapSizeLimit,
    usedMB: round(usedMB, 1),
    totalMB: round(totalMB, 1),
    limitMB: round(limitMB, 1),
    percentOfLimit: round(percentOfLimit, 1),
  };
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function buildWarnings(report: Omit<MemoryDiagnosticsReport, 'warnings'>): string[] {
  const warnings: string[] = [];

  if (report.heap.supported && report.heap.percentOfLimit >= 80) {
    warnings.push(
      `JS heap at ${report.heap.percentOfLimit}% of limit (${report.heap.usedMB} / ${report.heap.limitMB} MB)`
    );
  }
  if (report.three.uniqueTextures > 50) {
    warnings.push(`High texture count: ${report.three.uniqueTextures} unique`);
  }
  if (report.three.uniqueGeometries > 200) {
    warnings.push(`High geometry count: ${report.three.uniqueGeometries} unique`);
  }
  if (report.gltfTemplates.templateCount > 30) {
    warnings.push(
      `GLTF template cache large: ${report.gltfTemplates.templateCount} templates`
    );
  }
  if (report.gltfWorker.pendingCount > 5) {
    warnings.push(`Many GLTF loads pending: ${report.gltfWorker.pendingCount}`);
  }
  return warnings;
}

export function runMemoryDiagnostics(options?: {
  silent?: boolean;
}): MemoryDiagnosticsReport {
  const silent = options?.silent ?? false;
  const { scene } = getEditorThreeRefs();

  let three: ThreeSceneCounts;
  try {
    three = countSceneObjects(scene);
  } catch (err) {
    console.warn(LOG_PREFIX, 'scene count failed:', err);
    three = emptyThreeCounts();
  }

  const rendererInfo = readRendererInfo();

  let gltfWorker: MemoryDiagnosticsReport['gltfWorker'];
  try {
    gltfWorker = getGltfWorkerStats();
  } catch (err) {
    console.warn(LOG_PREFIX, 'worker stats failed:', err);
    gltfWorker = {
      cachedCount: 0,
      pendingCount: 0,
      cachedUrls: [],
      pendingUrls: [],
      workerActive: false,
    };
  }

  let gltfTemplates: MemoryDiagnosticsReport['gltfTemplates'];
  try {
    gltfTemplates = getGltfTemplateCacheStats();
  } catch (err) {
    console.warn(LOG_PREFIX, 'template cache stats failed:', err);
    gltfTemplates = { templateCount: 0, metadataCount: 0, templateKeys: [] };
  }

  let editorStore: MemoryDiagnosticsReport['editorStore'];
  try {
    const state = useEditorStore.getState();
    editorStore = {
      placedAssets: state.placedAssets.length,
      isDirty: state.isDirty,
      isLocked: state.isLocked,
      hasVenueModel: state.hasVenueModel,
    };
  } catch (err) {
    console.warn(LOG_PREFIX, 'editor store read failed:', err);
    editorStore = {
      placedAssets: 0,
      isDirty: false,
      isLocked: false,
      hasVenueModel: false,
    };
  }

  const heap = readHeap();

  const partial: Omit<MemoryDiagnosticsReport, 'warnings'> = {
    timestamp: new Date().toISOString(),
    three,
    rendererInfo,
    gltfWorker,
    gltfTemplates,
    editorStore,
    heap,
  };
  const warnings = buildWarnings(partial);
  const report: MemoryDiagnosticsReport = { ...partial, warnings };

  if (!silent) logReport(report);
  return report;
}

function logReport(r: MemoryDiagnosticsReport): void {
  if (typeof console.groupCollapsed !== 'function') {
    console.log(LOG_PREFIX, r);
    return;
  }

  console.groupCollapsed(`${LOG_PREFIX} ${r.timestamp}`);

  console.log('Editor store');
  console.table([
    {
      placedAssets: r.editorStore.placedAssets,
      isDirty: r.editorStore.isDirty,
      isLocked: r.editorStore.isLocked,
      hasVenueModel: r.editorStore.hasVenueModel,
    },
  ]);

  console.log('Three.js scene');
  console.table([
    {
      total: r.three.total,
      meshes: r.three.meshes,
      groups: r.three.groups,
      cameras: r.three.cameras,
      lights: r.three.lights,
      geometries: r.three.geometries,
      uniqueGeometries: r.three.uniqueGeometries,
      materials: r.three.materials,
      uniqueMaterials: r.three.uniqueMaterials,
      uniqueTextures: r.three.uniqueTextures,
    },
  ]);

  console.log('WebGL renderer info');
  if (r.rendererInfo.supported) {
    console.table([r.rendererInfo]);
  } else {
    console.log('  (renderer not registered — open the 3D Editor tab first)');
  }

  console.log('GLTF worker cache');
  console.table([
    {
      cached: r.gltfWorker.cachedCount,
      pending: r.gltfWorker.pendingCount,
      workerActive: r.gltfWorker.workerActive,
    },
  ]);
  if (r.gltfWorker.cachedUrls.length > 0) {
    console.log('  cached URLs:', r.gltfWorker.cachedUrls);
  }

  console.log('GLTF template cache');
  console.table([
    {
      templates: r.gltfTemplates.templateCount,
      metadata: r.gltfTemplates.metadataCount,
    },
  ]);

  console.log('JS heap');
  if (r.heap.supported) {
    console.table([
      {
        usedMB: r.heap.usedMB,
        totalMB: r.heap.totalMB,
        limitMB: r.heap.limitMB,
        percentOfLimit: `${r.heap.percentOfLimit}%`,
      },
    ]);
  } else {
    console.log(
      '  performance.memory not available (Chromium-only; enable --enable-precise-memory-info for accuracy)'
    );
  }

  if (r.warnings.length > 0) {
    console.warn(`${LOG_PREFIX} warnings:`);
    for (const w of r.warnings) console.warn('  • ' + w);
  } else {
    console.log('No warnings.');
  }

  console.groupEnd();
}

if (typeof window !== 'undefined') {
  (window as unknown as { runMemoryDiagnostics: typeof runMemoryDiagnostics }).runMemoryDiagnostics =
    runMemoryDiagnostics;
}
