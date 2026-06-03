-- DreamStage Seed Data
-- Initial data for development and testing
-- All prices in PKR (Pakistani Rupees)
-- Migration: 002_seed_data

-- ============================================
-- Users (Test Accounts)
-- ============================================
-- Note: For development, register new users through the app
-- The registration endpoint creates proper bcrypt hashes
INSERT INTO users (id, name, email, password_hash, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@dreamstage.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4rPzQj4j0Y3yzNXq', 'admin');

-- ============================================
-- Venue Templates
-- ============================================
INSERT INTO venue_templates (name, category, capacity, description, is_active) VALUES
    ('Grand Ballroom', 'ballroom', 500, 'Elegant ballroom with crystal chandeliers and marble floors', true),
    ('Rose Garden', 'garden', 200, 'Beautiful outdoor garden with rose archways and fountain', true),
    ('Skyline Terrace', 'rooftop', 150, 'Rooftop venue with panoramic city views', true),
    ('Crystal Hall', 'banquet_hall', 300, 'Modern banquet hall with contemporary design', true),
    ('Sunset Beach', 'beach', 100, 'Beachfront venue with ocean views', true),
    ('Executive Conference', 'conference', 80, 'Professional conference room with AV equipment', true),
    ('Emerald Lawn', 'outdoor', 400, 'Spacious lawn area perfect for large gatherings', true),
    ('Pearl Lounge', 'indoor', 120, 'Intimate indoor space with warm ambiance', true);

-- ============================================
-- Assets (Décor Inventory) - Prices in PKR
-- ============================================

-- Tables
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Round Table (6-seater)', 'tables', 3000.00, 50, 'Classic round table seating 6 guests'),
    ('Round Table (8-seater)', 'tables', 4000.00, 30, 'Large round table seating 8 guests'),
    ('Rectangular Table (8-seater)', 'tables', 4500.00, 25, 'Long rectangular table seating 8 guests'),
    ('Cocktail Table', 'tables', 1500.00, 40, 'High cocktail/standing table'),
    ('Head Table (12-seater)', 'tables', 8000.00, 10, 'Premium head table for VIPs');

-- Chairs
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Chiavari Chair (Gold)', 'chairs', 500.00, 300, 'Elegant gold chiavari chair'),
    ('Chiavari Chair (Silver)', 'chairs', 500.00, 200, 'Classic silver chiavari chair'),
    ('Banquet Chair', 'chairs', 350.00, 400, 'Standard padded banquet chair'),
    ('Ghost Chair', 'chairs', 800.00, 100, 'Modern transparent acrylic chair'),
    ('Throne Chair', 'chairs', 5000.00, 10, 'Decorative throne for bride/groom');

-- Lighting
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Crystal Chandelier', 'lighting', 15000.00, 8, 'Grand crystal chandelier'),
    ('LED Uplighting (per unit)', 'lighting', 1000.00, 50, 'Color-changing LED uplight'),
    ('String Lights (10m)', 'lighting', 800.00, 100, 'Warm white string lights'),
    ('Fairy Light Curtain', 'lighting', 2500.00, 30, 'Backdrop fairy light curtain'),
    ('Spotlight', 'lighting', 1500.00, 20, 'Professional spotlight');

-- Décor
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Flower Centerpiece (Small)', 'centerpieces', 1500.00, 100, 'Fresh flower arrangement - small'),
    ('Flower Centerpiece (Large)', 'centerpieces', 3500.00, 50, 'Fresh flower arrangement - large'),
    ('Candelabra', 'centerpieces', 2000.00, 40, '5-arm silver candelabra'),
    ('Crystal Vase', 'centerpieces', 1200.00, 60, 'Elegant crystal vase'),
    ('Floating Candles Set', 'centerpieces', 800.00, 80, 'Set of 3 floating candles');

-- Staging
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Stage Platform (per sq ft)', 'staging', 150.00, 500, 'Modular stage platform'),
    ('Dance Floor (per sq ft)', 'staging', 200.00, 400, 'LED dance floor panel'),
    ('Red Carpet (per meter)', 'staging', 500.00, 100, 'Premium red carpet runner'),
    ('Backdrop Frame', 'staging', 8000.00, 15, 'Large backdrop frame structure'),
    ('Mandap Structure', 'staging', 50000.00, 5, 'Traditional wedding mandap');

-- Linens
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Table Cloth (Round)', 'linens', 600.00, 100, 'Premium polyester table cloth'),
    ('Table Runner', 'linens', 300.00, 150, 'Decorative table runner'),
    ('Chair Cover', 'linens', 200.00, 400, 'Stretch chair cover'),
    ('Napkin Set (10)', 'linens', 250.00, 100, 'Set of 10 cloth napkins'),
    ('Sash (Chair)', 'linens', 100.00, 500, 'Decorative chair sash');

-- Audio Visual
INSERT INTO assets (name, category, default_unit_price, stock_quantity, description) VALUES
    ('Projector', 'audio_visual', 5000.00, 10, 'HD projector'),
    ('Projection Screen', 'audio_visual', 3000.00, 10, '120" projection screen'),
    ('Speaker System', 'audio_visual', 8000.00, 8, 'Professional PA system'),
    ('Wireless Microphone', 'audio_visual', 2000.00, 20, 'Wireless handheld mic'),
    ('LED Screen (per sq ft)', 'audio_visual', 1000.00, 100, 'LED video wall panel');

-- ============================================
-- Test Event (for development)
-- ============================================
-- Note: The planner_id references a user created through registration
-- Run this after registering a test planner account
INSERT INTO events (id, planner_id, name, event_type, event_date, status, budget_ceiling) VALUES
    ('11111111-1111-1111-1111-111111111111',
     (SELECT id FROM users WHERE role = 'planner' LIMIT 1),
     'Sample Wedding',
     'wedding',
     CURRENT_DATE + INTERVAL '30 days',
     'draft',
     500000.00)
ON CONFLICT (id) DO NOTHING;
