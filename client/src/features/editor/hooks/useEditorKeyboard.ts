// Editor Keyboard Hook - Handles shortcuts for transform modes, undo/redo, delete

import { useEffect, useCallback } from 'react';

import { useEditorStore, useCanUndo, useCanRedo, useIsLocked } from '../store/editorStore';
import { KEYBOARD_SHORTCUTS } from '../editor.constants';

export function useEditorKeyboard() {
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const setShiftHeld = useEditorStore((state) => state.setShiftHeld);
  const selectedAssetId = useEditorStore((state) => state.selectedAssetId);
  const removeAsset = useEditorStore((state) => state.removeAsset);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const isLocked = useIsLocked();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // Shift key for grid snap
      if (event.key === 'Shift') {
        setShiftHeld(true);
        return;
      }

      // Ctrl/Cmd combinations
      if (event.ctrlKey || event.metaKey) {
        if (key === KEYBOARD_SHORTCUTS.undo && canUndo && !isLocked) {
          event.preventDefault();
          undo();
          return;
        }

        if (key === KEYBOARD_SHORTCUTS.redo && canRedo && !isLocked) {
          event.preventDefault();
          redo();
          return;
        }
      }

      // Skip if locked
      if (isLocked) return;

      // Transform mode shortcuts
      if (key === KEYBOARD_SHORTCUTS.translate) {
        setTransformMode('translate');
        return;
      }

      if (key === KEYBOARD_SHORTCUTS.rotate) {
        setTransformMode('rotate');
        return;
      }

      if (key === KEYBOARD_SHORTCUTS.scale) {
        setTransformMode('scale');
        return;
      }

      // Escape clears selection
      if (event.key === 'Escape' && selectedAssetId) {
        event.preventDefault();
        useEditorStore.getState().selectAsset(null);
        return;
      }

      // Delete selected asset (Delete or Backspace)
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedAssetId) {
        event.preventDefault();
        removeAsset(selectedAssetId);
        return;
      }
    },
    [
      canUndo,
      canRedo,
      isLocked,
      selectedAssetId,
      setTransformMode,
      setShiftHeld,
      undo,
      redo,
      removeAsset,
    ]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftHeld(false);
      }
    },
    [setShiftHeld]
  );

  useEffect(() => {
    // Use capture phase so Delete/Backspace is handled before TransformControls or other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
