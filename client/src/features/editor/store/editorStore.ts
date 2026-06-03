// Editor Zustand Store - Scene state, selection, transforms, undo/redo

import { create } from 'zustand';
import type {
  EditorState,
  PlacedAssetData,
  TransformMode,
  ViewMode,
  Transform,
  LightingSettings,
  VenueSettings,
  AssetCategory,
  AssetDefinition,
} from '../editor.types';
import {
  DEFAULT_LIGHTING,
  DEFAULT_VENUE,
  UNDO_HISTORY_LIMIT,
  GRID_SNAP_INCREMENT,
} from '../editor.constants';
import {
  disposePlacedAssetById,
  disposeAllPlacedAssetObjects,
  maybeClearGltfCacheForModel,
} from '../utils/placedAssetSceneRegistry';

interface EditorActions {
  // Scene management
  initScene: (eventId: string, venue?: VenueSettings) => void;
  loadScene: (assets: PlacedAssetData[], lighting: LightingSettings, venue: VenueSettings, isLocked: boolean, eventId?: string) => void;
  clearScene: () => void;

  // Asset placement
  placeAsset: (asset: Omit<PlacedAssetData, 'id'>) => string;
  removeAsset: (id: string) => void;
  updateAssetTransform: (id: string, transform: Partial<Transform>) => void;
  attachAsset: (childId: string, parentId: string) => void;
  detachAsset: (childId: string) => void;
  updateAssetPrice: (id: string, priceOverride: number | undefined) => void;

  // Drag and drop
  setDraggingAsset: (asset: AssetDefinition | null) => void;
  dropAssetAt: (x: number, z: number, reservedStock: Record<string, number>, y?: number) => boolean;
  setDraggingPlacedAsset: (isDragging: boolean) => void;

  // Venue floor alignment
  setVenueFloorY: (floorY: number) => void;
  setVenueHallBounds: (bounds: {
    floorY: number;
    centerX: number;
    centerZ: number;
    safeWidth: number;
    safeDepth: number;
  }) => void;
  adjustAssetsToFloor: (floorY: number) => void;
  resetAssetPositions: (centerX: number, floorY: number, centerZ: number) => void;
  setHasVenueModel: (hasVenueModel: boolean) => void;

  // Selection
  selectAsset: (id: string | null) => void;
  setHoveredAsset: (id: string | null) => void;
  setPointerDownHitInteractive: (hit: boolean) => void;

