/**
 * Frontend constants - mirrors server constants where needed.
 */

export const ROLES = {
  ADMIN: 'admin',
  PLANNER: 'planner',
} as const;

export const EVENT_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  LOCKED: 'locked',
} as const;

export const MODULE_COLORS = {
  editor: 'rose',
  budget: 'lavender',
  collaboration: 'mint',
  inventory: 'peach',
  booking: 'sky',
  dashboard: 'lemon',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EVENT: '/events/:id',
  EDITOR: '/events/:id/editor',
  SHARED_VIEW: '/view/:token',
  ADMIN_VENUES: '/admin/venues',
  ADMIN_ASSETS: '/admin/assets',
  ADMIN_PLANNERS: '/admin/planners',
} as const;
