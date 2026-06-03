// Scene Lighting - Ambient and directional lights controlled by editor state

import { useEditorStore } from '../store/editorStore';

export function SceneLighting() {
  const lighting = useEditorStore((state) => state.lighting);
  return (
    <>
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight
        position={[
          lighting.directionalPosition.x,
          lighting.directionalPosition.y,
          lighting.directionalPosition.z,
        ]}
        intensity={lighting.directionalIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <hemisphereLight args={['#ffeeb1', '#080820', 0.3]} />
    </>
  );
}
