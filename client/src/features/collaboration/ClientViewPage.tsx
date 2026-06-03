/**
 * Client View Page - Pixel-perfect recreation of dreamstage-client-view.html
 * Read-only 3D preview, budget summary, assets, comments, approval
 * Access via /view/:token (no auth)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useDreamStageGltf } from '../editor/hooks/useDreamStageGltf';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Suspense } from 'react';

import { useEditorStore } from '../editor/store/editorStore';
import { deserializeScene } from '../editor/utils/sceneSerializer';
import { VenueEnvironment } from '../editor/components/VenueEnvironment';
import { VenueModel } from '../editor/components/VenueModel';
import { PlacedAsset } from '../editor/components/PlacedAsset';
import { EditorPlacedAssetErrorBoundary } from '../editor/components/EditorPlacedAssetErrorBoundary';
import { SceneLighting } from '../editor/components/SceneLighting';
import { ORBIT_CAMERA_CONFIG } from '../editor/editor.constants';
import { formatPKR } from '@/utils/currency';
import { ThemeToggle } from '@/components/ThemeToggle';

import * as collaborationApi from './collaboration.api';
import type { SharedViewData, ClientComment } from './collaboration.api';
import './ClientView.css';

const DEFAULT_VENUE = { templateId: '', floorSize: { width: 20, depth: 30 }, wallHeight: 4 };

const CATEGORY_EMOJI: Record<string, string> = {
  seating: '🪑',
  tables: '🪑',
  lighting: '💡',
  decor: '🌸',
  staging: '🎪',
  backdrops: '🖼️',
  other: '📦',
};

const CATEGORY_COLOR: Record<string, string> = {
  seating: '#f0a0b4',
  tables: '#E8735A',
  lighting: '#F9E45B',
  decor: '#4DB8A4',
  staging: '#b9a3f0',
  backdrops: '#87CEEB',
  other: '#9ca3af',
};

const CATEGORY_LABEL: Record<string, string> = {
  seating: 'Seating',
  tables: 'Tables',
  lighting: 'Lighting',
  decor: 'Décor',
  staging: 'Staging',
  backdrops: 'Backdrops',
  other: 'Other',
};

type ViewMode = 'orbit' | 'walkthrough' | 'top';

function ClientViewCanvas({ venueModelRef }: { venueModelRef: string | null }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const placedAssets = useEditorStore((state) => state.placedAssets);

  const handleZoomIn = () => {
    const c = controlsRef.current as any;
    if (c?.dollyIn) c.dollyIn(1);
  };
  const handleZoomOut = () => {
    const c = controlsRef.current as any;
    if (c?.dollyOut) c.dollyOut(1);
  };
  const handleReset = () => controlsRef.current?.reset?.();

  return (
    <div className="client-canvas-wrap">
      <div className="client-canvas-inner">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: false }}
          style={{ background: '#faf8f5' }}
        >
          <Suspense fallback={null}>
            <PerspectiveCamera
              makeDefault
              fov={ORBIT_CAMERA_CONFIG.fov}
              near={ORBIT_CAMERA_CONFIG.near}
              far={ORBIT_CAMERA_CONFIG.far}
              position={[
                ORBIT_CAMERA_CONFIG.position.x,
                ORBIT_CAMERA_CONFIG.position.y,
                ORBIT_CAMERA_CONFIG.position.z,
              ]}
            />
            <OrbitControls
              ref={controlsRef}
              makeDefault
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
            <SceneLighting />
            <Environment preset="apartment" background={false} />
            <EditorPlacedAssetErrorBoundary assetId="venue-model" assetName="Venue Hall">
              <VenueModel filename={venueModelRef || 'Marque_Scene11.glb'} />
            </EditorPlacedAssetErrorBoundary>
            <VenueEnvironment />
            {placedAssets.map((asset) => (
              <EditorPlacedAssetErrorBoundary key={asset.id} assetId={asset.id} assetName={asset.name}>
                <PlacedAsset asset={asset} isSelected={false} disabled />
              </EditorPlacedAssetErrorBoundary>
            ))}
          </Suspense>
        </Canvas>
      </div>
      <div className="client-canvas-label">
        <div className="client-label-dot" />
        Live 3D Preview · Drag to orbit
      </div>
      <div className="client-canvas-controls">
        <button type="button" className="client-canvas-ctrl" title="Zoom in" onClick={handleZoomIn}>
          ＋
        </button>
        <button type="button" className="client-canvas-ctrl" title="Zoom out" onClick={handleZoomOut}>
          －
        </button>
        <button type="button" className="client-canvas-ctrl" title="Reset view" onClick={handleReset}>
          ⟳
        </button>
      </div>
    </div>
  );
}

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString();
}

export function ClientViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedViewData | null>(null);
  const [password, setPassword] = useState('');
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [newComment, setNewComment] = useState({ name: '', content: '' });
  const [approveName, setApproveName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');

  const loadScene = useEditorStore((state) => state.loadScene);
  const initScene = useEditorStore((state) => state.initScene);
  const placedAssets = useEditorStore((state) => state.placedAssets);

  const fetchData = useCallback(async (pwd?: string | null) => {
    if (!token) {
      setIsLoading(false);
      setError('Invalid link: missing token');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setPasswordPrompt(false);
      const viewData = await collaborationApi.getSharedView(token, pwd ?? null);
      setData(viewData);

      if (viewData.sceneJson?.placedAssets?.length) {
        const parsed = deserializeScene(viewData.sceneJson as any);
        loadScene(parsed.placedAssets, parsed.lighting, parsed.venue, true, viewData.event?.id);
      } else {
        const venue = viewData.sceneJson?.venue
          ? {
              templateId: (viewData.sceneJson.venue as any).templateId ?? '',
              floorSize: (viewData.sceneJson.venue as any).floorSize ?? { width: 20, depth: 20 },
              wallHeight: (viewData.sceneJson.venue as any).wallHeight ?? 4,
            }
          : { ...DEFAULT_VENUE, templateId: 'client-view' };
        initScene(viewData.event?.id ?? '', venue);
      }

      const cmts = await collaborationApi.getSharedComments(token, pwd ?? null);
      setComments(cmts ?? []);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPasswordPrompt(true);
        setError('Invalid link or password required.');
      } else {
        setError(err.response?.data?.error || 'Failed to load');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, loadScene, initScene]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Preload GLB models for placed assets (same as editor — cached by drei)
  useEffect(() => {
    placedAssets
      .filter((a) => a.modelRef && a.modelRef.trim())
      .forEach((a) => useDreamStageGltf.preload(`/models/${a.modelRef!.trim()}`));
  }, [placedAssets]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(password?.trim() || null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newComment.name.trim() || !newComment.content.trim()) return;
    setIsSubmittingComment(true);
    try {
      await collaborationApi.addSharedComment(
        token,
        { clientIdentifier: newComment.name, content: newComment.content },
        password || null
      );
      setNewComment({ name: '', content: '' });
      const cmts = await collaborationApi.getSharedComments(token, password || null);
      setComments(cmts ?? []);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !approveName.trim() || !data) return;
    setIsApproving(true);
    try {
      await collaborationApi.submitApproval(token, approveName, password || null);
      setApproved(true);
      setData((prev) =>
        prev ? { ...prev, event: { ...prev.event, status: 'approved' as const }, isLocked: true } : null
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  // Build threaded comments: top-level = client, children = planner replies
  const commentThreads = useMemo(() => {
    const top = comments.filter((c) => !c.parentCommentId);
    const byParent = new Map<string, ClientComment[]>();
    comments.forEach((c) => {
      if (c.parentCommentId) {
        const arr = byParent.get(c.parentCommentId) ?? [];
        arr.push(c);
        byParent.set(c.parentCommentId, arr);
      }
    });
    return top.map((parent) => ({
      parent,
      replies: (byParent.get(parent.id) ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));
  }, [comments]);

  // Assets grouped by name for layout
  const assetsInLayout = useMemo(() => {
    const byName = new Map<string, { name: string; category: string; qty: number; cost: number }>();
    placedAssets.forEach((a) => {
      const key = a.name;
      const cost = a.priceOverride ?? a.unitPrice;
      const cat = (a.category ?? 'other') as string;
      const existing = byName.get(key);
      if (existing) {
        existing.qty += 1;
        existing.cost += cost;
      } else {
        byName.set(key, { name: a.name, category: cat, qty: 1, cost });
      }
    });
    return Array.from(byName.values());
  }, [placedAssets]);

  // Category breakdown from placed assets
  const categoryBreakdown = useMemo(() => {
    const byCat = new Map<string, number>();
    placedAssets.forEach((a) => {
      const cat = (a.category ?? 'other') as string;
      const cost = a.priceOverride ?? a.unitPrice;
      byCat.set(cat, (byCat.get(cat) ?? 0) + cost);
    });
    return Array.from(byCat.entries())
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [placedAssets]);

  const grandTotal = data?.budgetSummary?.grandTotal ?? 0;
  const ceiling = data?.budgetSummary?.budgetCeiling ?? null;
  const isOverBudget = data?.budgetSummary?.isOverBudget ?? false;
  const remaining = ceiling != null ? Math.max(0, ceiling - grandTotal) : 0;
  const pctUsed = ceiling && ceiling > 0 ? Math.min((grandTotal / ceiling) * 100, 100) : 0;

  if (passwordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="p-8 max-w-md w-full"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 8,
            }}
          >
            Enter password
          </h2>
          <p style={{ fontFamily: 'DM Sans', color: 'var(--text-muted)', marginBottom: 24 }}>
            {error}
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans',
                color: 'var(--text)',
              }}
            />
            <button
              type="submit"
              className="w-full py-3"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans',
                fontWeight: 600,
              }}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="p-8 text-center"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            boxShadow: 'var(--shadow)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <p style={{ fontFamily: 'DM Sans', color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button onClick={() => fetchData()} className="client-btn-approve" style={{ maxWidth: 200, margin: '0 auto' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="p-8 text-center max-w-md"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <p style={{ fontFamily: 'DM Sans', color: 'var(--text-muted)', marginBottom: 16 }}>
            {error || 'Unable to load this view.'}
          </p>
          <button
            onClick={() => (token ? fetchData() : window.history.back())}
            className="client-btn-approve"
            style={{ maxWidth: 200, margin: '0 auto' }}
          >
            {token ? 'Try again' : 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  const isApproved = data.event.status === 'approved' || data.isLocked || approved;
  const showApproveForm = data.event.status === 'draft' && !data.isLocked && !approved;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="client-bg-orbs">
        <div className="client-orb client-orb-1" />
        <div className="client-orb client-orb-2" />
        <div className="client-orb client-orb-3" />
      </div>

      <nav className="client-nav">
        <div className="client-nav-left">
          <div className="client-logo" style={{ cursor: 'default' }}>
            <span className="client-logo-icon">✦</span>
            Dream<span>Stage</span>
          </div>
          <div className="client-nav-divider" />
          <div>
            <div className="client-nav-event-name">{data.event.name}</div>
            <div className="client-nav-event-meta">
              {new Date(data.event.eventDate).toLocaleDateString('en-PK', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              · Client review link
            </div>
          </div>
        </div>
        <div className="client-nav-right">
          <div className="client-badge">
            <div className="client-badge-dot" />
            Client View
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div className="client-layout">
        <div className="client-viewer-panel">
          <div className="client-viewer-header">
            <div>
              <div className="client-viewer-eyebrow">3D Venue Layout</div>
              <h1 className="client-viewer-title">
                <em>{data.event.name}</em>
              </h1>
              <p className="client-viewer-meta">
                {data.event.eventType} ·{' '}
                {new Date(data.event.eventDate).toLocaleDateString('en-PK', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                · Shared by your event planner
              </p>
            </div>
            <div className="client-viewer-controls">
              <button
                type="button"
                className={`client-ctrl-btn ${viewMode === 'orbit' ? 'active' : ''}`}
                onClick={() => setViewMode('orbit')}
              >
                🔄 Orbit
              </button>
              <button
                type="button"
                className={`client-ctrl-btn ${viewMode === 'walkthrough' ? 'active' : ''}`}
                onClick={() => setViewMode('walkthrough')}
              >
                🚶 Walkthrough
              </button>
              <button
                type="button"
                className={`client-ctrl-btn ${viewMode === 'top' ? 'active' : ''}`}
                onClick={() => setViewMode('top')}
              >
                ⬆ Top View
              </button>
            </div>
          </div>

          <ClientViewCanvas venueModelRef={data.event.venueModelRef ?? null} />

          <div className="client-legend-strip">
            {['seating', 'tables', 'staging', 'lighting', 'decor', 'backdrops'].map((cat) => (
              <div key={cat} className="client-legend-item">
                <div
                  className="client-legend-dot"
                  style={{
                    background: CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.other,
                    border: cat === 'lighting' ? '1px solid rgba(0,0,0,0.1)' : undefined,
                  }}
                />
                {CATEGORY_LABEL[cat] ?? cat}
              </div>
            ))}
          </div>
        </div>

        <div className="client-right-panel">
          {data.event.showBudgetDetails && (
            <div className="client-right-section" style={{ animationDelay: '0.08s' }}>
              <div className="client-rs-label">Budget Summary</div>
              <div
                className="client-budget-amount"
                style={isOverBudget ? { color: 'var(--danger, #f87171)' } : undefined}
              >
                {formatPKR(grandTotal)}
              </div>
              <div className="client-budget-ceiling">
                {ceiling ? `of ${formatPKR(ceiling)} ceiling · ${pctUsed.toFixed(1)}% used` : 'No ceiling set'}
              </div>
              {ceiling != null && ceiling > 0 && (
                <>
                  <div className="client-budget-progress-track">
                    <div
                      className={`client-budget-progress-fill ${isOverBudget ? 'danger' : ''}`}
                      style={{ width: `${Math.min(pctUsed, 100)}%` }}
                    />
                  </div>
                  <div className="client-budget-pct-row">
                    <span>{formatPKR(grandTotal)} spent</span>
                    <span>{formatPKR(remaining)} remaining</span>
                  </div>
                </>
              )}
              {categoryBreakdown.length > 0 && (
                <div className="client-budget-breakdown">
                  {categoryBreakdown.map(({ category, total }) => (
                    <div key={category} className="client-bb-row">
                      <div
                        className="client-bb-dot"
                        style={{ background: CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other }}
                      />
                      <div className="client-bb-name">
                        {CATEGORY_LABEL[category] ?? category}
                      </div>
                      <div className="client-bb-val">{formatPKR(total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="client-right-section" style={{ animationDelay: '0.12s' }}>
            <div className="client-rs-label">Assets in Layout</div>
            <div className="client-assets-grid">
              {assetsInLayout.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No assets placed yet</p>
              ) : (
                assetsInLayout.map((a) => (
                  <div key={a.name} className="client-asset-row">
                    <div
                      className="client-asset-icon"
                      style={{
                        background: CATEGORY_COLOR[a.category] ?? CATEGORY_COLOR.other,
                        opacity: 0.9,
                      }}
                    >
                      {CATEGORY_EMOJI[a.category] ?? '📦'}
                    </div>
                    <div className="client-asset-name">{a.name}</div>
                    <div className="client-asset-qty">× {a.qty}</div>
                    <div className="client-asset-cost">{formatPKR(a.cost)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="client-right-section" style={{ animationDelay: '0.16s' }}>
            <div className="client-rs-label">Comments</div>
            <div className="client-comments-list">
              {commentThreads.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No comments yet</p>
              ) : (
                commentThreads.map(({ parent, replies }) => (
                  <div key={parent.id}>
                    <div className={`client-comment-bubble ${parent.isPlannerReply ? 'reply' : ''}`}>
                      <div className="client-comment-meta">
                        <div
                          className={`client-comment-avatar ${parent.isPlannerReply ? 'planner' : ''}`}
                          style={
                            !parent.isPlannerReply
                              ? { background: 'linear-gradient(135deg, var(--rose-d), var(--lavender-d))' }
                              : undefined
                          }
                        >
                          {parent.isPlannerReply ? 'EP' : (parent.clientIdentifier || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="client-comment-author">
                          {parent.isPlannerReply ? 'Event Planner' : parent.clientIdentifier}
                        </div>
                        <div className="client-comment-time">{formatCommentTime(parent.createdAt)}</div>
                      </div>
                      <div className="client-comment-text">{parent.content}</div>
                    </div>
                    {replies.map((reply) => (
                      <div key={reply.id} className="client-comment-bubble reply">
                        <div className="client-comment-meta">
                          <div className="client-comment-avatar planner">EP</div>
                          <div className="client-comment-author">Event Planner</div>
                          <div className="client-comment-time">{formatCommentTime(reply.createdAt)}</div>
                        </div>
                        <div className="client-comment-text">{reply.content}</div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <form className="client-comment-form" onSubmit={handleAddComment}>
              <input
                className="client-cf-input"
                type="text"
                placeholder="Your name"
                value={newComment.name}
                onChange={(e) => setNewComment((s) => ({ ...s, name: e.target.value }))}
              />
              <textarea
                className="client-cf-textarea"
                placeholder="Add a comment or feedback..."
                value={newComment.content}
                onChange={(e) => setNewComment((s) => ({ ...s, content: e.target.value }))}
              />
              <button type="submit" className="client-btn-send" disabled={isSubmittingComment}>
                {isSubmittingComment ? 'Sending…' : 'Send Comment →'}
              </button>
            </form>
          </div>

          <div className="client-right-section" style={{ animationDelay: '0.2s' }}>
            <div className="client-rs-label">Approve Design</div>
            <div className="client-approve-card">
              <div className="client-approve-card-title">✦ Ready to sign off?</div>
              <div className="client-approve-card-sub">
                Approving locks this design and creates a timestamped record your planner can act on.
              </div>
            </div>
            {showApproveForm && (
              <form className="client-approve-form" onSubmit={handleApprove}>
                <input
                  className="client-approve-name-input"
                  type="text"
                  placeholder="Your full name"
                  value={approveName}
                  onChange={(e) => setApproveName(e.target.value)}
                />
                <button type="submit" className="client-btn-approve" disabled={isApproving}>
                  <span>✓</span> Approve This Design
                </button>
                <div className="client-approve-disclaimer">🔐 This creates an immutable approval record</div>
              </form>
            )}
            {isApproved && (
              <div className="client-approved-state">
                <div className="client-approved-tick">✅</div>
                <div className="client-approved-title">Design Approved!</div>
                <div className="client-approved-sub">
                  Your planner has been notified. This layout is now locked.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
