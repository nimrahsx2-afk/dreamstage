-- Migration 007: Standalone client inquiries (planning leads, not tied to events)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
  addons TEXT[],
  budget_range VARCHAR(100),
  lighting_preference VARCHAR(100),
  decoration_preference VARCHAR(255),
  special_requests TEXT,
  inspiration_images TEXT[],
  is_submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_planner_id ON inquiries(planner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_share_token ON inquiries(share_token);
