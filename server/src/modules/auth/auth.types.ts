/**
 * Type definitions for authentication module.
 */

import { Role } from '../../config/constants';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  role: Role;
}

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  token: string;
  expiresIn: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface LoginResponse {
  user: UserResponse;
  token: string;
  expiresIn: string;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
