-- DreamStage Initial Database Schema
-- All prices stored in PKR (Pakistani Rupees)
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'planner');
CREATE TYPE event_status AS ENUM ('draft', 'approved', 'locked');
CREATE TYPE booking_status AS ENUM ('provisional', 'confirmed');
CREATE TYPE payment_type AS ENUM ('deposit', 'final');

-- ============================================
-- Core Tables
-- ============================================

-- Users table (planners and admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'planner',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Venue templates (managed by admin)
CREATE TABLE venue_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    thumbnail_url TEXT,
    model_ref TEXT, -- GLB filename only (e.g. TABLE.glb), loaded from /models/ folder (null = use placeholder)
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assets (décor inventory, managed by admin)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    default_unit_price DECIMAL(12, 2) NOT NULL, -- Price in PKR
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    model_ref TEXT, -- GLB filename only (e.g. TABLE.glb), loaded from /models/ folder (null = use placeholder primitive)
    thumbnail_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events (planner's projects)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_template_id UUID REFERENCES venue_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    status event_status NOT NULL DEFAULT 'draft',
    share_token UUID UNIQUE DEFAULT uuid_generate_v4(), -- For client sharing
    share_password_hash VARCHAR(255), -- Optional password protection
    budget_ceiling DECIMAL(12, 2), -- Maximum budget in PKR
    show_budget_details BOOLEAN NOT NULL DEFAULT true, -- Show breakdown to client
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scene layouts (3D editor state)
CREATE TABLE scene_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scene_json JSONB NOT NULL DEFAULT '{}', -- Full Three.js scene serialization
    version INTEGER NOT NULL DEFAULT 1,
    locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Venue bookings
CREATE TABLE venue_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_template_id UUID NOT NULL REFERENCES venue_templates(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    status booking_status NOT NULL DEFAULT 'provisional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_template_id, booking_date) -- Prevent double booking
);

-- Vendors (per event)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    quote_url TEXT, -- Signed URL to PDF in Firebase Storage
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor payments
CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL, -- Amount in PKR
    payment_type payment_type NOT NULL,
    paid_at DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Budget items (price overrides per event)
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_override DECIMAL(12, 2), -- Override price in PKR (null = use default)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, asset_id)
);

-- Stock reservations (per event per asset)
CREATE TABLE stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, asset_id)
);

-- Client comments (threaded)
CREATE TABLE client_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES client_comments(id) ON DELETE CASCADE,
    client_identifier VARCHAR(255) NOT NULL, -- Name entered by client
    content TEXT NOT NULL,
    is_planner_reply BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approvals (immutable audit trail)
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    client_identifier VARCHAR(255) NOT NULL, -- Name of approving client
    scene_version_ref INTEGER NOT NULL, -- Version of scene at approval time
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- NO update_at - this table is immutable
);

-- Checklist items
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    is_system_generated BOOLEAN NOT NULL DEFAULT false, -- Cannot delete system items
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Milestones
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_date DATE NOT NULL,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Day-of timeline entries
CREATE TABLE timeline_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    time_slot TIME NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;

-- Event lookups
CREATE INDEX idx_events_planner_id ON events(planner_id);
CREATE INDEX idx_events_share_token ON events(share_token);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

-- Venue booking conflict checks
CREATE INDEX idx_venue_bookings_venue_date ON venue_bookings(venue_template_id, booking_date);
CREATE INDEX idx_venue_bookings_event ON venue_bookings(event_id);

-- Stock reservation checks
CREATE INDEX idx_stock_reservations_asset ON stock_reservations(asset_id);
CREATE INDEX idx_stock_reservations_event ON stock_reservations(event_id);

-- Scene layouts
CREATE INDEX idx_scene_layouts_event ON scene_layouts(event_id);

-- Budget items
CREATE INDEX idx_budget_items_event ON budget_items(event_id);

-- Vendors and payments
CREATE INDEX idx_vendors_event ON vendors(event_id);
CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id);

-- Comments
CREATE INDEX idx_client_comments_event ON client_comments(event_id);
CREATE INDEX idx_client_comments_parent ON client_comments(parent_comment_id);

-- Checklist and timeline
CREATE INDEX idx_checklist_items_event ON checklist_items(event_id);
CREATE INDEX idx_milestones_event ON milestones(event_id);
CREATE INDEX idx_timeline_entries_event ON timeline_entries(event_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_templates_updated_at BEFORE UPDATE ON venue_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scene_layouts_updated_at BEFORE UPDATE ON scene_layouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_bookings_updated_at BEFORE UPDATE ON venue_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_reservations_updated_at BEFORE UPDATE ON stock_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_entries_updated_at BEFORE UPDATE ON timeline_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
