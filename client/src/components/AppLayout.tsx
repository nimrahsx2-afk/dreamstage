/**
 * App layout with navbar - used for authenticated routes.
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

function getUser(): { name: string; role: string } | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return { name: u?.name ?? 'User', role: u?.role ?? 'planner' };
  } catch {
    return null;
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const hideMainNav = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Navbar with backdrop blur — hidden on admin routes (admin uses sidebar only) */}
      {!hideMainNav && (
      <nav
        className="sticky top-0 z-40 px-4 sm:px-6 py-3"
        style={{
          background: 'rgba(250, 248, 245, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo to="/events" className="logo-sm" />
            <div className="hidden sm:flex items-center gap-1">
              <Link
                to="/"
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: location.pathname === '/' ? 'var(--lemon)' : 'transparent',
                  color: location.pathname === '/' ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                Home
              </Link>
              <Link
                to="/events"
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: location.pathname.startsWith('/events') && !location.pathname.includes('/view')
                    ? 'var(--lemon)'
                    : 'transparent',
                  color: location.pathname.startsWith('/events') && !location.pathname.includes('/view')
                    ? 'var(--text)'
                    : 'var(--text-muted)',
                }}
              >
                Events
              </Link>
              <Link
                to="/venues"
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: location.pathname.startsWith('/venues')
                    ? 'var(--lemon)'
                    : 'transparent',
                  color: location.pathname.startsWith('/venues')
                    ? 'var(--text)'
                    : 'var(--text-muted)',
                }}
              >
                Venues
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background: location.pathname.startsWith('/admin')
                      ? 'var(--sky)'
                      : 'transparent',
                    color: location.pathname.startsWith('/admin')
                      ? 'var(--text)'
                      : 'var(--text-muted)',
                  }}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2">
                <span
                  className="hidden sm:inline text-sm"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    color: 'var(--text-muted)',
                  }}
                >
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full transition-colors hover:bg-[var(--surface2)]"
                  aria-label="Log out"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      )}

      {/* Dark mode navbar override */}
      {!hideMainNav && (
      <style>{`
        [data-theme="dark"] nav {
          background: rgba(22, 18, 30, 0.85) !important;
        }
      `}</style>
      )}

      <main className="animate-fade-in">{children}</main>
    </div>
  );
}
