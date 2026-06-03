/**
 * Run migration 004: Add total_contract_amount to vendors
 */

import { query } from '../src/db/client';

async function run() {
  console.log('Running migration 004: Add total_contract_amount to vendors...');
  await query(`
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_contract_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  `);
  console.log('Migration 004 complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
