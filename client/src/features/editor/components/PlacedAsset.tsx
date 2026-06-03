// PlacedAsset - Individual asset primitive or GLB model with hover/select/drag interactions

import { useRef, useState, useMemo, useEffect, useLayoutEffect, Suspense } from 'react';
import * as THREE from 'three';
import type { Mesh } from 'three';
import { Html } from '@react-three/drei';
import { useDreamStageGltf } from '../hooks/useDreamStageGltf';
import {
  getProcessedGltfTemplate,
  shallowCloneGltfHierarchy,
} from '../utils/glbInstanceClone';
import { markMeshForDisposal } from '../utils/disposeMeshes';
import {
  disposePlacedAssetById,
  registerPlacedAssetObject,
} from '../utils/placedAssetSceneRegistry';
import { useThree } from '@react-three/fiber';

import { useEditorStore } from '../store/editorStore';
import type { PlacedAssetData } from '../editor.types';
import { EditorPlacedAssetErrorBoundary } from './EditorPlacedAssetErrorBoundary';
import { isFiniteTransform, sanitizeTransformForRender } from '../utils/selectionUtils';
import { resolveGlbUrl } from '../utils/glbPath';
import {
  ASSET_PRIMITIVES,
  DEFAULT_PRIMITIVE,
  SELECTION_OUTLINE_COLOR,
  isBanquetChairGlbPivotFix,
} from '../editor.constants';

function makeGlbFallbackMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb45309,
    metalness: 0.2,
    roughness: 0.85,
  });
}

function buildGlbProcessFallbackRoot(assetId: string): THREE.Group {
  const root = new THREE.Group();
  root.name = `glb-process-fallback-${assetId}`;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), makeGlbFallbackMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.assetId = assetId;
  markMeshForDisposal(mesh);
  root.add(mesh);
  return root;
}

/**
 * Loads and renders a GLB model. Uses drei's useGLTF which caches by path — same model_ref
 * is only downloaded once. Each instance shallow-clones a shared processed template (reused
 * geometry/materials; independent Object3D transforms for gizmo / raycast / removal).
 */
