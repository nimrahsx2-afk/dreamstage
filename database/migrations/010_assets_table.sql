-- Migration 010: Extend existing assets with file_url (full GLB path), backfill + seed GLBs.
-- Does NOT create a new table — DreamStage already has `assets` from 001_initial_schema.

ALTER TABLE assets ADD COLUMN IF NOT EXISTS file_url TEXT;

UPDATE assets
SET file_url = '/models/' || model_ref
WHERE model_ref IS NOT NULL
  AND TRIM(model_ref) <> ''
  AND model_ref NOT LIKE '/%'
  AND (file_url IS NULL OR TRIM(file_url) = '');

INSERT INTO assets (name, category, default_unit_price, stock_quantity, model_ref, file_url, is_active)
SELECT 'Round Table', 'tables', 5000.00, 999, 'TABLE.glb', '/models/TABLE.glb', true
WHERE NOT EXISTS (
  SELECT 1 FROM assets a WHERE a.file_url = '/models/TABLE.glb' OR a.model_ref = 'TABLE.glb'
);

INSERT INTO assets (name, category, default_unit_price, stock_quantity, model_ref, file_url, is_active)
SELECT 'Chair', 'seating', 800.00, 999, 'chair2f.glb', '/models/chair2f.glb', true
WHERE NOT EXISTS (
  SELECT 1 FROM assets a WHERE a.file_url = '/models/chair2f.glb' OR a.model_ref = 'chair2f.glb'
);

INSERT INTO assets (name, category, default_unit_price, stock_quantity, model_ref, file_url, is_active)
SELECT 'Fancy Chair', 'seating', 1200.00, 999, 'finalchair88.glb', '/models/finalchair88.glb', true
WHERE NOT EXISTS (
  SELECT 1 FROM assets a WHERE a.file_url = '/models/finalchair88.glb' OR a.model_ref = 'finalchair88.glb'
);
