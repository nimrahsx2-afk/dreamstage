-- Migration 016: Track inquiry -> event conversion
ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS converted_event_id UUID REFERENCES events(id);

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

