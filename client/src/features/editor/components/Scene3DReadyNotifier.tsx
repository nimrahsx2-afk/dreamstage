import { useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';

/** Signals when drei Suspense / GLTF loading has finished. */
export function Scene3DReadyNotifier({ onReady }: { onReady: () => void }) {
  const { active, progress, item } = useProgress();
  const sawActive = useRef(false);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (active) {
      sawActive.current = true;
      return;
    }
    if (sawActive.current || progress >= 100) {
      fired.current = true;
      onReady();
    }
  }, [active, progress, onReady]);

  useEffect(() => {
    if (!import.meta.env.DEV || !item) return;
    if (active) {
      console.debug('[DreamStage:EditorLoad] GLTF loading:', item, `${Math.round(progress)}%`);
    }
  }, [active, item, progress]);

  return null;
}
