// Venue Environment — flat floor only (no walls/ceiling)

import { useRef, useMemo, Fragment } from 'react';
import type { Mesh } from 'three';
import { Grid } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

import { useEditorStore } from '../store/editorStore';
import { EDITOR_FLOOR_USERDATA, VENUE_COLORS } from '../editor.constants';

interface VenueEnvironmentProps {
  onDropAsset?: (x: number, z: number, assetId: string) => void;
  reservedStock?: Record<string, number>;
}

export function VenueEnvironment({ onDropAsset, reservedStock = {} }: VenueEnvironmentProps) {
  const venue = useEditorStore((state) => state.venue);
  const hasVenueModel = useEditorStore((state) => state.hasVenueModel);
  const draggingAsset = useEditorStore((state) => state.draggingAsset);
  const dropAssetAt = useEditorStore((state) => state.dropAssetAt);
  const selectAsset = useEditorStore((state) => state.selectAsset);
  const pointerDownHitInteractive = useEditorStore((state) => state.pointerDownHitInteractive);
  const setPointerDownHitInteractive = useEditorStore((state) => state.setPointerDownHitInteractive);
  const floorRef = useRef<Mesh>(null);
  const floorParentWarnedRef = useRef(false);
  const scene = useThree((state) => state.scene);

  const { floorSize } = venue;

  const gridExtent = useMemo(
    () => Math.max(floorSize.width, floorSize.depth) + 4,
    [floorSize.width, floorSize.depth]
  );

  // Defensive: GLB Scene roots or other bugs must never leave the floor under an asset transform.
  useFrame(() => {
    const floor = floorRef.current;
    if (!floor) return;
    if (floor.parent === scene) return;
    if (import.meta.env.DEV && !floorParentWarnedRef.current) {
      floorParentWarnedRef.current = true;
      const p = floor.parent;
      console.warn(
        '[DreamStage] editor-floor parent was not scene root — reparenting.',
        'parent:',
        p?.type,
        p?.name || '(unnamed)',
        'floor.parent === scene expected, got:',
        floor.parent
      );
    }
    scene.add(floor);
  });

  // Handle pointer up on floor - this catches both clicks and drag releases
  const handleFloorPointerUp = (event: any) => {
    if (!event.point) return;
    event.stopPropagation();

    // If we're dragging an asset, drop it here
    if (draggingAsset) {
      const assetId = draggingAsset.id;
      const success = dropAssetAt(event.point.x, event.point.z, reservedStock);
      if (success && onDropAsset) {
        onDropAsset(event.point.x, event.point.z, assetId);
      }
    } else {
      // Only deselect if pointerdown hit empty space — don't deselect when user clicked an asset or gizmo
      if (!pointerDownHitInteractive) {
        selectAsset(null);
      }
    }
    setPointerDownHitInteractive(false);
  };

  return (
    <Fragment>
      {/* Floor is a direct scene child (Fragment has no Object3D) — never under a shared venue wrapper group */}
      <mesh
        ref={floorRef}
        name="editor-floor"
        userData={EDITOR_FLOOR_USERDATA}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={!hasVenueModel}
        onPointerUp={handleFloorPointerUp}
      >
        <planeGeometry args={[floorSize.width, floorSize.depth]} />
        {hasVenueModel ? (
          <meshStandardMaterial transparent opacity={0} depthWrite={false} />
        ) : (
          <meshStandardMaterial color={VENUE_COLORS.floor} />
        )}
      </mesh>

      {!hasVenueModel && (
        <group>
          <Grid
            position={[0, 0.01, 0]}
            args={[gridExtent, gridExtent]}
            cellSize={1}
            cellThickness={0.3}
            cellColor="#d0ccc4"
            sectionSize={5}
            sectionThickness={0.6}
            sectionColor="#c0bab0"
            fadeDistance={50}
            fadeStrength={1}
            infiniteGrid={false}
          />
        </group>
      )}
    </Fragment>
  );
}
