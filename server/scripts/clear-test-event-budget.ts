/**
 * Clear budget items and scene layout for the test event.
 * Run with: npx ts-node scripts/clear-test-event-budget.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TEST_EVENT_ID = '11111111-1111-1111-1111-111111111111';

async function clearTestEventBudget() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');

    // Clear stock reservations for this event (they reference placed assets)
    const reservationsResult = await pool.query(
      `DELETE FROM stock_reservations WHERE event_id = $1`,
      [TEST_EVENT_ID]
    );
    console.log(`  ✓ Cleared ${reservationsResult.rowCount ?? 0} stock reservation(s)`);

    // Clear budget items
    const budgetResult = await pool.query(
      `DELETE FROM budget_items WHERE event_id = $1`,
      [TEST_EVENT_ID]
    );
    console.log(`  ✓ Cleared ${budgetResult.rowCount ?? 0} budget item(s)`);

    // Clear scene layout
    const sceneResult = await pool.query(
      `DELETE FROM scene_layouts WHERE event_id = $1`,
      [TEST_EVENT_ID]
    );
    console.log(`  ✓ Cleared ${sceneResult.rowCount ?? 0} scene layout(s)`);

    console.log('\nTest event budget and scene cleared. Budget will show Rs. 0 until assets are placed.');
  } catch (error) {
    console.error('Clear failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearTestEventBudget();
