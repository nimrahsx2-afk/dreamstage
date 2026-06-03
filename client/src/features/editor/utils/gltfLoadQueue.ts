/**
 * Serializes GLTF fetch/parse work to avoid parallel worker + deserialize memory spikes.
 */

import { GLTF_LOAD_MAX_CONCURRENCY, GLTF_LOAD_YIELD_MS } from '../editor.constants';

type QueueTask<T> = {
  key: string;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

const queue: QueueTask<unknown>[] = [];
const inFlightByKey = new Map<string, Promise<unknown>>();
let activeCount = 0;

function yieldBetweenLoads(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    if (GLTF_LOAD_YIELD_MS > 0) {
      window.setTimeout(resolve, GLTF_LOAD_YIELD_MS);
      return;
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 64 });
    } else {
      window.setTimeout(resolve, 0);
    }
  });
}

function pump(): void {
  while (activeCount < GLTF_LOAD_MAX_CONCURRENCY && queue.length > 0) {
    const task = queue.shift()!;
    activeCount += 1;

    void (async () => {
      try {
        const result = await task.run();
        await yieldBetweenLoads();
        task.resolve(result);
      } catch (err) {
        task.reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        activeCount -= 1;
        pump();
      }
    })();
  }
}

/**
 * Enqueue a GLTF load task. Same `key` while pending returns the same promise (dedupe).
 * Errors reject only that task; the queue continues with the next item.
 */
export function enqueueGltfLoad<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlightByKey.get(key);
  if (existing) return existing as Promise<T>;

  const promise = new Promise<T>((resolve, reject) => {
    queue.push({
      key,
      run,
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    pump();
  }).finally(() => {
    if (inFlightByKey.get(key) === promise) {
      inFlightByKey.delete(key);
    }
  });

  inFlightByKey.set(key, promise);
  return promise;
}

/** Remove a queued (not yet running) load. */
export function cancelQueuedGltfLoad(key: string): boolean {
  const idx = queue.findIndex((t) => t.key === key);
  if (idx === -1) return false;
  const [task] = queue.splice(idx, 1);
  task.reject(new Error(`Cancelled queued GLTF load: ${key}`));
  return true;
}

export function clearGltfLoadQueue(): void {
  while (queue.length > 0) {
    const task = queue.shift()!;
    task.reject(new Error('GLTF load queue cleared'));
  }
  for (const [, promise] of inFlightByKey) {
    void promise;
  }
  inFlightByKey.clear();
}

export function getGltfLoadQueueStats(): {
  queued: number;
  active: number;
  maxConcurrency: number;
} {
  return {
    queued: queue.length,
    active: activeCount,
    maxConcurrency: GLTF_LOAD_MAX_CONCURRENCY,
  };
}
