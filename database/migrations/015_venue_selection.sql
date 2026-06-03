-- Migration 015: Venue shortlisting + client venue selection (inquiries)

-- Add shortlisted venues to inquiries
ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS shortlisted_venue_ids UUID[] DEFAULT '{}';

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS selected_venue_id UUID REFERENCES venue_templates(id);

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS venue_selection_token VARCHAR(255);

ALTER TABLE inquiries  
ADD COLUMN IF NOT EXISTS venue_selected_at TIMESTAMPTZ;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS venue_hold_expires_at TIMESTAMPTZ;

