-- Migration 004: Add total_contract_amount to vendors
-- Total agreed price with the vendor; used for budget calculations and payment validation

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_contract_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
