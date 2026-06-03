// RotationRing - Clear horizontal ring around selected asset in Rotate mode

import { useMemo } from 'react';
import * as THREE from 'three';

interface RotationRingProps {
  position: { x: number; y: number; z: number };
}

/** Horizontal ring in XZ plane - drag left = CCW, right = CW around Y */
export function RotationRing({ position }: RotationRingProps) {
  const ringRadius = useMemo(() => 2.5, []);

  return (
    <group position={[position.x, position.y + 0.5, position.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={1000}>
        <torusGeometry args={[ringRadius, 0.04, 16, 48]} />
        <meshBasicMaterial
          color="#8B7EC8"
          transparent
          opacity={0.85}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
