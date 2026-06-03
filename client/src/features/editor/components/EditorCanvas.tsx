// Main R3F Canvas - Camera, lights, orbit controls, and scene container

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { useEditorStore, useSelectedAsset } from '../store/editorStore';
import { ORBIT_CAMERA_CONFIG, WALKTHROUGH_CAMERA_CONFIG } from '../editor.constants';
import { sanitizeTransformForRender } from '../utils/selectionUtils';
import { PointerCapture } from './PointerCapture';
import { VenueEnvironment } from './VenueEnvironment';
import { PlacedAsset } from './PlacedAsset';
import { EditorPlacedAssetErrorBoundary } from './EditorPlacedAssetErrorBoundary';
import { TransformGizmo } from './TransformGizmo';
import { TransformGizmoErrorBoundary } from './TransformGizmoErrorBoundary';
import { RotationRing } from './RotationRing';
import { SceneLighting } from './SceneLighting';
import { VenueModel } from './VenueModel';
import { Scene3DReadyNotifier } from './Scene3DReadyNotifier';
import { setEditorThreeRefs } from '../utils/editorThreeRefs';

interface EditorCanvasProps {
  onDropAsset?: (x: number, z: number, assetId: string) => void;
  reservedStock?: Record<string, number>;
  onReady?: () => void;
}

function DropFloor({ y }: { y: number }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, y + 0.05, 0]}
      visible={false}
      name="drop-floor"
      userData={{ isEditorFloor: true }}
    >
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function HtmlDropReceiver({
  reservedStock,
  onDropAsset,
}: {
  reservedStock: Record<string, number>;
  onDropAsset?: (x: number, z: number, assetId: string) => void;
}) {
  const { camera, scene, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const dropAssetAt = useEditorStore((s) => s.dropAssetAt);
  const setDraggingAsset = useEditorStore((s) => s.setDraggingAsset);

  useEffect(() => {
    const canvas = gl.domElement;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();

      const state = useEditorStore.getState();
      const draggingAsset = state.draggingAsset;
      if (!draggingAsset) return;

      let dropPoint: { x: number; y: number; z: number } | null = null;

      try {
        const rect = canvas.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(pointer, camera);

        const dropFloor = scene.getObjectByName('drop-floor');
        if (dropFloor) {
          const hits = raycaster.intersectObject(dropFloor, true);
          if (hits.length > 0) {
            const p = hits[0].point;
            dropPoint = { x: p.x, y: p.y, z: p.z };
          }
        }
      } catch (err) {
        console.warn('[DreamStage] Drop raycast failed; using fallback.', err);
      }

      if (!dropPoint) {
        const floorY = state.venueFloorY || 0;
        dropPoint = {
          x: (Math.random() - 0.5) * 4,
          y: floorY + 0.1,
          z: (Math.random() - 0.5) * 4,
        };
      }

      const rect = canvas.getBoundingClientRect();
      const dropPos2D = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(dropPos2D, camera);
      const assetMeshes: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj.userData.isPlacedAsset) assetMeshes.push(obj);
      });
      const assetHits = raycaster.intersectObjects(assetMeshes, true);
      if (assetHits.length > 0) {
        dropPoint.y = assetHits[0].point.y;
      }

      const success = dropAssetAt(dropPoint.x, dropPoint.z, reservedStock, dropPoint.y);
      if (success && onDropAsset) {
        onDropAsset(dropPoint.x, dropPoint.z, draggingAsset.id);
      }

      setDraggingAsset(null);
    };

    canvas.addEventListener('dragover', onDragOver);
    canvas.addEventListener('drop', onDrop);
    return () => {
      canvas.removeEventListener('dragover', onDragOver);
      canvas.removeEventListener('drop', onDrop);
    };
  }, [camera, scene, gl, raycaster, pointer, dropAssetAt, reservedStock, onDropAsset, setDraggingAsset]);

  return null;
}

