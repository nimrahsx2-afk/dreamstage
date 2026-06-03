/**
 * Environment configuration with validation.
 * All environment variables should be accessed through this module.
 */

import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),
  
  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),
  
  // JWT
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRY: optionalEnv('JWT_EXPIRY', '24h'),
  
  // CORS
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),
  
  // Firebase (optional in development)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
};
