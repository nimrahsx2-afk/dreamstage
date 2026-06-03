// PointerCapture - Manual raycast to select GLB assets when clicking on child meshes
// Traverses up from hit object to find parent Group with userData.assetId

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

import { useEditorStore } from '../store/editorStore';
import { findPlacedInstanceIdFromHit } from '../utils/selectionUtils';

function isTransformControlsHit(object: THREE.Object3D | null): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if ((current as any).isTransformControls || (current as any).isTransformControlsGizmo) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isEditorFloorHit(object: THREE.Object3D | null): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData?.isEditorFloor) return true;
    current = current.parent;
  }
  return false;
}

export function PointerCapture() {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const selectAsset = useEditorStore((state) => state.selectAsset);
  const setPointerDownHitInteractive = useEditorStore((state) => state.setPointerDownHitInteractive);
  const isLocked = useEditorStore((state) => state.isLocked);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (isLocked) return;

      try {
        const rect = canvas.getBoundingClientRect();
        pointer.current.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        raycaster.current.setFromCamera(pointer.current, camera);
        const intersects = raycaster.current.intersectObjects(scene.children, true);

        // Skip if user clicked on TransformControls (rotation/scale handles) — let gizmo handle it
        // Still mark as interactive so we don't deselect on pointerup
        if (intersects.length > 0 && isTransformControlsHit(intersects[0].object)) {
          setPointerDownHitInteractive(true);
          return;
        }

        for (const hit of intersects) {
          if (isEditorFloorHit(hit.object)) continue;
          const placedInstanceId = findPlacedInstanceIdFromHit(hit.object);
          if (placedInstanceId) {
            setPointerDownHitInteractive(true);
            selectAsset(placedInstanceId);
            return;
          }
        }

        // Hit empty space (floor, walls, or nothing)
        setPointerDownHitInteractive(false);
      } catch (err) {
        console.error('[DreamStage] Selection (pointerdown) failed:', err);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    return () => canvas.removeEventListener('pointerdown', onPointerDown);
  }, [camera, scene, gl, selectAsset, setPointerDownHitInteractive, isLocked]);

  return null;
}
