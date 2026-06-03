// Editor Page - Main 3D event design interface

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Package, TrendingUp } from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';

import { useEditorStore } from './store/editorStore';
import { useEditorKeyboard } from './hooks/useEditorKeyboard';
import { useAutoSave } from './hooks/useAutoSave';
import { isValidPlacedAssetRow, serializeScene } from './utils/sceneSerializer';

import { useDreamStageGltf } from './hooks/useDreamStageGltf';
import { useGltfWorkerProgress } from './hooks/useGltfWorkerProgress';
import { disposeGltfWorker } from './services/gltfWorkerClient';
import { disposeAllPlacedAssetObjects } from './utils/placedAssetSceneRegistry';
import './utils/memoryDiagnostics';
import { useEditorLoadController } from './hooks/useEditorLoadController';
import { inspectGlbExtensions, logGlbExtensionWarnings } from './utils/glbInspect';
import { withTimeout, TimeoutError } from './utils/withTimeout';
import { SCENE_DATA_LOAD_TIMEOUT_MS } from './editor.constants';
import { EditorLoadStatusPanel } from './components/EditorLoadStatusPanel';
import { EditorSceneViewport } from './components/EditorSceneViewport';
import { SelectedAssetPanel } from './components/SelectedAssetPanel';
import { EditorToolbar } from './components/EditorToolbar';
import { AiLayoutModal, type AiLayoutSuggestion } from './components/AiLayoutModal';
import { AiSuggestBanner } from './components/AiSuggestBanner';
import { AssetPalette } from './components/AssetPalette';
import { BudgetSidebar } from './components/BudgetSidebar';
import { LightingPanel } from './components/LightingPanel';

import type { AssetDefinition } from './editor.types';
import { DEFAULT_VENUE, DEFAULT_LIGHTING } from './editor.constants';
import './EditorShell.css';
import { inventoryApi } from '../inventory';
import type { AssetWithAvailability } from '../inventory/inventory.types';
import * as budgetApi from '../budget/budget.api';
import { api } from '../../services/api';
import { resolveGlbUrl } from './utils/glbPath';

interface EditorPageProps {
  embedded?: boolean;
}

type EditorOutletEvent = {
  name?: string;
  eventType?: string;
  budgetCeiling?: number | null;
  notes?: string | null;
};

const EDITOR_ASSET_PANEL_MIN = 180;
const EDITOR_ASSET_PANEL_MAX = 380;
/** Venue GLB used by EditorCanvas — worker progress shown during 3D load */
const EDITOR_VENUE_GLB_URL = '/models/Marque_Scene11.glb';

let legacyMaterialToastShown = false;

