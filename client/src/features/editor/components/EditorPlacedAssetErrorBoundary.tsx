// Isolates a single placed asset so a broken GLB/material cannot take down the whole editor canvas

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  assetId: string;
  assetName: string;
}

interface State {
  hasError: boolean;
}

export class EditorPlacedAssetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[DreamStage] Placed asset failed to render (id=${this.props.assetId}, name=${this.props.assetName}):`,
      error,
      info.componentStack
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <group userData={{ type: 'glbErrorFallback', assetId: this.props.assetId }}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.65, 0.65, 0.65]} />
            <meshStandardMaterial color="#b45309" metalness={0.2} roughness={0.85} />
          </mesh>
        </group>
      );
    }
    return this.props.children;
  }
}
