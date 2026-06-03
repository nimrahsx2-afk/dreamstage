-- Migration 006: Client Requirements Form
-- Adds client_requirements table used by public requirements form links

-- gen_random_uuid() requires pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS client_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  event_type VARCHAR(100),
  event_date DATE,
  guest_count INTEGER,
  venue_type VARCHAR(100),
  hall_preference VARCHAR(255),
  seating_style VARCHAR(100),
  seating_notes TEXT,
  meal_preference VARCHAR(100),
  lighting_preference VARCHAR(100),
  decoration_preference VARCHAR(255),
  addons TEXT[],
  budget_range VARCHAR(100),
  special_requests TEXT,
  is_submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_requirements_event_id ON client_requirements(event_id);
CREATE INDEX IF NOT EXISTS idx_client_requirements_share_token ON client_requirements(share_token);
