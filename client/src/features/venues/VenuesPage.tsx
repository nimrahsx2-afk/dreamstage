/**
 * Public Venues Page - Browse active venues (no login required)
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Building2 } from 'lucide-react';
import { getPublicVenues } from '../home/public.api';
import type { VenueTemplate } from '../booking/booking.types';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/Logo';
import './VenuesPage.css';

const VENUE_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'Banquet Hall', label: 'Banquet Hall' },
  { value: 'Outdoor', label: 'Outdoor' },
  { value: 'Conference', label: 'Conference' },
  { value: 'Intimate', label: 'Intimate' },
  { value: 'Heritage', label: 'Heritage' },
];

export function VenuesPage({ embedded }: { embedded?: boolean } = {}) {
  const [venues, setVenues] = useState<VenueTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toggle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicVenues();
        if (!cancelled) setVenues(data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load venues');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      const matchCategory = !categoryFilter || v.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || v.name.toLowerCase().includes(q) || (v.description?.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [venues, categoryFilter, searchQuery]);

  return (
    <div className="venues-page" style={{ background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif", paddingTop: embedded ? 0 : undefined }}>
      {!embedded && (
        <nav className="venues-nav">
          <Logo to="/" />
          <ul className="venues-nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/venues" className="active">Venues</Link></li>
          </ul>
          <div className="venues-nav-right">
            <button
              type="button"
              className="venues-theme-toggle"
              onClick={toggle}
              aria-label="Toggle theme"
            />
            <Link to="/login" className="venues-btn-nav">Login</Link>
          </div>
        </nav>
      )}

      <main className="venues-main">
        <header className="venues-header">
          <h1>Our Venues</h1>
          <p>Explore spaces for your next event</p>
        </header>

        {/* Search and filter */}
        <div className="venues-filters">
          <div className="venues-search">
            <Search className="venues-search-icon" size={18} />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="venues-search-input"
            />
          </div>
          <div className="venues-category-pills">
            {VENUE_CATEGORIES.map(({ value, label }) => (
              <button
                key={value || 'all'}
                type="button"
                className={`venues-pill ${categoryFilter === value ? 'active' : ''}`}
                onClick={() => setCategoryFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="venues-loading">
            <Loader2 className="venues-spinner" size={32} />
            <p>Loading venues...</p>
          </div>
        )}

        {error && (
          <div className="venues-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="venues-grid">
            {filteredVenues.length === 0 ? (
              <div className="venues-empty">
                <Building2 size={48} strokeWidth={1.5} />
                <p>No venues found</p>
              </div>
            ) : (
              filteredVenues.map((venue) => (
                <Link key={venue.id} to={`/venues/${venue.id}`} className="venue-card venue-card-link">
                  <div className="venue-card-image">
                    {venue.thumbnailUrl ? (
                      <img src={venue.thumbnailUrl} alt={venue.name} />
                    ) : (
                      <div className="venue-card-placeholder">
                        <Building2 size={40} strokeWidth={1.2} />
                      </div>
                    )}
                    <span className="venue-card-category">{venue.category}</span>
                  </div>
                  <div className="venue-card-body">
                    <h2>{venue.name}</h2>
                    <p className="venue-card-capacity">Up to {venue.capacity} guests</p>
                    {venue.description && (
                      <p className="venue-card-desc">{venue.description}</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
