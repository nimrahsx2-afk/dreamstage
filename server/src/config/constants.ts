/**
 * Centralized constants for the entire application.
 * No hardcoded values should appear in other files.
 */

export const ROLES = {
  ADMIN: 'admin',
  PLANNER: 'planner',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const EVENT_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  LOCKED: 'locked',
} as const;

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];

export const BOOKING_STATUS = {
  PROVISIONAL: 'provisional',
  CONFIRMED: 'confirmed',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

export const PAYMENT_TYPE = {
  DEPOSIT: 'deposit',
  FINAL: 'final',
} as const;

export type PaymentType = typeof PAYMENT_TYPE[keyof typeof PAYMENT_TYPE];

export const LIMITS = {
  MAX_PDF_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  AUTO_SAVE_INTERVAL_MS: 60000, // 60 seconds
  BCRYPT_COST_FACTOR: 12,
  JWT_EXPIRY_HOURS: 24,
  MAX_ASSETS_PER_SCENE: 100,
  BUDGET_RECALC_TARGET_MS: 500,
  STOCK_CHECK_TARGET_MS: 300,
} as const;

export const THRESHOLDS = {
  STOCK_LOW_WARNING: 10,
  STOCK_CRITICAL: 5,
  BUDGET_WARNING_PERCENT: 90,
} as const;

export const VENDOR_CATEGORIES = [
  'catering',
  'florist',
  'photography',
  'videography',
  'entertainment',
  'lighting',
  'sound',
  'decoration',
  'transportation',
  'other',
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number];

export const ASSET_CATEGORIES = [
  'tables',
  'chairs',
  'lighting',
  'decor',
  'staging',
  'linens',
  'centerpieces',
  'audio_visual',
  'other',
] as const;

export type AssetCategory = typeof ASSET_CATEGORIES[number];

export const VENUE_CATEGORIES = [
  'ballroom',
  'garden',
  'beach',
  'rooftop',
  'conference',
  'banquet_hall',
  'outdoor',
  'indoor',
  'other',
] as const;

export type VenueCategory = typeof VENUE_CATEGORIES[number];

export const EVENT_TYPES = [
  'wedding',
  'corporate',
  'birthday',
  'anniversary',
  'conference',
  'seminar',
  'exhibition',
  'concert',
  'other',
] as const;

export type EventType = typeof EVENT_TYPES[number];
