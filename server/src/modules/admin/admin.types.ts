/**
 * Type definitions for admin module.
 */

import { AssetCategory, VenueCategory } from '../../config/constants';

// ===========================================
// Pagination
// ===========================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===========================================
// Venue Templates
// ===========================================

export interface CreateVenueInput {
  name: string;
  category: string;
  capacity: number;
  description?: string;
  thumbnailUrl?: string;
  modelRef?: string;
  pricePerHead?: number | null;
  location?: string | null;
  /** Public or stored image URLs */
  galleryImages?: string[];
  videoUrl?: string | null;
}

export interface UpdateVenueInput {
  name?: string;
  category?: string;
  capacity?: number;
  description?: string | null;
  thumbnailUrl?: string | null;
  modelRef?: string | null;
  pricePerHead?: number | null;
  location?: string | null;
  galleryImages?: string[];
  videoUrl?: string | null;
}

export interface VenueResponse {
  id: string;
  name: string;
  category: string;
  capacity: number;
  description: string | null;
  thumbnailUrl: string | null;
  modelRef: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pricePerHead: number | null;
  location: string | null;
  galleryImages: string[];
  videoUrl: string | null;
}

export interface DbVenue {
  id: string;
  name: string;
  category: string;
  capacity: number;
  description: string | null;
  thumbnail_url: string | null;
  model_ref: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  price_per_head?: string | null;
  location?: string | null;
  gallery_images?: unknown;
  video_url?: string | null;
}

// ===========================================
// Assets
// ===========================================

export interface CreateAssetInput {
  name: string;
  category: string;
  defaultUnitPrice: number;
  stockQuantity: number;
  description?: string;
  thumbnailUrl?: string;
  modelRef?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: string;
  defaultUnitPrice?: number;
  stockQuantity?: number;
  description?: string | null;
  thumbnailUrl?: string | null;
  modelRef?: string | null;
}

export interface AssetResponse {
  id: string;
  name: string;
  category: string;
  defaultUnitPrice: number;
  stockQuantity: number;
  description: string | null;
  thumbnailUrl: string | null;
  modelRef: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbAsset {
  id: string;
  name: string;
  category: string;
  default_unit_price: string; // DECIMAL comes as string from pg
  stock_quantity: number;
  description: string | null;
  thumbnail_url: string | null;
  model_ref: string | null;
  file_url?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssetFilters {
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface StockAdjustment {
  delta: number; // Positive to add, negative to remove
}

// ===========================================
// Planners
// ===========================================

export interface PlannerResponse {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  /** Derived for admin UI */
  status: 'active' | 'suspended';
  eventCount: number;
  createdAt: string;
}

export interface DbPlanner {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: Date;
  event_count?: string; // COUNT returns string
}
