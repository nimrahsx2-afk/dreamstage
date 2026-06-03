/**
 * Shared TypeScript types for the frontend.
 */

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'planner';
  createdAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

// Auth types
export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: string;
}

// Event types (placeholder - will expand later)
export interface Event {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  status: 'draft' | 'approved' | 'locked';
  budgetCeiling: number;
}

// Asset types (placeholder - will expand later)
export interface Asset {
  id: string;
  name: string;
  category: string;
  defaultUnitPrice: number;
  stockQuantity: number;
}
