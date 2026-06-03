// Inventory Module Types

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

export interface AssetInput {
  name: string;
  category: AssetCategory;
  defaultUnitPrice: number;
  stockQuantity: number;
  modelRef?: string;
  thumbnailUrl?: string;
  description?: string;
  isActive?: boolean;
}

export interface AssetUpdate {
  name?: string;
  category?: AssetCategory;
  defaultUnitPrice?: number;
  stockQuantity?: number;
  modelRef?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface StockReservation {
  id: string;
  eventId: string;
  assetId: string;
  quantityReserved: number;
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

// Database row types
export interface DbAsset {
  id: string;
  name: string;
  category: string;
  default_unit_price: string;
  stock_quantity: number;
  model_ref: string | null;
  /** Full web path to GLB, e.g. /models/uuid.glb (migration 010) */
  file_url?: string | null;
  thumbnail_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbStockReservation {
  id: string;
  event_id: string;
  asset_id: string;
  quantity_reserved: number;
  created_at: Date;
  updated_at: Date;
}

export interface DbStockAvailability {
  asset_id: string;
  asset_name: string;
  total_stock: number;
  total_reserved: string; // Comes as string from SUM
}
