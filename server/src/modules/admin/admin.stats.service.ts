/**
 * Admin dashboard aggregate stats.
 */

import { queryOne, queryAll } from '../../db/client';
import { ROLES } from '../../config/constants';

export interface AdminStats {
  totalEvents: number;
  /** Planner-side inquiry rows (includes drafts + submitted). */
  totalInquiries: number;
  /** Submitted client inquiry forms (still visible when not yet converted to an event). */
  submittedInquiries: number;
  activePlanners: number;
  /** Sum of vendor_payments.amount (actual payments). */
  totalRevenue: number;
  /** Sum of events.budget_ceiling — planner budget ceilings. */
  totalBudget: number;
  pendingBookings: number;
  /** Rows sum to the same total as totalEvents (cross-check with planner My Events). */
  eventsByPlanner: { plannerName: string; eventCount: number }[];
  eventsByMonth: { label: string; count: number }[];
  venueCategories: { category: string; count: number }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const eventsRow = await queryOne<{ c: string }>('SELECT COUNT(*)::text AS c FROM events');
  const inquiriesTotalRow = await queryOne<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM inquiries'
  );
  const inquiriesSubmittedRow = await queryOne<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM inquiries WHERE is_submitted = true'
  );
  const plannersRow = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM users WHERE role = $1 AND is_active = true`,
    [ROLES.PLANNER]
  );
  const revenueRow = await queryOne<{ s: string | null }>(
    'SELECT COALESCE(SUM(amount), 0)::text AS s FROM vendor_payments'
  );
  const budgetRow = await queryOne<{ s: string | null }>(
    'SELECT COALESCE(SUM(budget_ceiling), 0)::text AS s FROM events'
  );
  const pendingRow = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM venue_bookings WHERE status = 'provisional'`
  );

  const monthRows = await queryAll<{ label: string; c: string }>(
    `SELECT 
       to_char(date_trunc('month', event_date::timestamp), 'Mon YYYY') AS label,
       COUNT(*)::text AS c
     FROM events
     WHERE event_date IS NOT NULL
     GROUP BY date_trunc('month', event_date::timestamp)
     ORDER BY date_trunc('month', event_date::timestamp) ASC`
  );

  const catRows = await queryAll<{ category: string; c: string }>(
    `SELECT
       CASE
         WHEN NULLIF(TRIM(event_type), '') IS NULL THEN 'Other'
         WHEN LOWER(TRIM(event_type)) = 'unknown' THEN 'Other'
         ELSE TRIM(event_type)
       END AS category,
       COUNT(*)::text AS c
     FROM events
     GROUP BY 1
     ORDER BY COUNT(*) DESC
     LIMIT 8`
  );

  const byPlannerRows = await queryAll<{ planner_name: string; c: string }>(
    `SELECT u.name AS planner_name, COUNT(e.id)::text AS c
     FROM users u
     LEFT JOIN events e ON e.planner_id = u.id
     WHERE u.role = $1 AND u.is_active = true
     GROUP BY u.id, u.name
     ORDER BY COUNT(e.id) DESC, u.name ASC`,
    [ROLES.PLANNER]
  );

  const safeInt = (v: string | undefined) => {
    const n = parseInt(v ?? '0', 10);
    return Number.isFinite(n) ? n : 0;
  };
  const safeFloat = (v: string | null | undefined) => {
    const n = parseFloat(v ?? '0');
    return Number.isFinite(n) ? n : 0;
  };

  return {
    totalEvents: safeInt(eventsRow?.c),
    totalInquiries: safeInt(inquiriesTotalRow?.c),
    submittedInquiries: safeInt(inquiriesSubmittedRow?.c),
    activePlanners: safeInt(plannersRow?.c),
    totalRevenue: safeFloat(revenueRow?.s),
    totalBudget: safeFloat(budgetRow?.s),
    pendingBookings: safeInt(pendingRow?.c),
    eventsByPlanner: byPlannerRows.map((r) => ({
      plannerName: r.planner_name,
      eventCount: safeInt(r.c),
    })),
    eventsByMonth: monthRows.map((r) => ({ label: r.label, count: safeInt(r.c) })),
    venueCategories: catRows.map((r) => ({ category: r.category, count: safeInt(r.c) })),
  };
}

export interface BudgetBreakdownItem {
  eventName: string;
  eventType: string;
  plannerName: string;
  eventDate: string | null;
  budgetCeiling: number;
}

export async function getBudgetBreakdown(): Promise<BudgetBreakdownItem[]> {
  const rows = await queryAll<{
    event_name: string;
    event_type: string;
    planner_name: string;
    event_date: string | null;
    budget_ceiling: string;
  }>(
    `SELECT 
       e.name AS event_name,
       COALESCE(NULLIF(TRIM(e.event_type), ''), 'Other') AS event_type,
       u.name AS planner_name,
       e.event_date::text AS event_date,
       COALESCE(e.budget_ceiling, 0)::text AS budget_ceiling
     FROM events e
     JOIN users u ON u.id = e.planner_id
     ORDER BY e.budget_ceiling DESC NULLS LAST`
  );
  return rows.map((r) => ({
    eventName: r.event_name,
    eventType: r.event_type,
    plannerName: r.planner_name,
    eventDate: r.event_date,
    budgetCeiling: parseFloat(r.budget_ceiling) || 0,
  }));
}
