-- Promo video (YouTube or embed URL stored as entered; client converts for iframe)
ALTER TABLE venue_templates
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN venue_templates.video_url IS 'YouTube watch or share URL for public venue detail embed';
