/**
 * Admin placeholder - Venues, Assets, Planners management.
 * Phase 9: Placeholder for admin module; full UI can be built in a later phase.
 */

import { Link } from 'react-router-dom';
import { Building2, Package, Users } from 'lucide-react';

export function AdminPlaceholderPage() {
  const sections = [
    { path: '/admin/venues', icon: Building2, label: 'Venue Templates', color: 'var(--sky)' },
    { path: '/admin/assets', icon: Package, label: 'Asset Inventory', color: 'var(--peach)' },
    { path: '/admin/planners', icon: Users, label: 'Planner Accounts', color: 'var(--lavender)' },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1
        style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 8,
        }}
      >
        Admin
      </h1>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text-muted)',
          marginBottom: 32,
        }}
      >
        Manage venue templates, asset inventory, and planner accounts.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map(({ path, icon: Icon, label, color }) => (
          <Link
            key={path}
            to={path}
            className="flex items-center gap-4 p-6 transition-all hover:-translate-y-1"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow)',
              textDecoration: 'none',
              color: 'var(--text)',
            }}
          >
            <div
              className="p-3 rounded-xl"
              style={{ background: color, opacity: 0.9 }}
            >
              <Icon className="w-6 h-6" style={{ color: 'var(--text)' }} />
            </div>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
