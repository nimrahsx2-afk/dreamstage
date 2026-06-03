/**
 * API client for communicating with the backend.
 */

import axios from 'axios';

/**
 * Dev default: `/api` → Vite proxy → http://localhost:3000/api/...
 * If VITE_API_URL is `http://localhost:3000` (origin only), append `/api` so
 * paths like `/admin/venues` resolve to `/api/admin/venues`, not `/admin/...` on :3000.
 */
function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!raw) return '/api';
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return raw.replace(/\/$/, '') || '/api';
  }
  try {
    const u = new URL(raw);
    const p = u.pathname.replace(/\/$/, '') || '';
    if (p === '' || p === '/') {
      u.pathname = '/api';
      return u.href.replace(/\/$/, '');
    }
    return raw.replace(/\/$/, '');
  } catch {
    return raw.replace(/\/$/, '');
  }
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
// IMPORTANT: Never clear token when on / (homepage) - navigating to home must NOT log user out.
// Token is only cleared on explicit Logout (AppLayout handleLogout).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isPublicPath =
        currentPath === '/' ||
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/register') ||
        currentPath.startsWith('/view/') ||
        currentPath.startsWith('/requirements/') ||
        currentPath.startsWith('/inquiry/');
      // Only clear token and redirect when on a protected route - never on public pages
      if (!isPublicPath) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; role: 'planner' | 'admin' }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Health check
export const healthCheck = () => api.get('/health');
