// Inventory Frontend Types

export type AssetCategory =
  | 'seating'
  | 'tables'
  | 'lighting'
  | 'decor'
  | 'staging'
  | 'backdrops'
  | 'other';

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  defaultUnitPrice: number;
  stockQuantity: number;
  modelRef: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockAvailability {
  assetId: string;
  assetName: string;
  totalStock: number;
  totalReserved: number;
  availableStock: number;
  isAvailable: boolean;
}

export interface EventStockReservation {
  assetId: string;
  assetName: string;
  category: AssetCategory;
  quantityReserved: number;
  unitPrice: number;
}

export interface ReserveStockInput {
  assetId: string;
  quantity: number;
}

export interface ReserveStockResult {
  success: boolean;
  assetId: string;
  quantityReserved: number;
  availableAfter: number;
  error?: string;
}

export interface SyncReservationsInput {
  placedAssets: Array<{
    assetId: string;
    quantity: number;
  }>;
}

// Extended asset with availability for editor
export interface AssetWithAvailability extends Asset {
  availableStock: number;
  totalReserved: number;
}
