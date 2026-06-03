import { useEffect, useMemo } from 'react';
import { Group, Mesh, Object3D } from 'three';
import { useGLTF } from '@react-three/drei';
import { useEditorStore } from '../store/editorStore';

interface VenueModelProps {
  filename: string;
  onFloorDetected?: (floorY: number, centerX: number, centerZ: number) => void;
}

export function VenueModel({ filename, onFloorDetected }: VenueModelProps) {
  const url = useMemo(() => `/models/${filename}`, [filename]);
  const gltf = useGLTF(url);
  const setVenueHallBounds = useEditorStore((s) => s.setVenueHallBounds);
  const setHasVenueModel = useEditorStore((s) => s.setHasVenueModel);

  // Clone so any positioning/scaling doesn't mutate drei's shared cache.
  const scene = useMemo<Object3D>(() => {
    const root = (gltf as any)?.scene as Object3D | undefined;
    const cloned = (root ? root.clone(true) : new Group()) as Object3D;
    // const extReport = getCachedGlbExtensionReport(url);
    // applyGltfMaterialFallbacks(cloned, {
    //   modelPath: url,
    //   usedDeprecatedSpecGloss: extReport?.deprecated.includes(
    //     KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS
    //   ),
    // });
    return cloned;
  }, [gltf, url]);

  useEffect(() => {
    scene.traverse((obj: Object3D) => {
      if (obj instanceof Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!scene) return;
    setHasVenueModel(true);

    // Scale hall down to fit editor coordinate system
    scene.scale.setScalar(0.1);

    // Floor is ~0 after scaling; do not move the scene.
    // Tell editor floor is at Y = 0.
    onFloorDetected?.(0, 0, 0);
    setVenueHallBounds({
      floorY: 0,
      centerX: 0,
      centerZ: 0,
      safeWidth: 0,
      safeDepth: 0,
    });

    console.log('Hall scaled down by 0.1');
  }, [scene, onFloorDetected]);

  return (
    <group raycast={() => null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Marque_Scene11.glb');

