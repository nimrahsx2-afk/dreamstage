import { EditorCanvas } from './EditorCanvas';
import { EditorCanvasErrorBoundary } from './EditorCanvasErrorBoundary';
import { EditorLoadStatusPanel } from './EditorLoadStatusPanel';
import { EditorScene2DFallback } from './EditorScene2DFallback';
import type { EditorLoadFailure, EditorLoadPhase } from '../hooks/useEditorLoadController';

interface EditorSceneViewportProps {
  eventId?: string;
  phase: EditorLoadPhase;
  failure: EditorLoadFailure | null;
  loadAttempt: number;
  viewportMode: '3d' | '2d';
  loadingMessage: string;
  loadPercent?: number | null;
  reservedStock: Record<string, number>;
  onDropAsset?: (x: number, z: number, assetId: string) => void;
  on3dReady: () => void;
  on3dError: (error: Error) => void;
  onRetry: () => void;
  onUse2D: () => void;
  onRetry3d: () => void;
}

export function EditorSceneViewport({
  eventId,
  phase,
  failure,
  loadAttempt,
  viewportMode,
  loadingMessage,
  loadPercent,
  reservedStock,
  onDropAsset,
  on3dReady,
  on3dError,
  onRetry,
  onUse2D,
  onRetry3d,
}: EditorSceneViewportProps) {
  const show2d = phase === 'fallback-2d' || viewportMode === '2d';
  const show3dCanvas =
    !show2d && (phase === 'loading-3d' || phase === 'ready' || (phase === 'error' && failure?.stage !== 'data'));

  const overlayLoading = phase === 'loading-3d' && !failure;
  const overlayError = phase === 'error' && failure && failure.stage !== 'data';

  return (
    <div className="editor-scene-container relative w-full h-full min-h-[320px]">
      <div className="editor-scene-3d w-full h-full min-h-[320px]">
        {show2d && <EditorScene2DFallback />}

        {show3dCanvas && (
          <EditorCanvasErrorBoundary
            eventId={eventId}
            loadAttempt={loadAttempt}
            onError={on3dError}
          >
            <EditorCanvas
              key={`editor-canvas-${loadAttempt}`}
              onDropAsset={onDropAsset}
              reservedStock={reservedStock}
              onReady={on3dReady}
            />
          </EditorCanvasErrorBoundary>
        )}

        {overlayLoading && (
          <EditorLoadStatusPanel
            variant="overlay"
            loadingMessage={loadingMessage}
            loadPercent={loadPercent}
          />
        )}

        {overlayError && failure && (
          <EditorLoadStatusPanel
            variant="overlay"
            failure={failure}
            onRetry={onRetry}
            onUse2D={onUse2D}
          />
        )}
      </div>

      {phase === 'fallback-2d' && (
        <div
          className="absolute bottom-3 right-3 z-10"
        >
          <button
            type="button"
            onClick={onRetry3d}
            className="px-4 py-2 text-sm font-semibold shadow-md"
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Try 3D again
          </button>
        </div>
      )}
    </div>
  );
}
