/**
 * Authentication service - handles user registration, login, and token validation.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../../db/client';
import { env } from '../../config/env';
import { LIMITS, ROLES } from '../../config/constants';
import {
  RegisterInput,
  LoginInput,
  UserPayload,
  UserResponse,
  LoginResponse,
  DbUser,
} from './auth.types';

/**
 * Register a new planner account.
 * Admins cannot self-register - they must be created directly in the database.
 */
export async function registerPlanner(input: RegisterInput): Promise<LoginResponse> {
  const { name, email, password } = input;

  // Check if email already exists
  const existing = await queryOne<DbUser>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, LIMITS.BCRYPT_COST_FACTOR);

  // Insert new user
  const result = await queryOne<DbUser>(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, created_at`,
    [uuidv4(), name, email.toLowerCase(), passwordHash, ROLES.PLANNER]
  );

  if (!result) {
    throw new Error('Failed to create user');
  }

  // Generate JWT token
  const tokenData = generateToken({ id: result.id, email: result.email, role: result.role });

  return {
    user: formatUserResponse(result),
    ...tokenData,
  };
}

/**
 * Authenticate user with email and password.
 */
export async function loginUser(input: LoginInput): Promise<LoginResponse> {
  const { email, password, role } = input;

  // Find user by email
  const user = await queryOne<DbUser>(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (role === ROLES.ADMIN && user.role !== ROLES.ADMIN) {
    throw new Error(
      'This account is not an admin account. Please use the Planner login.'
    );
  }

  if (role === ROLES.PLANNER && user.role === ROLES.ADMIN) {
    throw new Error(
      'This is an admin account. Please use the Admin login tab.'
    );
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const tokenData = generateToken({ id: user.id, email: user.email, role: user.role });

  return {
    user: formatUserResponse(user),
    ...tokenData,
  };
}

/**
 * Get user by ID.
 */
export async function getUserById(userId: string): Promise<UserResponse | null> {
  const user = await queryOne<DbUser>(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND is_active = true',
    [userId]
  );

  return user ? formatUserResponse(user) : null;
}

/**
 * Verify JWT token and return user payload.
 */
export function verifyToken(token: string): UserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate JWT token for user.
 */
function generateToken(payload: UserPayload): { token: string; expiresIn: string } {
  const expiresIn = env.JWT_EXPIRY;
  const token = jwt.sign(payload, env.JWT_SECRET, { 
    expiresIn: expiresIn as string 
  } as jwt.SignOptions);

  return { token, expiresIn };
}

/**
 * Format database user to response object.
 */
function formatUserResponse(user: DbUser): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at?.toISOString() ?? new Date().toISOString(),
  };
}
