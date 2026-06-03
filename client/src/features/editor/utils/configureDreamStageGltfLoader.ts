import type { GLTF, GLTFLoader } from 'three-stdlib';

import { GLTF_WORKER_ENABLED } from '../editor.constants';
import { loadGltfViaWorker } from '../services/gltfWorkerClient';
import { enqueueGltfLoad } from './gltfLoadQueue';
import { inspectGlbExtensions, logGlbExtensionWarnings } from './glbInspect';

const inspectedUrls = new Set<string>();

/**
 * drei useGLTF 4th argument — Draco/Meshopt stay enabled; we inspect extensions per URL once.
 * Note: Three.js r161 cannot load KHR_materials_pbrSpecularGlossiness (removed r147).
 */
export function extendDreamStageGltfLoader(loader: GLTFLoader): void {
  const originalLoad = loader.load.bind(loader);

  loader.load = function dreamStageLoad(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (event: ErrorEvent) => void
  ) {
    if (!inspectedUrls.has(url)) {
      inspectedUrls.add(url);
      void inspectGlbExtensions(url)
        .then((report) => {
          logGlbExtensionWarnings(url, report);
          (loader as GLTFLoader & { userData?: Record<string, unknown> }).userData ??= {};
          const ud = (loader as GLTFLoader & { userData: Record<string, unknown> }).userData;
          ud[`ext:${url}`] = report;
        })
        .catch((err) => {
          console.warn('[DreamStage] Could not inspect GLB extensions:', url, err);
        });
    }

    if (GLTF_WORKER_ENABLED) {
      void loadGltfViaWorker(url, (p) => {
        onProgress?.(
          new ProgressEvent('progress', {
            lengthComputable: p.total > 0,
            loaded: p.loaded,
            total: p.total || p.loaded || 1,
          })
        );
      })
        .then((gltf) => onLoad(gltf))
        .catch((err) => {
          console.warn(
            '[DreamStage] GLTF worker load failed; falling back to main-thread loader:',
            url,
            err
          );
          void loadGltfMainThread(originalLoad, url, onLoad, onProgress, onError);
        });
      return undefined as unknown as ReturnType<typeof originalLoad>;
    }

    void loadGltfMainThread(originalLoad, url, onLoad, onProgress, onError);
    return undefined as unknown as ReturnType<typeof originalLoad>;
  };
}

function loadGltfMainThread(
  originalLoad: GLTFLoader['load'],
  url: string,
  onLoad: (gltf: GLTF) => void,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
  onError?: (event: ErrorEvent) => void
): void {
  void enqueueGltfLoad(`main:${url}`, () =>
    new Promise<GLTF>((resolve, reject) => {
      originalLoad(
        url,
        (gltf) => resolve(gltf),
        onProgress,
        (event) => {
          const err = new Error(
            typeof event === 'object' && event && 'message' in event
              ? String((event as ErrorEvent).message)
              : 'GLTF load failed'
          );
          reject(err);
        }
      );
    })
  )
    .then((gltf) => onLoad(gltf))
    .catch((err) => {
      console.warn('[DreamStage] Main-thread GLTF load failed:', url, err);
      if (onError) {
        onError({ message: err.message } as ErrorEvent);
      }
    });
}

/** Read extension report stored during load (if inspect finished). */
export function getLoaderExtensionReport(
  loader: GLTFLoader,
  url: string
): { deprecated: string[] } | null {
  const ud = (loader as GLTFLoader & { userData?: Record<string, unknown> }).userData;
  const report = ud?.[`ext:${url}`] as { deprecated?: string[] } | undefined;
  if (!report) return null;
  return { deprecated: report.deprecated ?? [] };
}
