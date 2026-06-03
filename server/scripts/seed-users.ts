/**
 * Seed script to create test users with proper bcrypt hashes.
 * Run with: npx ts-node scripts/seed-users.ts
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory (parent of scripts folder)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BCRYPT_COST = 12;

interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'planner';
}

const testUsers: TestUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Admin User',
    email: 'admin@dreamstage.com',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Sarah Planner',
    email: 'planner@dreamstage.com',
    password: 'Password123!',
    role: 'planner',
  },
];

async function seedUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    for (const user of testUsers) {
      console.log(`Processing user: ${user.email}`);
      
      // Generate bcrypt hash
      const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
      
      // Upsert user (insert or update if exists)
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`,
        [user.id, user.name, user.email, passwordHash, user.role]
      );
      
      console.log(`  ✓ Created/updated: ${user.email} (${user.role})`);
    }

    // Create test event for the planner
    console.log('\nCreating test event...');
    await pool.query(
      `INSERT INTO events (id, planner_id, name, event_type, event_date, status, budget_ceiling)
       VALUES ($1, $2, $3, $4, CURRENT_DATE + INTERVAL '30 days', 'draft', 500000.00)
       ON CONFLICT (id) DO NOTHING`,
      [
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000002', // planner's ID
        'Sample Wedding',
        'wedding',
      ]
    );
    console.log('  ✓ Test event created');

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================');
    console.log('\nTest Credentials:');
    console.log('  Admin:   admin@dreamstage.com / Admin123!');
    console.log('  Planner: planner@dreamstage.com / Password123!');
    console.log('\nTest Event ID: 11111111-1111-1111-1111-111111111111');
    
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedUsers();
