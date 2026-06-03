// TransformGizmo - Wrapper around drei TransformControls for selected asset

import { useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { Object3D } from 'three';

import { useEditorStore, useSelectedAsset } from '../store/editorStore';
import {
  isFiniteObjectWorldMatrix,
  resolvePlacedAssetTransformRoot,
} from '../utils/selectionUtils';

export function TransformGizmo() {
  const transformRef = useRef<any>(null);
  const { scene } = useThree((state) => ({ scene: state.scene }));

  const selectedAsset = useSelectedAsset();
  const placedInstanceId = selectedAsset?.id ?? null;

  const transformMode = useEditorStore((state) => state.transformMode);
  const updateAssetTransform = useEditorStore((state) => state.updateAssetTransform);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  const attachObject = useMemo((): Object3D | null => {
    if (!placedInstanceId) return null;
    const root = resolvePlacedAssetTransformRoot(scene, placedInstanceId);
    if (!root) return null;
    if (!isFiniteObjectWorldMatrix(root)) {
      console.warn(
        '[DreamStage] Skipping TransformControls — non-finite world matrix on asset root:',
        placedInstanceId
      );
      return null;
    }
    return root;
  }, [scene, placedInstanceId]);

  useLayoutEffect(() => {
    if (!attachObject || !placedInstanceId) return;
    if (!import.meta.env.DEV) return;
    console.log('[DreamStage] TransformControls attach target:', {
      name: attachObject.name,
      type: attachObject.type,
      userData: attachObject.userData,
      parentType: attachObject.parent?.type,
      parentName: attachObject.parent?.name,
    });
  }, [attachObject, placedInstanceId]);

  // Handle transform changes
  const handleTransformChange = useCallback(() => {
    try {
      if (!transformRef.current || !selectedAsset) return;

      const controls = transformRef.current;
      const object = controls.object;

      if (!object) return;
      if (object.userData?.isEditorFloor) return;

      const rotation = object.rotation;
      const scale = object.scale;
      const stored = selectedAsset.transform;

      // In rotate mode: only update rotation, preserve position exactly (no drift)
      if (transformMode === 'rotate') {
        updateAssetTransform(selectedAsset.id, {
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        });
        return;
      }

      // Translate/scale mode: update position, enforce uniform scale
      const baseY = stored.position.y;
      const uniformScale = Math.max(scale.x, scale.y, scale.z, 0.01);
      updateAssetTransform(selectedAsset.id, {
        position: { x: object.position.x, y: baseY, z: object.position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: uniformScale, y: uniformScale, z: uniformScale },
      });
    } catch (err) {
      console.error('[DreamStage] Transform change handler failed:', err);
    }
  }, [selectedAsset, transformMode, updateAssetTransform]);

  // Push to history when transform ends
  const handleTransformEnd = useCallback(() => {
    try {
      pushHistory();
    } catch (err) {
      console.error('[DreamStage] Transform end / history failed:', err);
    }
  }, [pushHistory]);

  // Explicitly set mode on controls when it changes - drei may not sync the mode prop
  useEffect(() => {
    try {
      if (transformRef.current?.setMode) {
        transformRef.current.setMode(transformMode);
      }
    } catch (err) {
      console.error('[DreamStage] setMode failed:', err);
    }
  }, [transformMode]);

  if (!selectedAsset) return null;
  if (!attachObject) return null;

  // In rotate mode: constrain to Y-axis only so drag left/right rotates horizontally around center
  const rotateOnlyY = transformMode === 'rotate';

  return (
    <TransformControls
      ref={transformRef}
      object={attachObject}
      mode={transformMode}
      size={0.75}
      space="local"
      axis={rotateOnlyY ? 'Y' : undefined}
      showX={!rotateOnlyY}
      showY={true}
      showZ={!rotateOnlyY}
      onObjectChange={handleTransformChange}
      onMouseUp={handleTransformEnd}
    />
  );
}
