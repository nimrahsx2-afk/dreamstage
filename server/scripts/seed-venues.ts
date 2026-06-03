/**
 * Seed script to create sample venue templates.
 * Run with: npx ts-node scripts/seed-venues.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface VenueSeed {
  name: string;
  category: string;
  capacity: number;
  description: string;
}

const sampleVenues: VenueSeed[] = [
  // Banquet Halls
  {
    name: 'Grand Ballroom',
    category: 'Banquet Hall',
    capacity: 500,
    description: 'Luxurious ballroom with crystal chandeliers, marble floors, and elegant drapery. Perfect for large weddings and corporate galas.',
  },
  {
    name: 'Pearl Hall',
    category: 'Banquet Hall',
    capacity: 300,
    description: 'Sophisticated hall featuring modern design with classic touches. Ideal for medium-sized celebrations.',
  },
  {
    name: 'Ruby Room',
    category: 'Banquet Hall',
    capacity: 150,
    description: 'Intimate banquet space with warm lighting and rich décor. Perfect for smaller gatherings and corporate dinners.',
  },

  // Outdoor Venues
  {
    name: 'Garden Terrace',
    category: 'Outdoor',
    capacity: 200,
    description: 'Beautiful open-air garden venue with manicured lawns, fountain centerpiece, and twinkling fairy lights.',
  },
  {
    name: 'Lakeside Pavilion',
    category: 'Outdoor',
    capacity: 250,
    description: 'Stunning waterfront venue with covered pavilion, dock access, and panoramic lake views.',
  },
  {
    name: 'Rooftop Sky Lounge',
    category: 'Outdoor',
    capacity: 120,
    description: 'Modern rooftop venue with city skyline views, retractable awning, and ambient lighting.',
  },

  // Conference Venues
  {
    name: 'Executive Conference Center',
    category: 'Conference',
    capacity: 100,
    description: 'State-of-the-art conference facility with AV equipment, breakout rooms, and catering support.',
  },
  {
    name: 'Innovation Hub',
    category: 'Conference',
    capacity: 80,
    description: 'Modern tech-enabled space with flexible seating, video conferencing, and collaborative zones.',
  },

  // Intimate Venues
  {
    name: 'Jasmine Suite',
    category: 'Intimate',
    capacity: 50,
    description: 'Elegant private suite with fireplace, lounge seating, and personalized service. Perfect for engagement parties.',
  },
  {
    name: 'The Conservatory',
    category: 'Intimate',
    capacity: 40,
    description: 'Glass-enclosed garden room filled with natural light and greenery. Ideal for brunches and small receptions.',
  },

  // Heritage Venues
  {
    name: 'Mughal Palace',
    category: 'Heritage',
    capacity: 400,
    description: 'Historic venue featuring traditional Mughal architecture, intricate tile work, and courtyard gardens.',
  },
  {
    name: 'Colonial Mansion',
    category: 'Heritage',
    capacity: 180,
    description: 'Restored colonial-era mansion with period furniture, wraparound verandas, and antique chandeliers.',
  },
];

async function seedVenues() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');

    // Check if venues already exist
    const existingCount = await pool.query('SELECT COUNT(*) FROM venue_templates');
    const count = parseInt(existingCount.rows[0].count);

    if (count > 0) {
      console.log(`Found ${count} existing venues. Clearing and re-seeding...`);
      await pool.query('DELETE FROM venue_bookings');
      await pool.query('DELETE FROM venue_templates');
    }

    console.log(`\nSeeding ${sampleVenues.length} venues...`);

    for (const venue of sampleVenues) {
      await pool.query(
        `INSERT INTO venue_templates (name, category, capacity, description, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [venue.name, venue.category, venue.capacity, venue.description]
      );
      console.log(`  ✓ ${venue.category}: ${venue.name} (${venue.capacity} guests)`);
    }

    console.log('\n========================================');
    console.log('Venue seed completed successfully!');
    console.log('========================================');
    console.log(`\nTotal venues: ${sampleVenues.length}`);
    console.log('\nCategories:');

    const categories = [...new Set(sampleVenues.map((v) => v.category))];
    for (const cat of categories) {
      const catVenues = sampleVenues.filter((v) => v.category === cat);
      const totalCapacity = catVenues.reduce((sum, v) => sum + v.capacity, 0);
      console.log(`  - ${cat}: ${catVenues.length} venues (total capacity: ${totalCapacity})`);
    }
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedVenues();
