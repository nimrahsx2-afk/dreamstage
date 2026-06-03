import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, Box } from 'lucide-react';
import { OverviewTab } from '../components/Admin/OverviewTab';
import { PlannersTab } from '../components/Admin/PlannersTab';
import { VenuesTab } from '../components/Admin/VenuesTab';
import { AssetsTab } from '../components/Admin/AssetsTab';
import { AddVenueForm } from '../components/Admin/AddVenueForm';
import './admin-dashboard.css';

const THEME_KEY = 'dreamstage-admin-theme';

type AdminTab = 'overview' | 'planners' | 'venues' | 'assets' | 'add' | 'settings';

function getUser(): { name: string; role: string } | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { name?: string; role?: string };
    return { name: u?.name ?? 'Admin', role: u?.role ?? 'admin' };
  } catch {
    return null;
  }
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'A';
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [venueRefresh, setVenueRefresh] = useState(0);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const user = useMemo(() => getUser(), []);
  const title = useMemo(() => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'planners':
        return 'Planners';
      case 'venues':
        return 'Venues';
      case 'assets':
        return 'Assets';
      case 'add':
        return 'Add New Venue';
      case 'settings':
        return 'Settings';
      default:
        return 'Admin';
    }
  }, [tab]);

  const onVenueSaved = useCallback(() => {
    setVenueRefresh((k) => k + 1);
    setTab('venues');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  return (
    <div className="admin-dashboard-root" data-theme={theme}>
      <div className="admin-dash-layout">
        <aside className="admin-dash-sidebar">
          <div className="admin-dash-logo">
            <span className="dream">✦ Dream</span>
            <span className="stage">Stage</span>
          </div>
          <nav className="admin-dash-nav" aria-label="Admin sections">
            <button
              type="button"
              className={tab === 'overview' ? 'active' : ''}
              onClick={() => {
                setTab('overview');
                setOverviewRefreshKey((k) => k + 1);
              }}
            >
              Overview
            </button>
            <button
              type="button"
              className={tab === 'planners' ? 'active' : ''}
              onClick={() => setTab('planners')}
            >
              Planners
            </button>
            <button
              type="button"
              className={tab === 'venues' ? 'active' : ''}
              onClick={() => setTab('venues')}
            >
              Venues
            </button>
            <button
              type="button"
              className={tab === 'assets' ? 'active' : ''}
              onClick={() => setTab('assets')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Box size={18} aria-hidden />
              Assets
            </button>
            <button
              type="button"
              className={tab === 'add' ? 'active' : ''}
              onClick={() => setTab('add')}
            >
              Add venue
            </button>
            <button
              type="button"
              className={tab === 'settings' ? 'active' : ''}
              onClick={() => setTab('settings')}
            >
              Settings
            </button>
          </nav>
          <div className="admin-dash-sidebar-footer">
            <div className="admin-dash-avatar">{user ? initials(user.name) : 'A'}</div>
            <div className="admin-dash-sidebar-footer-text">
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {user?.name ?? 'Admin'}
              </div>
              <div className="admin-form-hint" style={{ margin: 0 }}>
                {user?.role === 'admin' ? 'Administrator' : user?.role ?? 'User'}
              </div>
            </div>
            <button
              type="button"
              className="admin-dash-logout"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <div className="admin-dash-main">
          <header className="admin-dash-topbar">
            <h1>{title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="admin-dash-icon-btn"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>
          <div className="admin-dash-content">
            {tab === 'overview' && <OverviewTab refreshKey={overviewRefreshKey} />}
            {tab === 'planners' && <PlannersTab />}
            {tab === 'venues' && (
              <VenuesTab onAddVenue={() => setTab('add')} refreshKey={venueRefresh} />
            )}
            {tab === 'assets' && <AssetsTab />}
            {tab === 'add' && (
              <AddVenueForm onSaved={onVenueSaved} onCancel={() => setTab('venues')} />
            )}
            {tab === 'settings' && (
              <div className="admin-card" style={{ maxWidth: 480 }}>
                <h2>Settings</h2>
                <p className="admin-form-hint">
                  Theme preference is saved in this browser ({THEME_KEY}).
                </p>
                <p style={{ marginTop: '1rem' }} className="admin-form-hint">
                  Use the Assets item in the sidebar for 3D asset uploads and inventory.
                </p>
                <p style={{ marginTop: '0.75rem' }}>
                  <Link to="/admin/venues" className="admin-link-muted">
                    Legacy venue templates table
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
