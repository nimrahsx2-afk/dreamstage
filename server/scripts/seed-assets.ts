/**
 * Seed script to create sample assets in the inventory.
 * Run with: npx ts-node scripts/seed-assets.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory (parent of scripts folder)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface AssetSeed {
  name: string;
  category: string;
  default_unit_price: number;
  stock_quantity: number;
  description: string;
}

const sampleAssets: AssetSeed[] = [
  // Seating
  {
    name: 'Chiavari Chair (Gold)',
    category: 'seating',
    default_unit_price: 2500,
    stock_quantity: 200,
    description: 'Elegant gold chiavari chair, perfect for weddings and formal events',
  },
  {
    name: 'Chiavari Chair (Silver)',
    category: 'seating',
    default_unit_price: 2500,
    stock_quantity: 150,
    description: 'Classic silver chiavari chair for sophisticated events',
  },
  {
    name: 'Banquet Chair',
    category: 'seating',
    default_unit_price: 1500,
    stock_quantity: 300,
    description: 'Comfortable padded banquet chair with fabric cover',
  },
  {
    name: 'Lounge Sofa (3-seater)',
    category: 'seating',
    default_unit_price: 15000,
    stock_quantity: 20,
    description: 'Luxurious 3-seater lounge sofa for VIP areas',
  },
  {
    name: 'Lounge Chair',
    category: 'seating',
    default_unit_price: 8000,
    stock_quantity: 40,
    description: 'Single lounge chair matching the sofa collection',
  },
  {
    name: 'Ottoman',
    category: 'seating',
    default_unit_price: 4000,
    stock_quantity: 30,
    description: 'Matching ottoman for lounge areas',
  },

  // Tables
  {
    name: 'Round Table (8-seat)',
    category: 'tables',
    default_unit_price: 8000,
    stock_quantity: 50,
    description: '72-inch round table seating 8 guests comfortably',
  },
  {
    name: 'Round Table (10-seat)',
    category: 'tables',
    default_unit_price: 10000,
    stock_quantity: 30,
    description: '84-inch round table seating 10 guests',
  },
  {
    name: 'Rectangular Table (6-seat)',
    category: 'tables',
    default_unit_price: 6000,
    stock_quantity: 40,
    description: '6-foot rectangular banquet table',
  },
  {
    name: 'Rectangular Table (8-seat)',
    category: 'tables',
    default_unit_price: 7500,
    stock_quantity: 35,
    description: '8-foot rectangular banquet table',
  },
  {
    name: 'Cocktail Table (High)',
    category: 'tables',
    default_unit_price: 3500,
    stock_quantity: 60,
    description: 'High cocktail/poseur table for standing reception',
  },
  {
    name: 'Cocktail Table (Low)',
    category: 'tables',
    default_unit_price: 3000,
    stock_quantity: 40,
    description: 'Low cocktail table for lounge areas',
  },

  // Lighting
  {
    name: 'Crystal Chandelier (Large)',
    category: 'lighting',
    default_unit_price: 45000,
    stock_quantity: 10,
    description: 'Stunning large crystal chandelier, 4-foot diameter',
  },
  {
    name: 'Crystal Chandelier (Medium)',
    category: 'lighting',
    default_unit_price: 30000,
    stock_quantity: 15,
    description: 'Medium crystal chandelier, 3-foot diameter',
  },
  {
    name: 'Pendant Light Cluster',
    category: 'lighting',
    default_unit_price: 12000,
    stock_quantity: 30,
    description: 'Modern pendant light cluster with 5 globes',
  },
  {
    name: 'Fairy Light Curtain',
    category: 'lighting',
    default_unit_price: 5000,
    stock_quantity: 50,
    description: 'LED fairy light curtain, 10x10 feet',
  },
  {
    name: 'Uplighter (LED)',
    category: 'lighting',
    default_unit_price: 3000,
    stock_quantity: 80,
    description: 'RGB LED uplighter for ambient wall lighting',
  },

  // Decor
  {
    name: 'Floral Centerpiece (Premium)',
    category: 'decor',
    default_unit_price: 8000,
    stock_quantity: 60,
    description: 'Premium floral centerpiece with roses and orchids',
  },
  {
    name: 'Floral Centerpiece (Standard)',
    category: 'decor',
    default_unit_price: 5000,
    stock_quantity: 100,
    description: 'Standard mixed flower centerpiece',
  },
  {
    name: 'Glass Vase Arrangement',
    category: 'decor',
    default_unit_price: 3500,
    stock_quantity: 80,
    description: 'Tall glass vase with floral arrangement',
  },
  {
    name: 'Candelabra (5-arm)',
    category: 'decor',
    default_unit_price: 6000,
    stock_quantity: 40,
    description: 'Elegant 5-arm candelabra with LED candles',
  },
  {
    name: 'Table Runner (Sequin)',
    category: 'decor',
    default_unit_price: 2000,
    stock_quantity: 150,
    description: 'Sparkly sequin table runner, various colors',
  },

  // Staging
  {
    name: 'Stage Platform (4x8)',
    category: 'staging',
    default_unit_price: 35000,
    stock_quantity: 8,
    description: '4x8 foot modular stage platform section',
  },
  {
    name: 'Stage Riser (2x4)',
    category: 'staging',
    default_unit_price: 12000,
    stock_quantity: 20,
    description: '2x4 foot stage riser for multi-level staging',
  },
  {
    name: 'Dance Floor Panel',
    category: 'staging',
    default_unit_price: 8000,
    stock_quantity: 50,
    description: 'LED dance floor panel, 4x4 feet',
  },
  {
    name: 'Stage Skirting (per meter)',
    category: 'staging',
    default_unit_price: 1500,
    stock_quantity: 100,
    description: 'Fabric stage skirting per meter',
  },

  // Backdrops
  {
    name: 'Photo Backdrop (Floral)',
    category: 'backdrops',
    default_unit_price: 25000,
    stock_quantity: 12,
    description: 'Beautiful floral photo backdrop wall, 10x8 feet',
  },
  {
    name: 'Photo Backdrop (Sequin)',
    category: 'backdrops',
    default_unit_price: 18000,
    stock_quantity: 15,
    description: 'Sparkly sequin backdrop, 10x8 feet',
  },
  {
    name: 'Floral Arch',
    category: 'backdrops',
    default_unit_price: 40000,
    stock_quantity: 5,
    description: 'Grand floral arch for ceremonies, 8-foot tall',
  },
  {
    name: 'Pipe and Drape (White)',
    category: 'backdrops',
    default_unit_price: 15000,
    stock_quantity: 20,
    description: 'White pipe and drape backdrop section, 10x10 feet',
  },
  {
    name: 'Neon Sign (Custom)',
    category: 'backdrops',
    default_unit_price: 20000,
    stock_quantity: 10,
    description: 'LED neon sign - custom text available',
  },
];

async function seedAssets() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    // Check if assets already exist
    const existingCount = await pool.query('SELECT COUNT(*) FROM assets');
    const count = parseInt(existingCount.rows[0].count);
    
    if (count > 0) {
      console.log(`Found ${count} existing assets. Clearing and re-seeding...`);
      await pool.query('DELETE FROM stock_reservations');
      await pool.query('DELETE FROM budget_items');
      await pool.query('DELETE FROM assets');
    }

    console.log(`\nSeeding ${sampleAssets.length} assets...`);

    for (const asset of sampleAssets) {
      await pool.query(
        `INSERT INTO assets (name, category, default_unit_price, stock_quantity, description, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [
          asset.name,
          asset.category,
          asset.default_unit_price,
          asset.stock_quantity,
          asset.description,
        ]
      );
      console.log(`  ✓ ${asset.category}: ${asset.name}`);
    }

    console.log('\n========================================');
    console.log('Asset seed completed successfully!');
    console.log('========================================');
    console.log(`\nTotal assets: ${sampleAssets.length}`);
    console.log('\nCategories:');
    
    const categories = ['seating', 'tables', 'lighting', 'decor', 'staging', 'backdrops'];
    for (const cat of categories) {
      const catCount = sampleAssets.filter(a => a.category === cat).length;
      console.log(`  - ${cat}: ${catCount} items`);
    }
    
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAssets();
