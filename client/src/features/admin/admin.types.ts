/**
 * Admin module types (matches server admin.types)
 */

export interface AdminVenue {
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
  pricePerHead?: number | null;
  location?: string | null;
  galleryImages?: string[];
  videoUrl?: string | null;
}

export interface AdminAsset {
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

export interface AdminPlanner {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  status?: 'active' | 'suspended';
  eventCount: number;
  createdAt: string;
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

export interface CreateVenueInput {
  name: string;
  category: string;
  capacity: number;
  description?: string;
  thumbnailUrl?: string;
  modelRef?: string;
  glbModelUrl?: string | null;
  pricePerHead?: number | null;
  location?: string | null;
  galleryImages?: string[];
  videoUrl?: string | null;
}

export interface AdminStats {
  totalEvents: number;
  totalInquiries: number;
  submittedInquiries: number;
  activePlanners: number;
  totalRevenue: number;
  /** Sum of event budget ceilings — platform-wide budget caps. */
  totalBudget: number;
  pendingBookings: number;
  eventsByPlanner: { plannerName: string; eventCount: number }[];
  eventsByMonth: { label: string; count: number }[];
  venueCategories: { category: string; count: number }[];
}

export type AdminActivityType =
  | 'event_created'
  | 'booking_confirmed'
  | 'design_approved'
  | 'inquiry_submitted'
  | 'inquiry_converted';

export interface AdminActivityItem {
  id: string;
  type: AdminActivityType;
  title: string;
  subtitle: string | null;
  createdAt: string;
}

export interface UpdateVenueInput {
  name?: string;
  category?: string;
  capacity?: number;
  description?: string | null;
  thumbnailUrl?: string | null;
  modelRef?: string | null;
  glbModelUrl?: string | null;
  pricePerHead?: number | null;
  location?: string | null;
  galleryImages?: string[];
  videoUrl?: string | null;
}

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
