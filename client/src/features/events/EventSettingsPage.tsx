// Event Settings Page - Venue booking, share link, password, budget visibility

import { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Copy, Link2, Eye, EyeOff, Unlock, Building2, Trash2 } from 'lucide-react';
import * as eventsApi from './events.api';
import * as bookingApi from '../booking/booking.api';
import type { Event } from './events.types';
import type { VenueTemplate, VenueBookingWithDetails } from '../booking/booking.types';

interface OutletContext {
  event: Event;
  reload: () => Promise<void>;
}

export function EventSettingsPage() {
  const { event, reload } = useOutletContext<OutletContext>();
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [sharePassword, setSharePassword] = useState('');
  const [showBudgetDetails, setShowBudgetDetails] = useState(event.showBudgetDetails);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Venue booking
  const [venues, setVenues] = useState<VenueTemplate[]>([]);
  const [booking, setBooking] = useState<VenueBookingWithDetails | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [bookingDate, setBookingDate] = useState(event.eventDate);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const canUnlock = (event.status === 'approved' || event.status === 'locked') && eventId;

  useEffect(() => {
    const id = eventId;
    if (!id) return;
    let mounted = true;
    async function load() {
      setIsLoadingVenues(true);
      try {
        const [venueList, eventBooking] = await Promise.all([
          bookingApi.getVenueTemplates(true),
          bookingApi.getEventBooking(id!).catch(() => null),
        ]);
        if (mounted) {
          setVenues(venueList);
          setBooking(eventBooking ?? null);
          setSelectedVenueId(venueList[0]?.id ?? '');
          setBookingDate(event.eventDate);
        }
      } catch {
        if (mounted) setVenues([]);
      } finally {
        if (mounted) setIsLoadingVenues(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [eventId, event.eventDate]);

  const handleBookVenue = async () => {
    if (!eventId || !selectedVenueId) return;
    setBookingError(null);
    setIsBooking(true);
    try {
      const availability = await bookingApi.checkVenueAvailability(selectedVenueId, bookingDate);
      if (!availability.available) {
        setBookingError(availability.bookedBy ? 'Venue is already booked on this date.' : 'Venue is not available.');
        return;
      }
      const b = await bookingApi.bookVenue(eventId, {
        venueTemplateId: selectedVenueId,
        bookingDate,
      });
      setBooking(b);
      await reload();
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Failed to book venue.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!eventId || !window.confirm('Cancel this venue booking?')) return;
    setBookingError(null);
    setIsBooking(true);
    try {
      await bookingApi.cancelBooking(eventId);
      setBooking(null);
      await reload();
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Failed to cancel booking.');
    } finally {
      setIsBooking(false);
    }
  };

  const shareUrl = event.shareToken
    ? `${window.location.origin}/view/${event.shareToken}`
    : '';

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnlock = async () => {
    if (!eventId || !canUnlock) return;
    if (!window.confirm('Unlock the scene to allow edits? The event will remain approved.')) return;
    setIsUnlocking(true);
    try {
      await eventsApi.unlockEvent(eventId);
      await reload();
    } catch (err) {
      console.error('Failed to unlock:', err);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    if (!window.confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`)) return;
    try {
      await eventsApi.deleteEvent(eventId);
      navigate('/events');
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleSaveShareSettings = async () => {
    if (!eventId) return;
    setIsSaving(true);
    try {
      await eventsApi.updateShareSettings(eventId, {
        sharePassword: sharePassword || null,
        showBudgetDetails,
      });
      await reload();
    } catch (err) {
      console.error('Failed to save share settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Venue Booking Section */}
      <div
        className="p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-3"
            style={{
              background: 'var(--lavender)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <Building2 className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Venue Booking
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              Select and book a venue for your event
            </p>
          </div>
        </div>

        {bookingError && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}
          >
            {bookingError}
          </div>
        )}

        {isLoadingVenues ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading venues…</p>
        ) : booking ? (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>{booking.venueName}</div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '99px',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                ✓ Confirmed
              </span>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '12px',
              }}
            >
              {booking.bookingDate
                ? new Date(booking.bookingDate).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
              {booking.venueCapacity ? ` · ${booking.venueCapacity} capacity` : ''}
            </div>

            <button
              onClick={handleCancelBooking}
              disabled={isBooking}
              style={{
                padding: '8px 16px',
                borderRadius: '99px',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'transparent',
                color: '#ef4444',
                fontSize: '13px',
                cursor: 'pointer',
                opacity: isBooking ? 0.6 : 1,
              }}
            >
              Cancel booking
            </button>
          </div>
        ) : venues.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No venues available.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full px-4 py-2"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text)',
                }}
              >
                <option value="">Select venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.capacity} capacity)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-4 py-2"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text)',
                }}
              />
            </div>
            <button
              onClick={handleBookVenue}
              disabled={isBooking || !selectedVenueId}
              className="px-6 py-3 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
              }}
            >
              {isBooking ? 'Booking…' : 'Book venue'}
            </button>
          </div>
        )}
      </div>

      {/* Share with Client Section */}
      <div
        className="p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-3"
            style={{
              background: 'var(--mint)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <Link2 className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Share with Client
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              Share a read-only link for your client to view and approve the design
            </p>
          </div>
        </div>

        {/* Share URL */}
        <div className="mb-6">
          <label
            style={{
              fontSize: '0.75rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Share link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-4 py-2"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text)',
              }}
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Optional password */}
        <div className="mb-6">
          <label
            style={{
              fontSize: '0.75rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Password (optional)
          </label>
          <input
            type="password"
            value={sharePassword}
            onChange={(e) => setSharePassword(e.target.value)}
            placeholder="Leave empty for no password"
            className="w-full px-4 py-2"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Show budget to client */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {showBudgetDetails ? (
              <Eye className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <EyeOff className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            )}
            <span
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text)',
              }}
            >
              Show budget summary to client
            </span>
          </div>
          <button
            onClick={() => setShowBudgetDetails(!showBudgetDetails)}
            className="w-12 h-6 rounded-full transition-colors"
            style={{
              background: showBudgetDetails ? 'var(--lavender)' : 'var(--surface2)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white shadow"
              style={{
                transform: showBudgetDetails ? 'translateX(26px)' : 'translateX(3px)',
                marginTop: 2,
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveShareSettings}
            disabled={isSaving}
            className="px-6 py-3 transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>
          {canUnlock && (
            <button
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="flex items-center gap-2 px-6 py-3 transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--lavender)',
                color: 'var(--text)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                opacity: isUnlocking ? 0.6 : 1,
              }}
            >
              <Unlock className="w-4 h-4" />
              {isUnlocking ? 'Unlocking...' : 'Unlock scene'}
            </button>
          )}
        </div>
      </div>

      {/* Delete Event Section */}
      <div
        className="p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-3"
            style={{
              background: 'var(--rose)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <Trash2 className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Delete Event
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              Permanently delete this event and all associated data
            </p>
          </div>
        </div>
        <button
          onClick={handleDeleteEvent}
          className="flex items-center gap-2 px-6 py-3 transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--rose)',
            color: '#8a2840',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete event
        </button>
      </div>
    </main>
  );
}
