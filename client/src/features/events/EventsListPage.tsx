// Events List Page - Pixel-perfect recreation of dreamstage-events.html

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ChevronRight, Trash2 } from 'lucide-react';
import * as eventsApi from './events.api';
import type { Event } from './events.types';
import { formatPKR } from '@/utils/currency';
import './EventsListPage.css';
import { InquiriesPlannerPanel } from '../inquiries/InquiriesPlannerPanel';

// Map event types to design categories for filter/display
const TYPE_TO_CATEGORY: Record<string, string> = {
  wedding: 'wedding',
  corporate: 'corporate',
  birthday: 'birthday',
  engagement: 'wedding',
  mehndi: 'wedding',
  walima: 'wedding',
  conference: 'corporate',
  exhibition: 'corporate',
  other: 'other',
};

const FILTER_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'birthday', label: 'Birthday' },
] as const;

const SORT_OPTIONS = [
  { value: 'date-asc', label: 'Sort: Date (soonest)' },
  { value: 'date-desc', label: 'Sort: Date (latest)' },
  { value: 'budget-desc', label: 'Sort: Budget (high)' },
  { value: 'name', label: 'Sort: Name A–Z' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function getUserName(): string {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'Planner';
    const u = JSON.parse(raw);
    return u?.name ?? 'Planner';
  } catch {
    return 'Planner';
  }
}

export function EventsListPage() {
  const navigate = useNavigate();
  const userName = getUserName();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState<SortValue>('date-asc');
  const [mainDashboardTab, setMainDashboardTab] = useState<'events' | 'inquiries'>('events');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await eventsApi.getEvents();
      setEvents(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load events'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (e: React.MouseEvent, event: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`))
      return;
    try {
      await eventsApi.deleteEvent(event.id);
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  // Filter, search, sort
  const filteredAndSortedEvents = useMemo(() => {
    let list = [...events];

    // Search by name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }

    // Filter by type
    if (filterType) {
      list = list.filter((e) => {
        const cat = TYPE_TO_CATEGORY[e.eventType] ?? 'other';
        return cat === filterType;
      });
    }

    // Sort
    switch (sortBy) {
      case 'date-asc':
        list.sort(
          (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        );
        break;
      case 'date-desc':
        list.sort(
          (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        );
        break;
      case 'budget-desc':
        list.sort(
          (a, b) => (b.budgetCeiling ?? 0) - (a.budgetCeiling ?? 0)
        );
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [events, searchQuery, filterType, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const activeCount = events.length;
    const upcoming = events
      .filter((e) => new Date(e.eventDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    const nextDays = upcoming[0]
      ? Math.ceil(
          (new Date(upcoming[0].eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null;
    const totalBudget = events.reduce((sum, e) => sum + (e.budgetCeiling ?? 0), 0);
    const pendingApprovals = events.filter((e) => e.status === 'draft').length;

    return {
      activeCount,
      nextDays,
      totalBudget,
      pendingApprovals,
    };
  }, [events]);

  const getAccentClass = (eventType: string) => {
    const cat = TYPE_TO_CATEGORY[eventType] ?? 'default';
    return `ev-acc-${cat}`;
  };

  const getDateBoxBg = (eventType: string) => {
    const cat = TYPE_TO_CATEGORY[eventType] ?? 'default';
    switch (cat) {
      case 'wedding':
        return 'var(--rose)';
      case 'corporate':
        return 'var(--sky)';
      case 'birthday':
        return 'var(--peach)';
      default:
        return 'var(--lavender)';
    }
  };

  const getStatusPillClass = (status: Event['status']) => {
    switch (status) {
      case 'draft':
        return 'ev-sp-draft';
      case 'approved':
        return 'ev-sp-approved';
      case 'locked':
        return 'ev-sp-locked';
      default:
        return 'ev-sp-draft';
    }
  };

  const getTypeBadgeClass = (eventType: string) => {
    const cat = TYPE_TO_CATEGORY[eventType] ?? 'default';
    return `ev-tb-${cat}`;
  };

  const getDaysPillClass = (days: number) => {
    if (days <= 7) return 'ev-dp-urgent';
    if (days <= 30) return 'ev-dp-soon';
    return 'ev-dp-ok';
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[50vh]"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>
            Loading events...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-events-wrapper" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="ev-bg-orbs" aria-hidden>
        <div className="ev-orb ev-orb-1" />
        <div className="ev-orb ev-orb-2" />
        <div className="ev-orb ev-orb-3" />
      </div>

      <div className="ev-page">
        {/* Page header */}
        <div className="ev-page-header">
          <div>
            <div className="ev-page-eyebrow">Planner · {userName}</div>
            <h1 className="ev-page-title">My <em>Events</em></h1>
            <p className="ev-page-sub">
              {stats.activeCount} active event{stats.activeCount !== 1 ? 's' : ''}
              {stats.nextDays != null
                ? ` · next one in ${stats.nextDays} day${stats.nextDays !== 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            <span>💡</span>
            <span>
              Events are created from client
              <button
                type="button"
                onClick={() => setMainDashboardTab('inquiries')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '13px',
                }}
              >
                Inquiries →
              </button>
            </span>
          </div>
        </div>

        {/* Stat strip */}
        <div className="ev-stat-strip">
          <div className="ev-stat-tile">
            <div className="ev-stat-tile-icon" style={{ background: 'var(--lavender)' }}>
              🗂️
            </div>
            <div>
              <div className="ev-stat-tile-val">{stats.activeCount}</div>
              <div className="ev-stat-tile-label">Active Events</div>
            </div>
          </div>
          <div className="ev-stat-tile">
            <div className="ev-stat-tile-icon" style={{ background: 'var(--rose)' }}>
              📅
            </div>
            <div>
              <div className="ev-stat-tile-val">{stats.nextDays != null ? `${stats.nextDays}d` : '—'}</div>
              <div className="ev-stat-tile-label">Next Event</div>
            </div>
          </div>
          <div className="ev-stat-tile">
            <div className="ev-stat-tile-icon" style={{ background: 'var(--mint)' }}>
              💰
            </div>
            <div>
              <div className="ev-stat-tile-val">
                {stats.totalBudget >= 100000
                  ? `Rs. ${(stats.totalBudget / 1000).toFixed(0)}K`
                  : formatPKR(stats.totalBudget)}
              </div>
              <div className="ev-stat-tile-label">Total Budget</div>
            </div>
          </div>
          <div className="ev-stat-tile">
            <div className="ev-stat-tile-icon" style={{ background: 'var(--peach)' }}>
              ✅
            </div>
            <div>
              <div className="ev-stat-tile-val">{stats.pendingApprovals}</div>
              <div className="ev-stat-tile-label">Pending Approvals</div>
            </div>
          </div>
        </div>

        <div className="ev-filter-tabs" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`ev-filter-tab ${mainDashboardTab === 'events' ? 'ev-active' : ''}`}
            onClick={() => setMainDashboardTab('events')}
          >
            Events
          </button>
          <button
            type="button"
            className={`ev-filter-tab ${mainDashboardTab === 'inquiries' ? 'ev-active' : ''}`}
            onClick={() => setMainDashboardTab('inquiries')}
          >
            Inquiries
          </button>
        </div>

        {mainDashboardTab === 'inquiries' ? (
          <InquiriesPlannerPanel />
        ) : (
          <>
        {/* Filters */}
        <div className="ev-filter-row">
          <div className="ev-filter-tabs">
            <input
              type="text"
              className="ev-search-input"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginRight: '0.5rem' }}
            />
            {FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value || 'all'}
                type="button"
                className={`ev-filter-tab ${filterType === value ? 'ev-active' : ''}`}
                onClick={() => setFilterType(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className="ev-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortValue)}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="ev-error">{error}</div>}

        {/* Events list or empty state */}
        {events.length === 0 ? (
          <div className="ev-empty-state">
            <div className="ev-empty-orb" aria-hidden />
            <h3 className="ev-empty-title">No events yet</h3>
            <p className="ev-empty-sub">Create an event from a submitted inquiry to get started</p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                justifyContent: 'center',
                marginTop: '10px',
              }}
            >
              <span>💡</span>
              <span>
                Events are created from client
                <button
                  type="button"
                  onClick={() => setMainDashboardTab('inquiries')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 4px',
                    fontSize: '13px',
                  }}
                >
                  Inquiries →
                </button>
              </span>
            </div>
          </div>
        ) : filteredAndSortedEvents.length === 0 ? (
          <div className="ev-empty-state">
            <h3 className="ev-empty-title">No events match your filters</h3>
            <p className="ev-empty-sub">Try adjusting search or filter</p>
          </div>
        ) : (
          <div className="ev-events-list">
            {filteredAndSortedEvents.map((event) => {
              const eventDate = new Date(event.eventDate);
              const daysUntil = Math.ceil(
                (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const budgetPercent = event.budgetCeiling ? 0 : 0; // No spent data in list view
              const budgetText = event.budgetCeiling
                ? `Rs. 0 spent · not started`
                : 'No budget set';

              return (
                <div
                  key={event.id}
                  className="ev-event-card"
                  onClick={() => navigate(`/events/${event.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/events/${event.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`ev-event-card-accent ${getAccentClass(event.eventType)}`} />
                  <div className="ev-event-card-inner">
                    <div
                      className="ev-event-date-box"
                      style={{ background: getDateBoxBg(event.eventType) }}
                    >
                      <div className="ev-date-month">
                        {eventDate.toLocaleDateString('en-PK', { month: 'short' })}
                      </div>
                      <div className="ev-date-day">{eventDate.getDate()}</div>
                    </div>
                    <div className="ev-event-info">
                      <div className="ev-event-name-row">
                        <div className="ev-event-name">{event.name}</div>
                        <span className={`ev-event-status-pill ${getStatusPillClass(event.status)}`}>
                          {event.status === 'draft' && '⏸ Draft'}
                          {event.status === 'approved' && '✓ Approved'}
                          {event.status === 'locked' && '🔒 Locked'}
                        </span>
                      </div>
                      <div className="ev-event-meta">
                        <span>📅 {eventDate.toLocaleDateString('en-PK')}</span>
                        <span className="ev-meta-sep">·</span>
                        <span className={`ev-event-type-badge ${getTypeBadgeClass(event.eventType)}`}>
                          {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                        </span>
                        <span className="ev-meta-sep">·</span>
                        <span>
                          {event.budgetCeiling
                            ? `Budget: ${formatPKR(event.budgetCeiling)}`
                            : 'No budget set'}
                        </span>
                      </div>
                      <div className="ev-event-budget-row">
                        <div className="ev-budget-track">
                          <div
                            className="ev-budget-fill"
                            style={{ width: `${budgetPercent}%` }}
                          />
                        </div>
                        <span className="ev-budget-text">{budgetText}</span>
                      </div>
                    </div>
                    <div
                      className="ev-event-card-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {daysUntil > 0 && (
                        <span className={`ev-days-pill ${getDaysPillClass(daysUntil)}`}>
                          ⏰ {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ev-icon-btn"
                        onClick={(e) => handleDeleteEvent(e, event)}
                        aria-label={`Delete ${event.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/events/${event.id}`}
                        className="ev-chevron-btn"
                        aria-label={`Open ${event.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

    </div>
  );
}
