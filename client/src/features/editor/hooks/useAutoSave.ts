// Debounced auto-save — persists full scene shortly after any edit (place / move / rotate / delete / venue / lighting)

import { useEffect, useRef } from 'react';

import { useEditorStore } from '../store/editorStore';
import { SCENE_DEBOUNCED_SAVE_MS } from '../editor.constants';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave({ onSave, enabled: _enabledProp = true }: UseAutoSaveOptions) {
  void _enabledProp;
  const enabled = false; // temporarily disable for testing
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const isDirty = useEditorStore((state) => state.isDirty);
  const isLocked = useEditorStore((state) => state.isLocked);
  const placedAssets = useEditorStore((state) => state.placedAssets);
  const lighting = useEditorStore((state) => state.lighting);
  const venue = useEditorStore((state) => state.venue);

  // Debounce: any mutation that marks the store dirty schedules a save 300ms after the last change
  useEffect(() => {
    if (!enabled || isLocked || !isDirty) return;

    const id = window.setTimeout(() => {
      void onSaveRef.current().catch((err) => {
        console.error('[DreamStage] Debounced auto-save failed:', err);
      });
    }, SCENE_DEBOUNCED_SAVE_MS);

    return () => window.clearTimeout(id);
  }, [enabled, isLocked, isDirty, placedAssets, lighting, venue]);

  // Flush on tab close / refresh so work is not lost if the tab dies before debounce fires
  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      const { isDirty: d, isLocked: l } = useEditorStore.getState();
      if (d && !l) {
        void onSaveRef.current().catch(() => {});
      }
    };

    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [enabled]);

  // Best-effort save when the editor unmounts (e.g. navigation away)
  useEffect(() => {
    return () => {
      const { isDirty: d, isLocked: l } = useEditorStore.getState();
      if (enabled && d && !l) {
        void onSaveRef.current().catch(() => {});
      }
    };
  }, [enabled]);
}
