import { useEffect, useState } from 'react';

import {
  getGltfLoadProgress,
  loadGltfViaWorker,
  type GltfLoadProgress,
} from '../services/gltfWorkerClient';

const EMPTY: GltfLoadProgress = {
  url: '',
  loaded: 0,
  total: 0,
  percent: 0,
  phase: 'fetch',
};

/**
 * Subscribe to worker load progress for a model URL.
 * Optionally kicks off a preload via the worker when `startLoad` is true.
 */
export function useGltfWorkerProgress(
  url: string | null,
  options?: { startLoad?: boolean }
) {
  const [progress, setProgress] = useState<GltfLoadProgress>(() =>
    url ? getGltfLoadProgress(url) ?? { ...EMPTY, url } : EMPTY
  );

  useEffect(() => {
    if (!url) {
      setProgress(EMPTY);
      return;
    }

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const current = getGltfLoadProgress(url);
      if (current) setProgress(current);
    };

    const interval = window.setInterval(tick, 150);
    tick();

    if (options?.startLoad) {
      void loadGltfViaWorker(url, (p) => {
        if (!cancelled) setProgress(p);
      }).catch(() => {
        /* errors surface via loader fallback */
      });
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [url, options?.startLoad]);

  return progress;
}
