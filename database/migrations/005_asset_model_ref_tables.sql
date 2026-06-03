-- Migration 005: Set model_ref for table assets to use TABLE.glb
UPDATE assets SET model_ref = 'TABLE.glb' WHERE category = 'tables';
