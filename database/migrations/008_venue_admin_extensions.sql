-- Admin venue form: pricing, location, gallery (JSON array of URL strings)

ALTER TABLE venue_templates
  ADD COLUMN IF NOT EXISTS price_per_head DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS location VARCHAR(500),
  ADD COLUMN IF NOT EXISTS gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN venue_templates.price_per_head IS 'Optional PKR price per guest for admin venue cards';
COMMENT ON COLUMN venue_templates.gallery_images IS 'JSON array of image URL strings';
