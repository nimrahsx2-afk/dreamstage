// Inventory API Service

import { api } from '../../services/api';
import type {
  Asset,
  StockAvailability,
  EventStockReservation,
  ReserveStockInput,
  ReserveStockResult,
  SyncReservationsInput,
  AssetCategory,
  AssetWithAvailability,
} from './inventory.types';

// ============ ASSET FETCHING ============

// Get all active assets (public catalog — no JWT required)
export async function getAssets(): Promise<Asset[]> {
  try {
    const response = await api.get('/assets');
    return response.data.data as Asset[];
  } catch (error: unknown) {
    console.error('[InventoryAPI] Failed to fetch assets:', error);
    throw error;
  }
}

// Get assets by category
export async function getAssetsByCategory(category: AssetCategory): Promise<Asset[]> {
  const response = await api.get(`/inventory/assets/category/${category}`);
  return response.data.data;
}

// Get single asset
export async function getAsset(assetId: string): Promise<Asset> {
  const response = await api.get(`/inventory/assets/${assetId}`);
  return response.data.data;
}

// ============ STOCK AVAILABILITY ============

// Get all stock availability
export async function getAllAvailability(): Promise<StockAvailability[]> {
  console.log('[InventoryAPI] Fetching availability...');
  try {
    const response = await api.get('/inventory/availability');
    console.log('[InventoryAPI] Availability fetched:', response.data);
    return response.data.data;
  } catch (error: any) {
    console.error('[InventoryAPI] Failed to fetch availability:', error.response?.status, error.response?.data);
    throw error;
  }
}

// Get single asset availability
export async function getAssetAvailability(assetId: string): Promise<StockAvailability> {
  const response = await api.get(`/inventory/availability/${assetId}`);
  return response.data.data;
}

// Fast stock check for a quantity
export async function checkStockAvailable(
  assetId: string,
  quantity: number
): Promise<{ available: boolean; currentAvailable: number }> {
  const response = await api.get(`/inventory/availability/${assetId}/check`, {
    params: { quantity },
  });
  return response.data.data;
}

// ============ COMBINED ASSETS + AVAILABILITY ============

// Get assets with their availability (for editor palette)
export async function getAssetsWithAvailability(): Promise<AssetWithAvailability[]> {
  const [assets, availability] = await Promise.all([
    getAssets(),
    getAllAvailability(),
  ]);

  const availabilityMap = new Map(
    availability.map((a) => [a.assetId, a])
  );

  return assets.map((asset) => {
    const stockInfo = availabilityMap.get(asset.id);
    return {
      ...asset,
      availableStock: stockInfo?.availableStock ?? asset.stockQuantity,
      totalReserved: stockInfo?.totalReserved ?? 0,
    };
  });
}

// ============ STOCK RESERVATIONS ============

// Get reservations for an event
export async function getEventReservations(eventId: string): Promise<EventStockReservation[]> {
  const response = await api.get(`/inventory/events/${eventId}/reservations`);
  return response.data.data;
}

// Reserve stock for an event
export async function reserveStock(
  eventId: string,
  input: ReserveStockInput
): Promise<ReserveStockResult> {
  const response = await api.post(`/inventory/events/${eventId}/reservations`, input);
  return response.data.data;
}

// Release stock from a reservation
export async function releaseStock(
  eventId: string,
  assetId: string,
  quantity?: number
): Promise<{ success: boolean; newQuantity: number }> {
  const response = await api.delete(
    `/inventory/events/${eventId}/reservations/${assetId}`,
    { params: quantity ? { quantity } : undefined }
  );
  return response.data.data;
}

// Sync reservations from scene state
export async function syncReservationsFromScene(
  eventId: string,
  input: SyncReservationsInput
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await api.post(
    `/inventory/events/${eventId}/reservations/sync`,
    input
  );
  
  if (response.data.success) {
    return { success: true };
  }
  
  return {
    success: false,
    errors: response.data.data?.errors || [],
  };
}

// ============ ADMIN OPERATIONS ============

// Create asset (Admin)
export async function createAsset(input: Partial<Asset>): Promise<Asset> {
  const response = await api.post('/inventory/assets', input);
  return response.data.data;
}

// Update asset (Admin)
export async function updateAsset(assetId: string, input: Partial<Asset>): Promise<Asset> {
  const response = await api.put(`/inventory/assets/${assetId}`, input);
  return response.data.data;
}

// Delete asset (Admin - soft delete)
export async function deleteAsset(assetId: string): Promise<void> {
  await api.delete(`/inventory/assets/${assetId}`);
}