  // Transform & view modes
  setTransformMode: (mode: TransformMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setShiftHeld: (held: boolean) => void;

  // Lighting
  updateLighting: (settings: Partial<LightingSettings>) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Status
  setDirty: (dirty: boolean) => void;
  setLocked: (locked: boolean) => void;
  markSaved: () => void;

  // Helpers
  getSelectedAsset: () => PlacedAssetData | null;
  snapToGrid: (value: number) => number;
}

interface DraggingState {
  draggingAsset: AssetDefinition | null;
  isDraggingPlacedAsset: boolean;
}

interface PointerState {
  pointerDownHitInteractive: boolean;
}

type VenueFloorState = {
  venueFloorY: number;
  venueCenterX: number;
  venueCenterZ: number;
  venueSafeWidth: number;
  venueSafeDepth: number;
  hasVenueModel: boolean;
};

const initialState: EditorState & DraggingState & PointerState & VenueFloorState = {
  placedAssets: [],
  lighting: DEFAULT_LIGHTING,
  venue: DEFAULT_VENUE,
  venueFloorY: 0,
  venueCenterX: 0,
  venueCenterZ: 0,
  venueSafeWidth: 0,
  venueSafeDepth: 0,
  hasVenueModel: false,
  selectedAssetId: null,
  hoveredAssetId: null,
  transformMode: 'translate',
  viewMode: 'orbit',
  isShiftHeld: false,
  history: [],
  historyIndex: -1,
  isDirty: false,
  isLocked: false,
  lastSavedAt: null,
  eventId: null,
  draggingAsset: null,
  isDraggingPlacedAsset: false,
  pointerDownHitInteractive: false,
};

export const useEditorStore = create<
  EditorState & DraggingState & PointerState & VenueFloorState & EditorActions
>((set, get) => ({
  ...initialState,

  // Initialize a new scene for an event
  initScene: (eventId, venue = DEFAULT_VENUE) => {
    set({
      ...initialState,
      eventId,
      venue,
      history: [{ placedAssets: [], timestamp: Date.now() }],
      historyIndex: 0,
    });
  },

  // Load an existing scene from the server
  loadScene: (assets, lighting, venue, isLocked, eventId) => {
    set({
      placedAssets: assets,
      lighting,
      venue,
      isLocked,
      ...(eventId != null && { eventId }),
      history: [{ placedAssets: assets, timestamp: Date.now() }],
      historyIndex: 0,
      isDirty: false,
      selectedAssetId: null,
      hoveredAssetId: null,
    });
  },

  // Clear the scene
  clearScene: () => {
    disposeAllPlacedAssetObjects();
    set(initialState);
  },

  // Place a new asset and return its ID
  placeAsset: (assetData) => {
    const id = crypto.randomUUID();
    const newAsset: PlacedAssetData = { ...assetData, id };

    set((state) => {
      const newAssets = [...state.placedAssets, newAsset];
      return {
        placedAssets: newAssets,
        isDirty: true,
        selectedAssetId: id,
      };
    });

    get().pushHistory();
    return id;
  },

  // Set the asset being dragged from the palette
  setDraggingAsset: (asset) => {
    set({ draggingAsset: asset });
  },

  // Drop the dragging asset at the specified position
  dropAssetAt: (_x, _z, reservedStock, _y?) => {
    const { draggingAsset, isLocked, venueFloorY } = get();
    if (!draggingAsset || isLocked) return false;

    // Large venue GLBs are heavy — cap total objects to avoid WebGL context loss.
    const currentCount = get().placedAssets.length;
    if (currentCount >= 200) {
      console.warn('[DreamStage] Max 200 items reached.');
      set({ draggingAsset: null });
      return false;
    }

    const currentReserved = reservedStock[draggingAsset.id] || 0;
    const available = draggingAsset.stockQuantity - currentReserved;

    if (available <= 0) {
      console.warn('Asset out of stock');
      set({ draggingAsset: null });
      return false;
    }

    const DEFAULT_ASSET_SCALE = 1.6;
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const baseX = Number.isFinite(_x) ? clamp(_x, -15, 15) : 0;
    const baseZ = Number.isFinite(_z) ? clamp(_z, -15, 15) : 0;
    const finalX = baseX + (Math.random() - 0.5) * 0.4;
    const finalZ = baseZ + (Math.random() - 0.5) * 0.4;
    const finalY = _y !== undefined ? _y : venueFloorY + 0.1;

    const newAsset: Omit<PlacedAssetData, 'id'> = {
      assetId: draggingAsset.id,
      name: draggingAsset.name,
      category: draggingAsset.category,
      transform: {
        position: { x: finalX, y: finalY, z: finalZ },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: DEFAULT_ASSET_SCALE, y: DEFAULT_ASSET_SCALE, z: DEFAULT_ASSET_SCALE },
      },
      unitPrice: draggingAsset.defaultUnitPrice,
      modelRef: draggingAsset.modelRef ?? null,
    };

    get().placeAsset(newAsset);
    set({ draggingAsset: null });
    return true;
  },

  setVenueFloorY: (floorY) => {
    set({ venueFloorY: floorY });
  },

  setVenueHallBounds: ({ floorY, centerX, centerZ, safeWidth, safeDepth }) => {
    set({
      venueFloorY: floorY,
      venueCenterX: centerX,
      venueCenterZ: centerZ,
      venueSafeWidth: safeWidth,
      venueSafeDepth: safeDepth,
    });
  },

  adjustAssetsToFloor: (floorY) => {
    set((state) => ({
      placedAssets: state.placedAssets.map((asset) => ({
        ...asset,
        transform: {
          ...asset.transform,
          position: {
            ...asset.transform.position,
            y: floorY,
          },
        },
      })),
    }));
  },

  resetAssetPositions: (centerX, floorY, centerZ) => {
    set((state) => {
      const total = state.placedAssets.length;
      const cols = Math.ceil(Math.sqrt(total || 1));
      const spacing = 1.2;
      return {
        placedAssets: state.placedAssets.map((asset, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          return {
            ...asset,
            transform: {
              ...asset.transform,
              position: {
                x: centerX + (col - cols / 2) * spacing,
                y: floorY,
                z: centerZ + (row - Math.floor(cols / 2)) * spacing,
              },
            },
          };
        }),
      };
    });
  },

  setHasVenueModel: (hasVenueModel) => {
    set({ hasVenueModel });
  },

  // Set whether a placed asset is being dragged (disables orbit controls)
  setDraggingPlacedAsset: (isDragging) => {
    set({ isDraggingPlacedAsset: isDragging });
  },

  // Remove an asset by ID
  removeAsset: (id) => {
    const state = get();
    const removed = state.placedAssets.find((a) => a.id === id);
    const remaining = state.placedAssets.filter((a) => a.id !== id);

    disposePlacedAssetById(id);
    maybeClearGltfCacheForModel(removed?.modelRef, remaining);

    set({
      placedAssets: remaining,
      selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
      isDirty: true,
    });
    get().pushHistory();
  },

  // Update asset transform (position, rotation, scale)
  updateAssetTransform: (id, transformUpdate) => {
    const state = get();
    const snapFn = state.isShiftHeld ? state.snapToGrid : (v: number) => v;

    set((state) => {
      const parent = state.placedAssets.find((a) => a.id === id);
      const dx = transformUpdate.position
        ? transformUpdate.position.x - (parent?.transform.position.x ?? 0)
        : 0;
      const dy = transformUpdate.position
        ? transformUpdate.position.y - (parent?.transform.position.y ?? 0)
        : 0;
      const dz = transformUpdate.position
        ? transformUpdate.position.z - (parent?.transform.position.z ?? 0)
        : 0;

      return {
        placedAssets: state.placedAssets.map((asset) => {
          if (asset.id === id) {
            const newTransform = { ...asset.transform };
            if (transformUpdate.position) {
              newTransform.position = {
                x: snapFn(transformUpdate.position.x),
                y: transformUpdate.position.y,
                z: snapFn(transformUpdate.position.z),
              };
            }
            if (transformUpdate.rotation) {
              newTransform.rotation = transformUpdate.rotation;
            }
            if (transformUpdate.scale) {
              newTransform.scale = transformUpdate.scale;
            }
            if (transformUpdate.locked !== undefined) {
              newTransform.locked = transformUpdate.locked;
            }
            return { ...asset, transform: newTransform };
          }
          // Move children with parent
          if (asset.parentId === id && transformUpdate.position) {
            return {
              ...asset,
              transform: {
                ...asset.transform,
                position: {
                  x: asset.transform.position.x + dx,
                  y: asset.transform.position.y + dy,
                  z: asset.transform.position.z + dz,
                },
              },
            };
          }
          return asset;
        }),
        isDirty: true,
      };
    });
  },

  attachAsset: (childId, parentId) => {
    set((state) => ({
      placedAssets: state.placedAssets.map((a) =>
        a.id === childId ? { ...a, parentId } : a
      ),
      isDirty: true,
    }));
  },

  detachAsset: (childId) => {
    set((state) => ({
      placedAssets: state.placedAssets.map((a) =>
        a.id === childId ? { ...a, parentId: null } : a
      ),
      isDirty: true,
    }));
  },

  // Update asset price override
  updateAssetPrice: (id, priceOverride) => {
    set((state) => ({
      placedAssets: state.placedAssets.map((asset) =>
        asset.id === id ? { ...asset, priceOverride } : asset
      ),
      isDirty: true,
    }));
    get().pushHistory();
  },

  // Selection
  selectAsset: (id) => set({ selectedAssetId: id }),
  setHoveredAsset: (id) => set({ hoveredAssetId: id }),
  setPointerDownHitInteractive: (hit) => set({ pointerDownHitInteractive: hit }),

  // Transform & view modes
  setTransformMode: (mode) => set({ transformMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShiftHeld: (held) => set({ isShiftHeld: held }),

  // Update lighting settings
  updateLighting: (settings) => {
    set((state) => ({
      lighting: { ...state.lighting, ...settings },
      isDirty: true,
    }));
  },

  // Undo - go back in history
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const entry = history[newIndex];

    set({
      placedAssets: entry.placedAssets,
      historyIndex: newIndex,
      isDirty: true,
      selectedAssetId: null,
    });
  },

  // Redo - go forward in history
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const entry = history[newIndex];

    set({
      placedAssets: entry.placedAssets,
      historyIndex: newIndex,
      isDirty: true,
      selectedAssetId: null,
    });
  },

  // Push current state to history (called after asset operations)
  pushHistory: () => {
    const { placedAssets, history, historyIndex } = get();

    // Remove any redo states after current index
    const newHistory = history.slice(0, historyIndex + 1);

    // Add current state
    newHistory.push({
      placedAssets: JSON.parse(JSON.stringify(placedAssets)),
      timestamp: Date.now(),
    });

    // Limit history size
    if (newHistory.length > UNDO_HISTORY_LIMIT) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // Status updates
  setDirty: (dirty) => set({ isDirty: dirty }),
  setLocked: (locked) => set({ isLocked: locked }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),

  // Get the currently selected asset
  getSelectedAsset: () => {
    const { placedAssets, selectedAssetId } = get();
    return placedAssets.find((a) => a.id === selectedAssetId) || null;
  },

  // Snap value to grid
  snapToGrid: (value) => {
    return Math.round(value / GRID_SNAP_INCREMENT) * GRID_SNAP_INCREMENT;
  },
}));

// Selector hooks for common patterns
export const useSelectedAsset = () =>
  useEditorStore((state) =>
    state.placedAssets.find((a) => a.id === state.selectedAssetId) || null
  );

export const usePlacedAssets = () => useEditorStore((state) => state.placedAssets);

export const useCanUndo = () =>
  useEditorStore((state) => state.historyIndex > 0);

export const useCanRedo = () =>
  useEditorStore((state) => state.historyIndex < state.history.length - 1);

export const useIsLocked = () => useEditorStore((state) => state.isLocked);

// Calculate total budget from placed assets
export const useTotalBudget = () =>
  useEditorStore((state) =>
    state.placedAssets.reduce(
      (total, asset) => total + (asset.priceOverride ?? asset.unitPrice),
      0
    )
  );

// Count assets by category
export const useAssetCountByCategory = () =>
  useEditorStore((state) => {
    const counts: Record<AssetCategory, number> = {
      seating: 0,
      tables: 0,
      lighting: 0,
      decor: 0,
      staging: 0,
      backdrops: 0,
      other: 0,
    };

    state.placedAssets.forEach((asset) => {
      counts[asset.category]++;
    });

    return counts;
  });
