// Venue Selector - Component for selecting and booking a venue

import { useState, useEffect } from 'react';
import { MapPin, Users, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';
import { bookingApi } from '../index';
import type { VenueTemplate, VenueBookingWithDetails } from '../booking.types';
import { cn } from '@/utils/cn';

interface VenueSelectorProps {
  eventId: string;
  eventDate: string;
  onBookingChange?: (booking: VenueBookingWithDetails | null) => void;
  disabled?: boolean;
}

export function VenueSelector({
  eventId,
  eventDate,
  onBookingChange,
  disabled,
}: VenueSelectorProps) {
  const [venues, setVenues] = useState<VenueTemplate[]>([]);
  const [currentBooking, setCurrentBooking] = useState<VenueBookingWithDetails | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load venues and current booking
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [venueList, booking] = await Promise.all([
          bookingApi.getVenueTemplates(),
          bookingApi.getEventBooking(eventId),
        ]);

        setVenues(venueList);
        setCurrentBooking(booking);
        setSelectedVenueId(booking?.venueTemplateId || null);

        // Check availability for event date
        const availabilityMap: Record<string, boolean> = {};
        await Promise.all(
          venueList.map(async (venue) => {
            const result = await bookingApi.checkVenueAvailability(venue.id, eventDate);
            // Available if not booked, or booked by this event
            availabilityMap[venue.id] = result.available || result.bookedBy === eventId;
          })
        );
        setAvailability(availabilityMap);
      } catch (err) {
        console.error('Failed to load venue data:', err);
        setError('Failed to load venues');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [eventId, eventDate]);

  const handleSelectVenue = async (venueId: string) => {
    if (disabled || isBooking || !availability[venueId]) return;

    setSelectedVenueId(venueId);
    setIsBooking(true);
    setError(null);

    try {
      const booking = await bookingApi.bookVenue(eventId, {
        venueTemplateId: venueId,
        bookingDate: eventDate,
      });

      setCurrentBooking(booking);
      onBookingChange?.(booking);
    } catch (err: any) {
      console.error('Failed to book venue:', err);
      setError(err.response?.data?.error || 'Failed to book venue');
      setSelectedVenueId(currentBooking?.venueTemplateId || null);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (disabled || isBooking || !currentBooking) return;

    setIsBooking(true);
    setError(null);

    try {
      await bookingApi.cancelBooking(eventId);
      setCurrentBooking(null);
      setSelectedVenueId(null);
      onBookingChange?.(null);

      // Refresh availability
      const availabilityMap: Record<string, boolean> = {};
      await Promise.all(
        venues.map(async (venue) => {
          const result = await bookingApi.checkVenueAvailability(venue.id, eventDate);
          availabilityMap[venue.id] = result.available;
        })
      );
      setAvailability(availabilityMap);
    } catch (err: any) {
      console.error('Failed to cancel booking:', err);
      setError(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setIsBooking(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (disabled || isBooking || !currentBooking || currentBooking.status === 'confirmed') return;

    setIsBooking(true);
    setError(null);

    try {
      const confirmed = await bookingApi.confirmBooking(eventId);
      setCurrentBooking({ ...currentBooking, status: confirmed.status });
      onBookingChange?.({ ...currentBooking, status: confirmed.status });
    } catch (err: any) {
      console.error('Failed to confirm booking:', err);
      setError(err.response?.data?.error || 'Failed to confirm booking');
    } finally {
      setIsBooking(false);
    }
  };

  // Group venues by category
  const venuesByCategory = venues.reduce((acc, venue) => {
    if (!acc[venue.category]) {
      acc[venue.category] = [];
    }
    acc[venue.category].push(venue);
    return acc;
  }, {} as Record<string, VenueTemplate[]>);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center py-12"
        style={{ color: 'var(--text-muted)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span style={{ fontFamily: 'DM Sans, sans-serif' }}>Loading venues...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current booking status */}
      {currentBooking && (
        <div 
          className="p-4 flex items-center justify-between"
          style={{
            background: currentBooking.status === 'confirmed' 
              ? 'var(--mint)' 
              : 'var(--lemon)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-center gap-3">
            {currentBooking.status === 'confirmed' ? (
              <Check className="w-5 h-5" style={{ color: '#166534' }} />
            ) : (
              <Calendar className="w-5 h-5" style={{ color: '#854d0e' }} />
            )}
            <div>
              <p 
                style={{ 
                  fontFamily: 'DM Sans, sans-serif', 
                  fontWeight: 600,
                  color: currentBooking.status === 'confirmed' ? '#166534' : '#854d0e',
                }}
              >
                {currentBooking.venueName}
              </p>
              <p 
                style={{ 
                  fontFamily: 'DM Sans, sans-serif', 
                  fontSize: '0.875rem',
                  color: currentBooking.status === 'confirmed' ? '#15803d' : '#a16207',
                }}
              >
                {currentBooking.status === 'confirmed' ? 'Confirmed' : 'Provisional'} - {eventDate}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {currentBooking.status === 'provisional' && (
              <button
                onClick={handleConfirmBooking}
                disabled={isBooking || disabled}
                className="px-4 py-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: '#166534',
                  color: 'white',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Confirm
              </button>
            )}
            <button
              onClick={handleCancelBooking}
              disabled={isBooking || disabled}
              className="px-4 py-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: 'transparent',
                border: '1px solid currentColor',
                color: currentBooking.status === 'confirmed' ? '#166534' : '#854d0e',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div 
          className="p-4 flex items-center gap-3"
          style={{
            background: 'var(--rose)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: '#991b1b' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#991b1b' }}>{error}</p>
        </div>
      )}

      {/* Venue list by category */}
      {Object.entries(venuesByCategory).map(([category, categoryVenues]) => (
        <div key={category}>
          <h3 
            className="mb-3"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}
          >
            {category}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryVenues.map((venue) => {
              const isSelected = selectedVenueId === venue.id;
              const isAvailable = availability[venue.id];
              const isCurrentBooking = currentBooking?.venueTemplateId === venue.id;

              return (
                <button
                  key={venue.id}
                  onClick={() => handleSelectVenue(venue.id)}
                  disabled={disabled || isBooking || (!isAvailable && !isCurrentBooking)}
                  className={cn(
                    'p-4 text-left transition-all',
                    isAvailable || isCurrentBooking
                      ? 'hover:-translate-y-1 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                  style={{
                    background: 'var(--surface)',
                    border: isSelected 
                      ? '2px solid var(--accent)' 
                      : '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 
                      style={{
                        fontFamily: 'Playfair Display, serif',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {venue.name}
                    </h4>
                    {isSelected && (
                      <div 
                        className="w-6 h-6 flex items-center justify-center"
                        style={{
                          background: 'var(--accent)',
                          borderRadius: '50%',
                        }}
                      >
                        <Check className="w-4 h-4" style={{ color: 'white' }} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <span 
                        style={{ 
                          fontFamily: 'DM Sans, sans-serif', 
                          fontSize: '0.875rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {venue.capacity} guests
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <span 
                        style={{ 
                          fontFamily: 'DM Sans, sans-serif', 
                          fontSize: '0.875rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {venue.category}
                      </span>
                    </div>
                  </div>

                  {venue.description && (
                    <p 
                      className="line-clamp-2"
                      style={{ 
                        fontFamily: 'DM Sans, sans-serif', 
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {venue.description}
                    </p>
                  )}

                  {!isAvailable && !isCurrentBooking && (
                    <p 
                      className="mt-2"
                      style={{ 
                        fontFamily: 'DM Sans, sans-serif', 
                        fontSize: '0.75rem',
                        color: '#dc2626',
                      }}
                    >
                      Unavailable on {eventDate}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {venues.length === 0 && (
        <div 
          className="text-center py-12"
          style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
        >
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No venues available</p>
        </div>
      )}
    </div>
  );
}