export function EditorPage({ embedded = false }: EditorPageProps) {
  const DEFAULT_ASSET_SCALE = 0.5;

  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const outletContext = useOutletContext<{ event?: EditorOutletEvent } | undefined>();
  const load = useEditorLoadController(eventId);
  const gltfWorkerProgress = useGltfWorkerProgress(EDITOR_VENUE_GLB_URL);
  const [isSaving, setIsSaving] = useState(false);
  const [budgetSummary, setBudgetSummary] = useState<{
    budgetCeiling?: number | null;
    totalVendorContractAmount: number;
  } | null>(null);
  const [assets, setAssets] = useState<AssetWithAvailability[]>([]);
  const [globalReservedStock, setGlobalReservedStock] = useState<Record<string, number>>({});
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('editor-panel-width');
    if (!saved) return 200;
    const n = parseInt(saved, 10);
    if (!Number.isFinite(n)) return 200;
    return Math.min(EDITOR_ASSET_PANEL_MAX, Math.max(EDITOR_ASSET_PANEL_MIN, n));
  });
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const preloadedUrls = useRef<Set<string>>(new Set());

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = e.clientX - startX.current;
      const newWidth = Math.min(
        Math.max(startWidth.current + diff, EDITOR_ASSET_PANEL_MIN),
        EDITOR_ASSET_PANEL_MAX
      );
      setPanelWidth(newWidth);
      localStorage.setItem('editor-panel-width', String(newWidth));
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const seatingNotes = useMemo(() => {
    const notes = outletContext?.event?.notes ?? '';
    if (notes.includes('Tables:') || notes.includes('Sofas:')) {
      return notes;
    }
    return null;
  }, [outletContext?.event?.notes]);

  const guestCountFromContext = useMemo(() => {
    const notes = outletContext?.event?.notes ?? '';
    const m = notes.match(/Guest count \(from inquiry\):\s*(\d+)/i);
    if (m) return Math.max(1, parseInt(m[1], 10));
    return 100;
  }, [outletContext?.event?.notes]);

  const eventType = outletContext?.event?.eventType ?? 'Wedding';
  const budgetCeilingFromOutlet = outletContext?.event?.budgetCeiling ?? null;
  const venueDisplayName = outletContext?.event?.name ?? '';

  const initScene = useEditorStore((state) => state.initScene);
  const loadScene = useEditorStore((state) => state.loadScene);
  const placedAssets = useEditorStore((state) => state.placedAssets);
  const lighting = useEditorStore((state) => state.lighting);
  const venue = useEditorStore((state) => state.venue);
  const markSaved = useEditorStore((state) => state.markSaved);
  const isLocked = useEditorStore((state) => state.isLocked);
  const draggingAsset = useEditorStore((state) => state.draggingAsset);
  const setDraggingAsset = useEditorStore((state) => state.setDraggingAsset);
  const placeAsset = useEditorStore((state) => state.placeAsset);
  const venueFloorY = useEditorStore((state) => state.venueFloorY);
  const adjustAssetsToFloor = useEditorStore((state) => state.adjustAssetsToFloor);
  const resetAssetPositions = useEditorStore((state) => state.resetAssetPositions);
  const setVenueHallBounds = useEditorStore((state) => state.setVenueHallBounds);

  // Enable keyboard shortcuts
  useEditorKeyboard();

  // Calculate local reserved stock from placed assets in this scene
  const localReservedStock = useMemo(() => {
    const counts: Record<string, number> = {};
    placedAssets.forEach((asset) => {
      counts[asset.assetId] = (counts[asset.assetId] || 0) + 1;
    });
    return counts;
  }, [placedAssets]);

  // Combine global reserved stock (from other events) with local placed assets
  const reservedStock = useMemo(() => {
    const combined: Record<string, number> = { ...globalReservedStock };
    Object.entries(localReservedStock).forEach(([assetId, count]) => {
      combined[assetId] = (combined[assetId] || 0) + count;
    });
    return combined;
  }, [globalReservedStock, localReservedStock]);

  // Preload GLB models — venue + placed scene assets only (not full inventory catalog)
  useEffect(() => {
    const paths = new Set<string>([EDITOR_VENUE_GLB_URL]);
    placedAssets
      .filter((a) => a.modelRef && a.modelRef.trim())
      .forEach((a) => {
        const u = resolveGlbUrl(a.modelRef);
        if (u) paths.add(u);
      });
    paths.forEach((path) => {
      if (!preloadedUrls.current.has(path)) {
        preloadedUrls.current.add(path);
        void Promise.resolve(useDreamStageGltf.preload(path)).catch((err: unknown) => {
          console.warn('[DreamStage] GLB preload failed (will retry on use):', path, err);
        });
      }
      void inspectGlbExtensions(path)
        .then((report) => {
          const hasLegacy = logGlbExtensionWarnings(path, report);
          if (hasLegacy && !legacyMaterialToastShown) {
            legacyMaterialToastShown = true;
            toast.warning(
              'Some 3D models use legacy spec/gloss materials. Convert with: npm run models:metalrough',
              { duration: 10000 }
            );
          }
        })
        .catch(() => {});
    });
  }, [placedAssets]);

  // Tab change unmounts EditorPage (index route) — release GLTF + store so memory does not accumulate
  useEffect(() => {
    return () => {
      disposeAllPlacedAssetObjects();
      const { placedAssets: placed } = useEditorStore.getState();
      const gltfPaths = new Set<string>([EDITOR_VENUE_GLB_URL]);
      for (const asset of placed) {
        const url = resolveGlbUrl(asset.modelRef);
        if (url) gltfPaths.add(url);
      }
      gltfPaths.forEach((path) => useDreamStageGltf.clear(path));
      preloadedUrls.current.clear();
      disposeGltfWorker();
      useEditorStore.getState().clearScene();
    };
  }, []);

  // Convert AssetWithAvailability to AssetDefinition for the palette
  const assetDefinitions: AssetDefinition[] = useMemo(() => {
    return assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      defaultUnitPrice: asset.defaultUnitPrice,
      stockQuantity: asset.stockQuantity,
      modelRef: asset.modelRef,
      thumbnailUrl: asset.thumbnailUrl,
      isActive: asset.isActive,
    }));
  }, [assets]);

  // Load scene and assets on mount / retry (with timeout)
  useEffect(() => {
    if (!eventId) {
      load.failDataLoad(new Error('No event ID provided'), false);
      return;
    }

    const signal = load.beginDataLoad();

    const loadEditorData = async () => {
      const assetsWithAvailability = await inventoryApi.getAssetsWithAvailability();
      if (signal.aborted) return;

      setAssets(assetsWithAvailability);

      const globalReserved: Record<string, number> = {};
      assetsWithAvailability.forEach((asset) => {
        globalReserved[asset.id] = asset.totalReserved;
      });
      setGlobalReservedStock(globalReserved);

      try {
        const response = await api.get(`/editor/${eventId}/scene`, { signal });
        const payload = response.data.data;
        const scene = payload?.scene;
        const sceneJson = scene?.sceneJson;
        const isLocked = scene?.isLocked ?? false;

        if (sceneJson?.placedAssets?.length) {
          const assetMap = new Map(assetsWithAvailability.map((a) => [a.id, a]));
          const enrichedPlacedAssets = (sceneJson.placedAssets as Array<Record<string, any>>)
            .map((pa) => {
              const assetId = String(pa.assetId ?? '');
              return {
                ...pa,
                modelRef: (pa.modelRef ?? assetMap.get(assetId)?.modelRef) ?? undefined,
              };
            })
            .filter((pa) => {
              if (isValidPlacedAssetRow(pa)) return true;
              console.warn('[DreamStage] Skipping malformed placed asset from saved scene:', pa);
              return false;
            });
          loadScene(
            enrichedPlacedAssets as any,
            sceneJson.lighting ?? DEFAULT_LIGHTING,
            sceneJson.venue ?? DEFAULT_VENUE,
            isLocked,
            eventId
          );
        } else {
          initScene(eventId, DEFAULT_VENUE);
          useEditorStore.getState().setLocked(isLocked);
        }
      } catch (sceneErr: unknown) {
        const status = (sceneErr as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          initScene(eventId, DEFAULT_VENUE);
        } else {
          throw sceneErr;
        }
      }

      try {
        const summary = await budgetApi.getBudgetSummary(eventId);
        if (!signal.aborted) {
          setBudgetSummary({
            budgetCeiling: summary.budgetCeiling,
            totalVendorContractAmount: summary.totalVendorCost ?? 0,
          });
        }
      } catch {
        if (!signal.aborted) setBudgetSummary(null);
      }
    };

    void withTimeout(
      loadEditorData(),
      SCENE_DATA_LOAD_TIMEOUT_MS,
      `Scene data did not load within ${SCENE_DATA_LOAD_TIMEOUT_MS / 1000} seconds`
    )
      .then(() => {
        if (!signal.aborted) load.completeDataLoad();
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        const timedOut = err instanceof TimeoutError;
        let message = 'Failed to load scene data. Please try again.';
        const ax = err as { response?: { status?: number; data?: { error?: string } }; request?: unknown };
        if (ax.response) {
          message = `Server error (${ax.response.status}): ${ax.response.data?.error ?? 'Unknown'}`;
        } else if (ax.request) {
          message = 'Cannot connect to server. Please ensure the server is running.';
        } else if (err instanceof Error) {
          message = err.message;
        }
        load.failDataLoad(new Error(message), timedOut);
      });
  }, [
    eventId,
    load.loadAttempt,
    load.beginDataLoad,
    load.completeDataLoad,
    load.failDataLoad,
    initScene,
    loadScene,
  ]);

  // Save scene function
  const saveScene = useCallback(async () => {
    if (!eventId || isLocked) return;

    setIsSaving(true);
    try {
      const sceneJson = serializeScene(placedAssets, lighting, venue);
      
      // Save scene to backend (this also syncs budget items)
      await api.put(`/editor/${eventId}/scene`, { sceneJson });
      
      // Sync stock reservations with the database
      const reservationsToSync = Object.entries(localReservedStock).map(
        ([assetId, quantity]) => ({ assetId, quantity })
      );
      
      if (reservationsToSync.length > 0) {
        try {
          await inventoryApi.syncReservationsFromScene(eventId, {
            placedAssets: reservationsToSync,
          });
        } catch (syncErr) {
          console.warn('Failed to sync reservations:', syncErr);
        }
      }
      
      markSaved();
    } catch (err) {
      console.error('Failed to save scene:', err);
    } finally {
      setIsSaving(false);
    }
  }, [eventId, placedAssets, lighting, venue, isLocked, markSaved, localReservedStock]);

  // Enable auto-save
  useAutoSave({ onSave: saveScene, enabled: !isLocked });

  useEffect(() => {
    if (!eventId || !seatingNotes || bannerDismissed) {
      return;
    }
    if (placedAssets.length > 0) {
      setShowAiBanner(false);
      return;
    }
    const dismissed = sessionStorage.getItem(`ai-banner-dismissed-${eventId}`);
    if (dismissed) {
      return;
    }
    setShowAiBanner(true);
  }, [eventId, seatingNotes, placedAssets.length, bannerDismissed]);

  useEffect(() => {
    if (venueFloorY !== 0) {
      console.log('Placing assets at floor Y:', venueFloorY);
      adjustAssetsToFloor(venueFloorY + 0.1);
      setVenueHallBounds({
        floorY: venueFloorY,
        centerX: 0,
        centerZ: 0,
        safeWidth: 10,
        safeDepth: 10,
      });
      resetAssetPositions(0, venueFloorY + 0.1, 0);
    }
  }, [venueFloorY, adjustAssetsToFloor, resetAssetPositions, setVenueHallBounds]);

  const handleAiPlace = useCallback(
    (selected: AiLayoutSuggestion[]) => {
      if (isLocked) return;
      const MAX_PLACE = 200;
      let remaining = MAX_PLACE;
      const totalRequested = selected.reduce((sum, s) => sum + s.quantity, 0);
      let placedCount = 0;

      for (const s of selected) {
        if (remaining <= 0) break;
        const matched = assets.find(
          (a) => a.name.trim().toLowerCase() === s.assetName.trim().toLowerCase()
        );
        if (!matched) continue;
        const n = Math.min(s.quantity, remaining);
        const cols = Math.ceil(Math.sqrt(Math.min(totalRequested, MAX_PLACE)));
        const HALL_FLOOR_Y = venueFloorY || 0;
        const spacing = 1.2;
        for (let i = 0; i < n; i++) {
          const currentCount = useEditorStore.getState().placedAssets.length;
          if (currentCount >= 200) {
            toast.error('Maximum 200 items in scene. Remove some items first.');
            return;
          }
          if (currentCount === 150) {
            toast.warning('⚠️ 150+ items placed — performance may slow down on some devices.');
          }
          const row = Math.floor(placedCount / cols);
          const col = placedCount % cols;
          placeAsset({
            assetId: matched.id,
            name: matched.name,
            category: matched.category,
            transform: {
              position: {
                x: (col - cols / 2) * spacing,
                y: HALL_FLOOR_Y + 0.1,
                z: (row - Math.floor(cols / 2)) * spacing,
              },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: DEFAULT_ASSET_SCALE, y: DEFAULT_ASSET_SCALE, z: DEFAULT_ASSET_SCALE },
            },
            unitPrice: matched.defaultUnitPrice,
            modelRef: matched.modelRef ?? null,
          });
          placedCount++;
          remaining--;
        }
      }

      if (totalRequested > MAX_PLACE) {
        toast.success(
          `✨ Placed ${placedCount} items (showing ${MAX_PLACE} of ${totalRequested} for performance).`
        );
      } else if (placedCount < totalRequested) {
        toast.success(
          `✨ Placed ${placedCount} of ${totalRequested} suggested items (some names did not match inventory).`
        );
      } else {
        toast.success(`✨ AI placed ${placedCount} items in your scene!`);
      }
    },
    [assets, placeAsset, isLocked, venueFloorY]
  );

  // Handle asset drag start from palette
  const handleDragStart = (asset: AssetDefinition) => {
    setDraggingAsset(asset);
  };

  // Handle successful asset drop
  // Note: reservedStock is now calculated from placedAssets, no need to manually track
  const handleDropAsset = useCallback(
    (_x: number, _z: number, _assetId: string) => {
      // The store's dropAssetAt already handled placing the asset
      // Local reserved stock is automatically updated via localReservedStock memo
    },
    []
  );

  // Handle drag over for drop zone - needed to allow drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle HTML drop event - clear dragging state if dropped outside canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Clear dragging state when drag ends (e.g., dropped outside)
  const handleDragEnd = () => {
    setDraggingAsset(null);
  };

  if (load.showFullPageLoader) {
    return (
      <EditorLoadStatusPanel
        variant="fullscreen"
        loadingMessage={load.loadingMessage}
        embedded={embedded}
      />
    );
  }

  if (load.showFullPageError && load.failure) {
    return (
      <div className={embedded ? 'h-full min-h-[400px]' : 'min-h-screen'}>
        <EditorLoadStatusPanel
          variant="fullscreen"
          failure={load.failure}
          onRetry={load.retry}
          onUse2D={load.use2DFallback}
          embedded={embedded}
        />
        {!embedded && (
          <div className="flex justify-center pb-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Go back
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Row 3: Toolbar */}
      <div className="flex items-stretch gap-2 shrink-0 min-h-0">
        <div className="min-w-0 flex-1">
          <EditorToolbar onSave={saveScene} isSaving={isSaving} />
        </div>
        {!isLocked && (
          <div className="self-center shrink-0 mr-2 my-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '99px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ✨ AI Suggest
            </button>
          </div>
        )}
      </div>

      {/* Row 4: Main body */}
      <div
        className="editor-body"
        style={{
          gridTemplateColumns: `${leftPanelCollapsed ? 48 : panelWidth}px 1fr ${rightPanelCollapsed ? 48 : 280}px`,
        }}
      >
        {/* Left sidebar - Asset Palette */}
        <aside
          className={leftPanelCollapsed ? 'editor-sidebar-collapsed' : 'editor-sidebar'}
          style={{ gridColumn: 1 }}
        >
          {leftPanelCollapsed ? (
            <div className="editor-panel-toggle-strip">
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(false)}
                className="editor-panel-toggle-btn"
                title="Expand Assets"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <Package className="w-5 h-5 editor-panel-icon" />
            </div>
          ) : (
            <div className="editor-sidebar-inner">
              <div className="editor-sidebar-with-edge">
                <AssetPalette
                  assets={assetDefinitions}
                  reservedStock={reservedStock}
                  onDragStart={handleDragStart}
                  venueFloorY={venueFloorY || 0}
                  disabled={isLocked}
                />
                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed(true)}
                  className="editor-panel-edge-btn editor-panel-edge-left"
                  title="Collapse Assets"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize asset panel"
                onMouseDown={handleResizeStart}
                className="editor-sidebar-resize-handle"
              />
            </div>
          )}
        </aside>

        {/* 3D Canvas */}
        <main
          className="editor-canvas-zone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={handleDragEnd}
        >
          <div className="editor-canvas-grid" />
          <EditorSceneViewport
                eventId={eventId}
                phase={load.phase}
                failure={load.failure}
                loadAttempt={load.loadAttempt}
                viewportMode={load.viewportMode}
                loadingMessage={load.loadingMessage}
                loadPercent={
                  load.phase === 'loading-3d' ? gltfWorkerProgress.percent : null
                }
                reservedStock={reservedStock}
                onDropAsset={handleDropAsset}
                on3dReady={load.complete3dLoad}
                on3dError={(err) => load.fail3dLoad(err, false)}
                onRetry={load.retry}
                onUse2D={load.use2DFallback}
                onRetry3d={load.retry3d}
          />

          {showAiBanner && !showAiModal && (
            <AiSuggestBanner
              onOpen={() => {
                setShowAiModal(true);
                setShowAiBanner(false);
              }}
              onDismiss={() => {
                setShowAiBanner(false);
                setBannerDismissed(true);
                if (eventId) {
                  sessionStorage.setItem(`ai-banner-dismissed-${eventId}`, 'true');
                }
              }}
            />
          )}

          {/* Selected asset floating controls */}
          <SelectedAssetPanel />

          {/* Drag indicator */}
          {draggingAsset && (
            <div 
              className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-3 pointer-events-none"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                boxShadow: 'var(--shadow-lg)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Drop "{draggingAsset.name}" on the floor
            </div>
          )}
        </main>

        {/* Right sidebar - Budget + Lighting */}
        <aside
          className={rightPanelCollapsed ? 'editor-right-panel-collapsed' : 'editor-right-panel'}
          style={{ gridColumn: 3 }}
        >
          {rightPanelCollapsed ? (
            <div className="editor-panel-toggle-strip">
              <button
                type="button"
                onClick={() => setRightPanelCollapsed(false)}
                className="editor-panel-toggle-btn"
                title="Expand Budget"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <TrendingUp className="w-5 h-5 editor-panel-icon" />
            </div>
          ) : (
            <div className="editor-right-with-edge">
              <button
                type="button"
                onClick={() => setRightPanelCollapsed(true)}
                className="editor-panel-edge-btn editor-panel-edge-right"
                title="Collapse Budget"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <BudgetSidebar
                budgetCeiling={
                  budgetCeilingFromOutlet ?? budgetSummary?.budgetCeiling ?? undefined
                }
              />
              <LightingPanel disabled={isLocked} />
            </div>
          )}
        </aside>
      </div>

      {showAiModal && (
        <AiLayoutModal
          eventType={eventType}
          guestCount={guestCountFromContext}
          venueName={venueDisplayName}
          budgetCeiling={budgetCeilingFromOutlet}
          seatingNotes={seatingNotes}
          onClose={() => setShowAiModal(false)}
          onPlace={handleAiPlace}
        />
      )}
    </div>
  );
}
