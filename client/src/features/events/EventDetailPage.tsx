// Event Detail Page - Shows event with tabs for editor, budget, etc.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import * as eventsApi from './events.api';
import * as bookingApi from '../booking/booking.api';
import type { Event } from './events.types';
import type { VenueBookingWithDetails } from '../booking/booking.types';
import { formatPKR } from '@/utils/currency';
import { useEditorStore } from '../editor/store/editorStore';
import '../editor/EditorShell.css';

type Tab = 'editor' | 'budget' | 'comments' | 'checklist' | 'settings';

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [booking, setBooking] = useState<VenueBookingWithDetails | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  void booking;
  void bookingLoading;
  const location = useLocation();
  const pathTab = location.pathname.split('/').pop() || '';
  const activeTab: Tab =
    pathTab === 'budget' ? 'budget' :
    pathTab === 'comments' ? 'comments' :
    pathTab === 'checklist' ? 'checklist' :
    pathTab === 'settings' ? 'settings' : 'editor';

  const isDirty = useEditorStore((s) => s.isDirty);

  // Old /events/:id/requirements links: send to event root (Requirements tab removed from UI).
  useEffect(() => {
    if (eventId && pathTab === 'requirements') {
      navigate(`/events/${eventId}`, { replace: true });
    }
  }, [eventId, pathTab, navigate]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
      reloadBooking();
    }
  }, [eventId, activeTab]);

  useEffect(() => {
    const id = eventId;
    if (!id) return;
    setBookingLoading(true);
    bookingApi
      .getEventBooking(id)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setBookingLoading(false));
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    try {
      const data = await eventsApi.getEvent(eventId);
      setEvent(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  const reloadBooking = () => {
    if (!eventId) return;
    setBookingLoading(true);
    bookingApi
      .getEventBooking(eventId)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setBookingLoading(false));
  };

  const reload = async () => {
    await loadEvent();
    reloadBooking();
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: 'var(--accent)' }}
          />
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
            }}
          >
            Loading event...
          </p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="flex flex-col items-center gap-4 p-8"
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: '#dc2626',
            }}
          >
            {error || 'Event not found'}
          </p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-3 transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
            }}
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'editor' as Tab, label: '3D Editor', icon: '🏛️', path: '' },
    { id: 'budget' as Tab, label: 'Budget', icon: '💰', path: 'budget' },
    { id: 'comments' as Tab, label: 'Comments', icon: '💬', path: 'comments' },
    { id: 'checklist' as Tab, label: 'Checklist', icon: '✅', path: 'checklist' },
    { id: 'settings' as Tab, label: 'Settings', icon: '⚙️', path: 'settings' },
  ];

  return (
    <div
      className={activeTab === 'editor' ? 'editor-app' : 'editor-app-other'}
      style={{ background: 'var(--bg)' }}
    >
      {/* Tab bar with event header */}
      <div className="editor-tab-bar">
        <div className="editor-tab-bar-left">
          <button
            type="button"
            className="editor-back-btn"
            onClick={() => navigate('/events')}
            aria-label="Back to events"
          >
            ←
          </button>
          <div className="editor-tab-bar-event">
            <span className="editor-event-name-tab">{event.name}</span>
            <span className="editor-event-meta-tab">
              {event.eventType} ·{' '}
              {new Date(event.eventDate).toLocaleDateString('en-PK', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {event.budgetCeiling && ` · ${formatPKR(event.budgetCeiling)}`}
            </span>
          </div>
        </div>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={`/events/${eventId}/${tab.path}`}
            className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="editor-tab-icon">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
        <div className="editor-tab-bar-right">
          {activeTab === 'editor' && !isDirty && (
            <div className="editor-saved-pill">✓ Saved</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="editor-outlet-wrap" style={{ minHeight: 0 }}>
        <Outlet context={{ event, reload }} />
      </div>
    </div>
  );
}
