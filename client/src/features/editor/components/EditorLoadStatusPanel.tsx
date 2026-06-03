import { Loader2, RefreshCw, LayoutGrid } from 'lucide-react';

import type { EditorLoadFailure } from '../hooks/useEditorLoadController';

interface EditorLoadStatusPanelProps {
  variant: 'overlay' | 'fullscreen';
  loadingMessage?: string;
  /** 0–100 when loading 3D assets via worker */
  loadPercent?: number | null;
  failure?: EditorLoadFailure | null;
  onRetry?: () => void;
  onUse2D?: () => void;
  embedded?: boolean;
}

export function EditorLoadStatusPanel({
  variant,
  loadingMessage,
  loadPercent,
  failure,
  onRetry,
  onUse2D,
  embedded = false,
}: EditorLoadStatusPanelProps) {
  const isLoading = !failure && loadingMessage;
  const minH = embedded ? 'min-h-[400px]' : 'min-h-[280px]';

  const shellClass =
    variant === 'fullscreen'
      ? `flex items-center justify-center ${embedded ? 'h-full min-h-[600px]' : 'h-screen'}`
      : `absolute inset-0 z-20 flex items-center justify-center ${minH}`;

  return (
    <div
      className={shellClass}
      style={{
        background:
          variant === 'overlay' ? 'rgba(250, 248, 245, 0.92)' : 'var(--bg)',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex flex-col items-center gap-4 p-8 max-w-md text-center"
        style={
          failure
            ? {
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)',
              }
            : undefined
        }
      >
        {isLoading && (
          <>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>
              {loadingMessage}
            </p>
            {loadPercent != null && loadPercent > 0 && loadPercent < 100 && (
              <div
                className="w-full max-w-xs h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--surface2)' }}
                role="progressbar"
                aria-valuenow={loadPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${loadPercent}%`, background: 'var(--accent)' }}
                />
              </div>
            )}
          </>
        )}

        {failure && (
          <>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                color: '#dc2626',
                fontWeight: 600,
              }}
            >
              {failure.userMessage}
            </p>
            {import.meta.env.DEV && failure.message !== failure.userMessage && (
              <p
                className="text-xs break-all"
                style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}
              >
                {failure.message}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 px-5 py-2.5"
                  style={{
                    background: 'var(--text)',
                    color: 'var(--bg)',
                    borderRadius: 'var(--radius-pill)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              )}
              {onUse2D && (
                <button
                  type="button"
                  onClick={onUse2D}
                  className="inline-flex items-center gap-2 px-5 py-2.5"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border, #e5e0d8)',
                    borderRadius: 'var(--radius-pill)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Use 2D layout
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
