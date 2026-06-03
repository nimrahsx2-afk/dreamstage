import type { GLTF } from 'three-stdlib';

import { GLTF_WORKER_ENABLED } from '../editor.constants';
import { deserializeGltfTransferPayload } from '../utils/gltfSceneDeserialize';
import type {
  GltfTransferPayload,
  GltfWorkerRequest,
  GltfWorkerResponse,
} from '../workers/gltfTransfer.types';

export type GltfLoadProgress = {
  url: string;
  loaded: number;
  total: number;
  percent: number;
  phase: 'fetch' | 'parse' | 'transfer' | 'done' | 'error';
};

type ProgressListener = (progress: GltfLoadProgress) => void;

type PendingLoad = {
  id: string;
  url: string;
  subscribers: Array<{
    resolve: (gltf: GLTF) => void;
    reject: (error: Error) => void;
  }>;
  progressListeners: Set<ProgressListener>;
};

let worker: Worker | null = null;
let workerGeneration = 0;

const pendingByUrl = new Map<string, PendingLoad>();
const gltfCache = new Map<string, GLTF>();
const progressByUrl = new Map<string, GltfLoadProgress>();

export function getGltfWorkerStats(): {
  cachedCount: number;
  pendingCount: number;
  cachedUrls: string[];
  pendingUrls: string[];
  workerActive: boolean;
} {
  return {
    cachedCount: gltfCache.size,
    pendingCount: pendingByUrl.size,
    cachedUrls: [...gltfCache.keys()],
    pendingUrls: [...pendingByUrl.keys()],
    workerActive: worker !== null,
  };
}

function createWorker(): Worker {
  return new Worker(new URL('../workers/gltf-load.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function ensureWorker(): Worker {
  if (!worker) {
    worker = createWorker();
    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', onWorkerError);
  }
  return worker;
}

function emitProgress(url: string, patch: Partial<GltfLoadProgress>) {
  const prev = progressByUrl.get(url);
  const next: GltfLoadProgress = {
    url,
    loaded: patch.loaded ?? prev?.loaded ?? 0,
    total: patch.total ?? prev?.total ?? 0,
    percent: 0,
    phase: patch.phase ?? prev?.phase ?? 'fetch',
  };
  next.percent =
    next.total > 0 ? Math.min(100, Math.round((next.loaded / next.total) * 100)) : 0;
  progressByUrl.set(url, next);

  for (const pending of pendingByUrl.values()) {
    if (pending.url === url) {
      pending.progressListeners.forEach((fn) => fn(next));
    }
  }
}

function settlePending(pending: PendingLoad, result: 'ok', gltf: GLTF): void;
function settlePending(pending: PendingLoad, result: 'err', error: Error): void;
function settlePending(
  pending: PendingLoad,
  result: 'ok' | 'err',
  value: GLTF | Error
): void {
  for (const sub of pending.subscribers) {
    if (result === 'ok') sub.resolve(value as GLTF);
    else sub.reject(value as Error);
  }
  pending.subscribers.length = 0;
}

function onWorkerError(event: ErrorEvent) {
  const message = event.message || 'GLTF worker failed';
  for (const [url, pending] of pendingByUrl) {
    emitProgress(url, { phase: 'error' });
    settlePending(pending, 'err', new Error(message));
    pendingByUrl.delete(url);
  }
}

function onWorkerMessage(event: MessageEvent<GltfWorkerResponse>) {
  const msg = event.data;
  const pending = pendingByUrl.get(msg.url);
  if (!pending || pending.id !== msg.id) return;

  switch (msg.type) {
    case 'progress':
      emitProgress(msg.url, {
        phase: 'fetch',
        loaded: msg.loaded,
        total: msg.total,
      });
      break;
    case 'complete': {
      try {
        emitProgress(msg.url, { phase: 'transfer', loaded: 1, total: 1, percent: 100 });
        const gltf = payloadToGltf(msg.payload);
        gltfCache.set(msg.url, gltf);
        emitProgress(msg.url, { phase: 'done', loaded: 1, total: 1, percent: 100 });
        settlePending(pending, 'ok', gltf);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        emitProgress(msg.url, { phase: 'error' });
        settlePending(pending, 'err', error);
      } finally {
        pendingByUrl.delete(msg.url);
      }
      break;
    }
    case 'error':
      emitProgress(msg.url, { phase: 'error' });
      settlePending(pending, 'err', new Error(msg.message));
      pendingByUrl.delete(msg.url);
      break;
    default:
      break;
  }
}

function payloadToGltf(payload: GltfTransferPayload): GLTF {
  return deserializeGltfTransferPayload(payload);
}

function nextId(): string {
  workerGeneration += 1;
  return `gltf-${workerGeneration}-${Date.now()}`;
}

/**
 * Load a GLTF/GLB via Web Worker (fetch + parse off main thread).
 * Deduplicates concurrent requests for the same URL.
 */
export function loadGltfViaWorker(
  url: string,
  onProgress?: ProgressListener
): Promise<GLTF> {
  if (!GLTF_WORKER_ENABLED) {
    return Promise.reject(new Error('GLTF worker loading is disabled'));
  }

  const cached = gltfCache.get(url);
  if (cached) {
    onProgress?.({
      url,
      loaded: 1,
      total: 1,
      percent: 100,
      phase: 'done',
    });
    return Promise.resolve(cached);
  }

  const inFlight = pendingByUrl.get(url);
  if (inFlight) {
    if (onProgress) inFlight.progressListeners.add(onProgress);
    return new Promise((resolve, reject) => {
      inFlight.subscribers.push({ resolve, reject });
    });
  }

  const id = nextId();
  const progressListeners = new Set<ProgressListener>();
  if (onProgress) progressListeners.add(onProgress);

  const promise = new Promise<GLTF>((resolve, reject) => {
    pendingByUrl.set(url, {
      id,
      url,
      subscribers: [{ resolve, reject }],
      progressListeners,
    });
    emitProgress(url, { phase: 'fetch', loaded: 0, total: 0 });
    ensureWorker().postMessage({ type: 'load', id, url } satisfies GltfWorkerRequest);
  });

  return promise;
}

export function cancelGltfWorkerLoad(url: string): void {
  const pending = pendingByUrl.get(url);
  if (!pending) return;
  worker?.postMessage({ type: 'cancel', id: pending.id } satisfies GltfWorkerRequest);
  settlePending(pending, 'err', new Error(`Cancelled load: ${url}`));
  pendingByUrl.delete(url);
}

export function getGltfLoadProgress(url: string): GltfLoadProgress | null {
  return progressByUrl.get(url) ?? null;
}

export function clearGltfWorkerCache(url?: string): void {
  if (url) {
    gltfCache.delete(url);
    progressByUrl.delete(url);
    cancelGltfWorkerLoad(url);
    return;
  }
  gltfCache.clear();
  progressByUrl.clear();
  for (const urlKey of [...pendingByUrl.keys()]) {
    cancelGltfWorkerLoad(urlKey);
  }
}

/** Terminate worker and release Draco/Meshopt resources inside the worker. */
export function disposeGltfWorker(): void {
  for (const pending of pendingByUrl.values()) {
    settlePending(pending, 'err', new Error('GLTF worker disposed'));
  }
  pendingByUrl.clear();
  progressByUrl.clear();

  if (worker) {
    worker.postMessage({ type: 'dispose' } satisfies GltfWorkerRequest);
    worker.removeEventListener('message', onWorkerMessage);
    worker.removeEventListener('error', onWorkerError);
    worker.terminate();
    worker = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => disposeGltfWorker());
}
