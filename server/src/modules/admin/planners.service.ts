/**
 * Planner account management service.
 * Handles viewing and managing planner accounts (admin only).
 */

import { queryOne, queryAll } from '../../db/client';
import { NotFoundError } from '../../middleware/errorHandler';
import { ROLES } from '../../config/constants';
import {
  PlannerResponse,
  DbPlanner,
  PaginationParams,
  PaginatedResponse,
} from './admin.types';

/**
 * Get paginated list of all planner accounts.
 */
/**
 * All planners up to `limit` (admin dashboard table — no pagination).
 */
export async function getPlannersFlat(limit: number): Promise<PlannerResponse[]> {
  const planners = await queryAll<DbPlanner>(
    `SELECT 
       u.id, 
       u.name, 
       u.email, 
       u.is_active, 
       u.created_at,
       COUNT(e.id) as event_count
     FROM users u
     LEFT JOIN events e ON e.planner_id = u.id
     WHERE u.role = $1
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $2`,
    [ROLES.PLANNER, limit]
  );
  return planners.map(formatPlannerResponse);
}

export async function getAllPlanners(
  pagination: PaginationParams
): Promise<PaginatedResponse<PlannerResponse>> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  // Get total count of planners
  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) FROM users WHERE role = $1',
    [ROLES.PLANNER]
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get planners with event count
  const planners = await queryAll<DbPlanner>(
    `SELECT 
       u.id, 
       u.name, 
       u.email, 
       u.is_active, 
       u.created_at,
       COUNT(e.id) as event_count
     FROM users u
     LEFT JOIN events e ON e.planner_id = u.id
     WHERE u.role = $1
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [ROLES.PLANNER, limit, offset]
  );

  return {
    data: planners.map(formatPlannerResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single planner by ID with their event count.
 */
export async function getPlannerById(id: string): Promise<PlannerResponse> {
  const planner = await queryOne<DbPlanner>(
    `SELECT 
       u.id, 
       u.name, 
       u.email, 
       u.is_active, 
       u.created_at,
       COUNT(e.id) as event_count
     FROM users u
     LEFT JOIN events e ON e.planner_id = u.id
     WHERE u.id = $1 AND u.role = $2
     GROUP BY u.id`,
    [id, ROLES.PLANNER]
  );

  if (!planner) {
    throw new NotFoundError('Planner not found');
  }

  return formatPlannerResponse(planner);
}

/**
 * Toggle planner account status (activate/suspend).
 */
export async function togglePlannerStatus(id: string): Promise<PlannerResponse> {
  // First verify this is a planner (not admin)
  const existing = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [id]
  );

  if (!existing) {
    throw new NotFoundError('User not found');
  }

  if (existing.role !== ROLES.PLANNER) {
    throw new NotFoundError('Planner not found');
  }

  // Toggle status
  await queryOne(
    'UPDATE users SET is_active = NOT is_active WHERE id = $1',
    [id]
  );

  // Return updated planner with event count
  return getPlannerById(id);
}

/**
 * Format database planner to response object.
 */
function formatPlannerResponse(planner: DbPlanner): PlannerResponse {
  return {
    id: planner.id,
    name: planner.name,
    email: planner.email,
    isActive: planner.is_active,
    status: planner.is_active ? 'active' : 'suspended',
    eventCount: parseInt(planner.event_count ?? '0', 10),
    createdAt: planner.created_at.toISOString(),
  };
}