function WalkthroughControls() {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const controlsRef = useRef<any>(null);
  const moveDir = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = new THREE.Vector3(0, 1, 0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { 
      keysRef.current[e.code] = true;
      if (['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = WALKTHROUGH_CAMERA_CONFIG.moveSpeed * delta;
    const keys = keysRef.current;

    // Get the direction camera is facing (ignore Y so we stay on ground)
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();

    // Right is perpendicular to forward
    right.current.crossVectors(forward.current, up).normalize();

    moveDir.current.set(0, 0, 0);

    if (keys['KeyW'] || keys['ArrowUp']) moveDir.current.addScaledVector(forward.current, speed);
    if (keys['KeyS'] || keys['ArrowDown']) moveDir.current.addScaledVector(forward.current, -speed);
    if (keys['KeyA'] || keys['ArrowLeft']) moveDir.current.addScaledVector(right.current, -speed);
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.current.addScaledVector(right.current, speed);

    camera.position.add(moveDir.current);
    camera.position.y = WALKTHROUGH_CAMERA_CONFIG.height;

    // Update orbit controls target to stay in front of camera
    if (controlsRef.current) {
      const target = new THREE.Vector3();
      target.copy(camera.position).addScaledVector(forward.current, 1);
      target.y = WALKTHROUGH_CAMERA_CONFIG.height;
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.8}
    />
  );
}

export function EditorCanvas({ onDropAsset, reservedStock = {}, onReady }: EditorCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const viewMode = useEditorStore((state) => state.viewMode);
  const isLocked = useEditorStore((state) => state.isLocked);
  const placedAssets = useEditorStore((state) => state.placedAssets);
  const selectedAssetId = useEditorStore((state) => state.selectedAssetId);
  const transformMode = useEditorStore((state) => state.transformMode);
  const selectAsset = useEditorStore((state) => state.selectAsset);
  const isDraggingPlacedAsset = useEditorStore((state) => state.isDraggingPlacedAsset);
  const selectedAsset = useSelectedAsset();
  const venueFloorY = useEditorStore((s) => s.venueFloorY);

  // Imperatively disable OrbitControls when asset selected or dragging — ensures no race with pointer events
  const orbitEnabled = !selectedAssetId && !isDraggingPlacedAsset;
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = orbitEnabled;
    }
  }, [orbitEnabled]);

  useEffect(() => {
    if (viewMode === 'orbit') {
      document.exitPointerLock();
    }
  }, [viewMode]);

  const handleCanvasClick = () => {
    selectAsset(null);
  };

  return (
    <Canvas
      shadows
      onPointerMissed={handleCanvasClick}
      onCreated={(state) => {
        const { gl, scene } = state;
        setEditorThreeRefs({ gl, scene });
        const origRender = gl.render.bind(gl);
        gl.render = (s: THREE.Object3D, camera: THREE.Camera) => {
          try {
            origRender(s as THREE.Scene, camera);
          } catch (err) {
            console.error('[DreamStage] WebGL render error (scene continues):', err);
          }
        };
      }}
      style={{ width: '100%', height: '100%', background: '#faf8f5' }}
    >
      <Suspense fallback={null}>
        {onReady && <Scene3DReadyNotifier onReady={onReady} />}
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          fov={viewMode === 'walkthrough' ? WALKTHROUGH_CAMERA_CONFIG.fov : ORBIT_CAMERA_CONFIG.fov}
          near={ORBIT_CAMERA_CONFIG.near}
          far={ORBIT_CAMERA_CONFIG.far}
          position={[
            ORBIT_CAMERA_CONFIG.position.x,
            ORBIT_CAMERA_CONFIG.position.y,
            ORBIT_CAMERA_CONFIG.position.z,
          ]}
        />

        {/* Orbit controls - disabled when asset selected so TransformControls receives Move/Rotate/Scale drags */}
        {viewMode === 'orbit' && (
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={orbitEnabled}
            enableDamping
            dampingFactor={0.05}
            target={[
              ORBIT_CAMERA_CONFIG.target.x,
              ORBIT_CAMERA_CONFIG.target.y,
              ORBIT_CAMERA_CONFIG.target.z,
            ]}
            minDistance={ORBIT_CAMERA_CONFIG.minDistance}
            maxDistance={ORBIT_CAMERA_CONFIG.maxDistance}
            maxPolarAngle={ORBIT_CAMERA_CONFIG.maxPolarAngle}
          />
        )}

        {viewMode === 'walkthrough' && <WalkthroughControls />}

        {/* Manual raycast for GLB selection - traverses up from hit mesh to find assetId */}
        <PointerCapture />

        {/* Scene lighting */}
        <SceneLighting />
        <Environment preset="apartment" background={false} />

        {/* Venue model (read-only) */}
        <VenueModel filename="Marque_Scene11.glb" />

        {/* Invisible, reliable drop target for HTML DnD */}
        <DropFloor y={venueFloorY || 0} />
        <HtmlDropReceiver reservedStock={reservedStock} onDropAsset={onDropAsset} />

        {/* Venue floor and walls */}
        <VenueEnvironment onDropAsset={onDropAsset} reservedStock={reservedStock} />

        {/* Placed assets — each wrapped so one bad GLB cannot blank the entire canvas */}
        {placedAssets.map((asset) => (
          <EditorPlacedAssetErrorBoundary key={asset.id} assetId={asset.id} assetName={asset.name}>
            <PlacedAsset
              asset={asset}
              isSelected={asset.id === selectedAssetId}
              disabled={isLocked}
            />
          </EditorPlacedAssetErrorBoundary>
        ))}

        {/* Clear rotation ring when in Rotate mode */}
        {selectedAsset && transformMode === 'rotate' && !isLocked && (
          <RotationRing position={sanitizeTransformForRender(selectedAsset.transform).position} />
        )}

        {/* Transform gizmo for selected asset */}
        {selectedAssetId && !isLocked && (
          <TransformGizmoErrorBoundary>
            <TransformGizmo />
          </TransformGizmoErrorBoundary>
        )}
      </Suspense>
    </Canvas>
  );
}