function GlbModel({
  modelRef,
  assetId,
  useMeshBoundsRecenter,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  castShadow,
  receiveShadow,
}: {
  modelRef: string;
  assetId: string;
  /** Banquet chair only — same table/cocktail path unchanged when false */
  useMeshBoundsRecenter: boolean;
  onPointerDown: (e: any) => void;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const path = resolveGlbUrl(modelRef)!;
  const { scene } = useDreamStageGltf(path); // Cached by path — same model_ref = one download

  const template = useMemo(() => {
    try {
      return getProcessedGltfTemplate(scene, path, useMeshBoundsRecenter);
    } catch (err) {
      console.warn('[DreamStage] GLB template build failed:', path, err);
      return null;
    }
  }, [scene, path, useMeshBoundsRecenter]);

  const { cloned, normScale, normSize } = useMemo(() => {
    if (!template) {
      const s = buildGlbProcessFallbackRoot(assetId);
      s.userData.assetId = assetId;
      return { cloned: s, normScale: 1, normSize: new THREE.Vector3(1, 1, 1) };
    }

    try {
      const s = shallowCloneGltfHierarchy(template.root);
      s.userData.assetId = assetId;
      s.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = castShadow ?? true;
          child.receiveShadow = receiveShadow ?? true;
          child.userData.assetId = assetId;
        }
      });
      return {
        cloned: s,
        normScale: template.normScale,
        normSize: template.normSize,
      };
    } catch (err) {
      console.warn('[DreamStage] GLB shallow clone failed — placeholder only:', path, err);
      const s = buildGlbProcessFallbackRoot(assetId);
      s.userData.assetId = assetId;
      return { cloned: s, normScale: 1, normSize: new THREE.Vector3(1, 1, 1) };
    }
  }, [template, path, assetId, castShadow, receiveShadow]);

  useEffect(() => {
    registerPlacedAssetObject(assetId, cloned, modelRef);
    return () => {
      disposePlacedAssetById(assetId);
    };
  }, [cloned, assetId, modelRef]);

  const hitboxRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (hitboxRef.current) {
      markMeshForDisposal(hitboxRef.current);
    }
  }, [normSize.x, normSize.y, normSize.z]);

  return (
    <group name={`glb-wrapper-${assetId}`} userData={{ assetId, type: 'glbWrapper' }}>
      {/*
        TransformControls attaches to outer `asset-{id}` (placement + rotation + uniform scale).
        This inner group stays at identity; recentered/grounded GLB lives under primitive only.
      */}
      <group name={`glb-visual-root-${assetId}`}>
        <primitive
          object={cloned}
          scale={[normScale, normScale, normScale]}
          onPointerDown={onPointerDown}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        />
      </group>
      <mesh
        ref={hitboxRef}
        name={`glb-hitbox-${assetId}`}
        userData={{ assetId, type: 'glbHitbox' }}
        onPointerDown={onPointerDown}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[normSize.x, normSize.y, normSize.z]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

interface PlacedAssetProps {
  asset: PlacedAssetData;
  isSelected: boolean;
  disabled?: boolean;
}

export function PlacedAsset({ asset, isSelected, disabled }: PlacedAssetProps) {
  const meshRef = useRef<Mesh>(null);
  const placedRootRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; z: number } | null>(null);

  const { camera, gl } = useThree();

  const selectAsset = useEditorStore((state) => state.selectAsset);
  const transformMode = useEditorStore((state) => state.transformMode);
  const setHoveredAsset = useEditorStore((state) => state.setHoveredAsset);
  const updateAssetTransform = useEditorStore((state) => state.updateAssetTransform);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const setDraggingPlacedAsset = useEditorStore((state) => state.setDraggingPlacedAsset);
  const venueFloorY = useEditorStore((s) => s.venueFloorY);
  const attachAsset = useEditorStore((s) => s.attachAsset);
  const detachAsset = useEditorStore((s) => s.detachAsset);
  const placedAssets = useEditorStore((s) => s.placedAssets);

  // Floor plane for raycasting (aligned to venue floor)
  const floorPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -venueFloorY),
    [venueFloorY]
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Get world position from mouse coordinates
  const getFloorPosition = (clientX: number, clientY: number): { x: number; z: number } | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);

    if (hit) {
      return { x: intersection.x, z: intersection.z };
    }
    return null;
  };

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging || disabled) return;

    // Notify store that we're dragging (disables orbit controls)
    setDraggingPlacedAsset(true);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      // First check if we're hovering over another placed asset
      const assetMeshes: THREE.Object3D[] = [];
      const { scene } = camera as any;
      raycaster.camera = camera;
      
      // Get all placed asset objects except current one
      const allObjects: THREE.Object3D[] = [];
      camera.parent?.traverse((obj) => {
        if (obj.userData.isPlacedAsset && obj.userData.assetId !== asset.id) {
          allObjects.push(obj);
        }
      });

      const assetHits = raycaster.intersectObjects(allObjects, true);
      
      let newY = venueFloorY + 0.1;
      if (assetHits.length > 0) {
        newY = assetHits[0].point.y + 0.05;
      }

      const intersection = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
      if (hit && placedRootRef.current) {
        placedRootRef.current.position.set(intersection.x, newY, intersection.z);
      }
    };

    const handleMouseUp = () => {
      if (placedRootRef.current) {
        const p = placedRootRef.current.position;
        updateAssetTransform(asset.id, {
          position: { x: p.x, y: p.y, z: p.z },
        });
      }
      setIsDragging(false);
      setDraggingPlacedAsset(false);
      dragStartPos.current = null;
      document.body.style.cursor = 'auto';
      pushHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDraggingPlacedAsset(false);
    };
  }, [isDragging, disabled, asset.id, updateAssetTransform, pushHistory, setDraggingPlacedAsset, camera, gl, floorPlane, raycaster, venueFloorY]);

  useEffect(() => {
    if (!isSelected || disabled) return;
    
    const STEP = 0.2;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      
      let dx = 0, dz = 0, dy = 0;
      switch(e.key) {
        case 'ArrowLeft': dx = -STEP; break;
        case 'ArrowRight': dx = STEP; break;
        case 'ArrowUp': dz = -STEP; break;
        case 'ArrowDown': dz = STEP; break;
        case 'u': case 'U': dy = STEP; break;
        case 'd': case 'D': dy = -STEP; break;
        case 'f': case 'F': {
          // Find nearest asset below current asset
          const currentPos = asset.transform.position;
          let nearestAsset: PlacedAssetData | null = null;
          let nearestDist = Infinity;

          placedAssets.forEach((other) => {
            if (other.id === asset.id) return;
            const odx = other.transform.position.x - currentPos.x;
            const odz = other.transform.position.z - currentPos.z;
            const dist = Math.sqrt(odx * odx + odz * odz);
            if (dist < 2 && dist < nearestDist) {
              nearestDist = dist;
              nearestAsset = other;
            }
          });

          if (nearestAsset) {
            attachAsset(asset.id, nearestAsset.id);
          }
          return;
        }
        case 'g': case 'G':
          detachAsset(asset.id);
          return;
        default: return;
      }
      
      e.preventDefault();
      
      const current = asset.transform.position;
      updateAssetTransform(asset.id, {
        position: {
          x: current.x + dx,
          y: current.y + dy,
          z: current.z + dz,
        }
      });
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','u','U','d','D'].includes(e.key)) {
        pushHistory();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSelected, disabled, asset.id, asset.transform.position, updateAssetTransform, pushHistory, placedAssets, attachAsset, detachAsset]);

  // Get primitive config based on asset category and name
  const primitiveConfig = useMemo(() => {
    const categoryPrimitives = ASSET_PRIMITIVES[asset.category];
    if (!categoryPrimitives) return DEFAULT_PRIMITIVE;

    // Try to match by asset name keywords
    const assetNameLower = asset.name.toLowerCase();
    for (const [key, config] of Object.entries(categoryPrimitives)) {
      if (assetNameLower.includes(key)) {
        return config;
      }
    }

    // Return first config in category as fallback
    const firstKey = Object.keys(categoryPrimitives)[0];
    return categoryPrimitives[firstKey] || DEFAULT_PRIMITIVE;
  }, [asset.category, asset.name]);

  const { shape, color, hoverColor, dimensions, emissiveIntensity, opacity } =
    primitiveConfig;

  // Determine current color based on state
  const currentColor = isHovered && !isSelected ? hoverColor : color;

  const useGlb = !!(asset.modelRef && asset.modelRef.trim());

  useLayoutEffect(() => {
    if (useGlb || !placedRootRef.current) return;
    registerPlacedAssetObject(asset.id, placedRootRef.current, asset.modelRef, {
      disposeSharedResources: true,
    });
    return () => {
      disposePlacedAssetById(asset.id);
    };
  }, [useGlb, asset.id, asset.modelRef]);

  const useMeshBoundsRecenter = useMemo(
    () => isBanquetChairGlbPivotFix(asset.name, asset.modelRef),
    [asset.name, asset.modelRef]
  );

  // Start dragging on pointer down - only in Translate mode (in Rotate/Scale use gizmo, not position-drag)
  const handlePointerDown = (event: any) => {
    if (disabled) return;
    if (asset.transform.locked && !isSelected) return;
    try {
      event.stopPropagation();

      // Always select the asset
      selectAsset(asset.id);

      // Only start position-drag in Translate mode; in Rotate/Scale mode the gizmo handles rotation/scale
      if (transformMode === 'translate') {
        setDraggingPlacedAsset(true); // Disable orbit immediately, before any pointermove
        setIsDragging(true);
        dragStartPos.current = {
          x: asset.transform.position.x,
          z: asset.transform.position.z,
        };
        document.body.style.cursor = 'grabbing';
      }
    } catch (err) {
      console.error('[DreamStage] PlacedAsset pointerdown failed:', err);
    }
  };

  const handlePointerOver = (event: any) => {
    if (disabled) return;
    if (asset.transform.locked && !isSelected) return;
    try {
      event.stopPropagation();
      setIsHovered(true);
      setHoveredAsset(asset.id);
      if (!isDragging) {
        document.body.style.cursor = 'grab';
      }
    } catch (err) {
      console.error('[DreamStage] PlacedAsset pointerover failed:', err);
    }
  };

  const handlePointerOut = () => {
    setIsHovered(false);
    setHoveredAsset(null);
    if (!isDragging) {
      document.body.style.cursor = 'auto';
    }
  };

  // Render geometry based on shape type (scale applied via group)
  const renderGeometry = () => {
    switch (shape) {
      case 'sphere':
        return (
          <sphereGeometry
            args={[dimensions.x * 0.5, 32, 32]}
          />
        );
      case 'cylinder':
        return (
          <cylinderGeometry
            args={[
              dimensions.x * 0.5,
              dimensions.x * 0.5,
              dimensions.y,
              32,
            ]}
          />
        );
      case 'box':
      default:
        return (
          <boxGeometry
            args={[dimensions.x, dimensions.y, dimensions.z]}
          />
        );
    }
  };

  const tSafe = sanitizeTransformForRender(asset.transform);
  const { scale } = tSafe;
  const yOffset = useGlb
    ? 0 // GLB normalized, origin at base
    : shape === 'sphere'
      ? dimensions.y * scale.y * 0.5
      : dimensions.y * scale.y * 0.5;
  const labelHeight = useGlb ? 1 : dimensions.y * scale.y * 0.5 + 0.5;

  return (
    <group
      ref={placedRootRef}
      name={`asset-${asset.id}`}
      userData={{ assetId: asset.id, type: 'placedAsset', isPlacedAsset: true }}
      position={[
        tSafe.position.x,
        tSafe.position.y + yOffset,
        tSafe.position.z,
      ]}
      rotation={[tSafe.rotation.x, tSafe.rotation.y, tSafe.rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
    >
      {useGlb ? (
        <Suspense fallback={<mesh><boxGeometry args={[0.5, 0.5, 0.5]} /><meshBasicMaterial color="#999" wireframe /></mesh>}>
          <EditorPlacedAssetErrorBoundary assetId={asset.id} assetName={asset.name}>
            <GlbModel
              modelRef={asset.modelRef!.trim()}
              assetId={asset.id}
              useMeshBoundsRecenter={useMeshBoundsRecenter}
              onPointerDown={handlePointerDown}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              castShadow
              receiveShadow
            />
          </EditorPlacedAssetErrorBoundary>
        </Suspense>
      ) : (
        <>
          {/* Main mesh */}
          <mesh
            ref={meshRef}
            onPointerDown={handlePointerDown}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            castShadow
            receiveShadow
          >
            {renderGeometry()}
            <meshStandardMaterial
              color={currentColor}
              transparent={opacity !== undefined}
              opacity={opacity ?? 1}
              emissive={emissiveIntensity ? currentColor : undefined}
              emissiveIntensity={emissiveIntensity ?? 0}
            />
          </mesh>

          {/* Selection outline */}
          {isSelected && (
            <mesh scale={[1.05, 1.05, 1.05]}>
              {renderGeometry()}
              <meshBasicMaterial
                color={SELECTION_OUTLINE_COLOR}
                transparent
                opacity={0.3}
                wireframe
              />
            </mesh>
          )}
        </>
      )}

      {/* Billboard label - only when selected; skip if transform is non-finite (prevents drei Html crash) */}
      {isSelected && isFiniteTransform(asset.transform) && (
        <Html
          position={[0, labelHeight, 0]}
          center
          distanceFactor={10}
          style={{
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#2a2118',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 32px rgba(42, 33, 24, 0.15)',
            }}
          >
            {asset.name}
            {asset.parentId && (
              <span
                style={{
                  marginLeft: 6,
                  background: '#10b981',
                  borderRadius: '50%',
                  width: 8,
                  height: 8,
                  display: 'inline-block',
                }}
                title="Attached to parent"
              />
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
