import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Users, CheckCircle2 } from 'lucide-react';

interface VenueOption {
  id: string;
  name: string;
  category: string;
  capacity: number;
  description: string;
  location: string;
  thumbnailUrl: string;
  promoVideoUrl: string;
  pricePerHead: number;
  amenities: string[];
}

interface SelectionData {
  inquiry: {
    clientName: string;
    eventType: string;
    eventDate: string;
    guestCount: number;
    budgetRange: string;
  };
  venues: VenueOption[];
  selectedVenueId: string | null;
  holdExpiresAt: string | null;
  alreadySelected: boolean;
}

export function VenueSelectionPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SelectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selected, setSelected] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null);
  const [autoBooked, setAutoBooked] = useState(false);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/venue-selection/${token}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
      if (json.data.alreadySelected) {
        setSelected(true);
        const venue = json.data.venues.find((v: VenueOption) => v.id === json.data.selectedVenueId);
        setSelectedVenue(venue || null);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (venue: VenueOption) => {
    if (selected || selecting) return;

    const confirmed = window.confirm(
      `Book "${venue.name}" for your event?\n\n` + `This will confirm your venue booking!`
    );
    if (!confirmed) return;

    setSelecting(venue.id);
    try {
      const res = await fetch(`/api/venue-selection/${token}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSelected(true);
      setSelectedVenue(venue);
      setAutoBooked(Boolean(json.data?.autoBooked));
    } catch (err: any) {
      alert(err.message || 'Failed to book venue');
    } finally {
      setSelecting(null);
    }
  };

  if (isLoading)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: '14px',
        }}
      >
        Loading your venue options...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '48px' }}>😕</div>
        <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>Link not found</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{error}</div>
      </div>
    );

  if (!data) return null;

  if (selected && selectedVenue) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <CheckCircle2 size={72} style={{ color: '#10b981', marginBottom: '16px' }} />
          <div style={{ fontWeight: 700, fontSize: '24px', color: 'var(--text)', marginBottom: '8px' }}>
            {autoBooked ? 'Venue Booked! 🎉' : 'Great choice! ✓'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            {autoBooked ? (
              <>
                Your planner has been notified. They will begin designing your event layout in 3D right away!
              </>
            ) : (
              <>
                Your selection has been sent to your planner. They will confirm the booking and get in touch shortly.
              </>
            )}
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '2px solid #10b981',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}
          >
            {selectedVenue.thumbnailUrl && (
              <img
                src={selectedVenue.thumbnailUrl}
                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '6px' }}>
                {selectedVenue.name}
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>👥 Up to {selectedVenue.capacity} guests</span>
                {selectedVenue.location && <span>📍 {selectedVenue.location}</span>}
              </div>
            </div>
          </div>

          {data.holdExpiresAt && (
            <div
              style={{
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#92400e',
              }}
            >
              ⏰ This venue is held for 24 hours. Your planner will confirm the booking before{' '}
              {new Date(data.holdExpiresAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}.
            </div>
          )}

          <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>Powered by ✨ DreamStage</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
        >
          ✨
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>DreamStage</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Venue Selection for {data.inquiry.clientName}</div>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {[
            ['🎉 Event', data.inquiry.eventType],
            ['👥 Guests', String(data.inquiry.guestCount)],
            [
              '📅 Date',
              data.inquiry.eventDate
                ? new Date(data.inquiry.eventDate).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—',
            ],
            ['💰 Budget', data.inquiry.budgetRange],
          ].map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '2px',
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>
          Choose Your Venue
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Your planner has shortlisted these venues based on your requirements. Pick the one you love!
        </div>

        {data.venues.map((venue) => (
          <div
            key={venue.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '16px',
              transition: 'box-shadow 0.2s',
            }}
          >
            {venue.thumbnailUrl ? (
              <img src={venue.thumbnailUrl} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '220px',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                }}
              >
                🏛️
              </div>
            )}

            {venue.promoVideoUrl && (
              <div style={{ padding: '0 16px', marginTop: '12px' }}>
                <iframe
                  src={venue.promoVideoUrl.replace('watch?v=', 'embed/')}
                  style={{ width: '100%', height: '200px', borderRadius: '10px', border: 'none' }}
                  allowFullScreen
                />
              </div>
            )}

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>{venue.name}</div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: '99px',
                    background: 'rgba(124,58,237,0.1)',
                    color: '#7c3aed',
                    border: '1px solid rgba(124,58,237,0.2)',
                  }}
                >
                  {venue.category}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={13} />
                  Up to {venue.capacity} guests
                </span>
                {venue.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} />
                    {venue.location}
                  </span>
                )}
              </div>

              {venue.description && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '12px' }}>
                  {venue.description}
                </div>
              )}

              {venue.amenities && venue.amenities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {venue.amenities.map((a) => (
                    <span
                      key={a}
                      style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '99px',
                        background: 'var(--surface2)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleSelect(venue)}
                disabled={!!selecting || selected}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background:
                    selecting === venue.id ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: selecting || selected ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {selecting === venue.id ? '⏳ Selecting...' : '✓ Choose This Venue'}
              </button>
            </div>
          </div>
        ))}

        {data.venues.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '14px' }}>
            No venues have been shortlisted yet. Please contact your planner.
          </div>
        )}
      </div>
    </div>
  );
}

