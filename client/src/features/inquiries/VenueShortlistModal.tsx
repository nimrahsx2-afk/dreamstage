import { useEffect, useState } from 'react';
import { X, Check, MapPin, Users } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Venue {
  id: string;
  name: string;
  category: string;
  capacity: number;
  description: string | null;
  thumbnailUrl: string | null;
  location: string | null;
  pricePerHead: number | null;
}

interface Props {
  inquiryId: string;
  clientName: string;
  guestCount: number;
  venueType: string;
  eventDate: string;
  onClose: () => void;
}

export function VenueShortlistModal({
  inquiryId,
  clientName,
  guestCount,
  venueType,
  eventDate,
  onClose,
}: Props) {
  void eventDate;
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectionUrl, setSelectionUrl] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    void loadVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVenues = async () => {
    try {
      // Fetch all venues (planner-facing list)
      const res = await api.get('/booking/venues');
      const raw = res.data?.data ?? res.data ?? [];
      const allVenues: Venue[] = (Array.isArray(raw) ? raw : []).map((v: any) => ({
        id: String(v.id),
        name: String(v.name ?? ''),
        category: String(v.category ?? ''),
        capacity: Number(v.capacity ?? 0),
        description: v.description ?? null,
        thumbnailUrl: v.thumbnailUrl ?? v.thumbnail_url ?? null,
        location: v.location ?? null,
        pricePerHead:
          typeof v.pricePerHead === 'number'
            ? v.pricePerHead
            : v.price_per_head != null
              ? Number(v.price_per_head)
              : null,
      }));

      const filtered = allVenues.filter((v) => {
        const matchesType = venueType
          ? v.category?.toLowerCase().includes(venueType.toLowerCase()) ||
            venueType.toLowerCase().includes(v.category?.toLowerCase())
          : true;
        const hasCapacity = guestCount ? v.capacity >= guestCount : true;
        return matchesType || hasCapacity;
      });

      const others = allVenues.filter((v) => !filtered.find((f) => f.id === v.id));
      setVenues([...filtered, ...others]);
    } catch {
      toast.error('Could not load venues');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVenue = (venueId: string) => {
    setSelected((prev) => {
      if (prev.includes(venueId)) return prev.filter((id) => id !== venueId);
      if (prev.length >= 3) {
        toast.error('Maximum 3 venues allowed');
        return prev;
      }
      return [...prev, venueId];
    });
  };

  const handleSend = async () => {
    if (selected.length === 0) {
      toast.error('Select at least 1 venue');
      return;
    }
    setIsSending(true);
    try {
      const res = await api.post(`/inquiries/${inquiryId}/shortlist-venues`, { venueIds: selected });
      setSelectionUrl(res.data?.data?.selectionUrl || '');
      setDone(true);
      toast.success('Venue selection link created!');
    } catch {
      toast.error('Failed to create link');
    } finally {
      setIsSending(false);
    }
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(selectionUrl);
    toast.success('Link copied!');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi ${clientName}! Please select your preferred venue from the options I've shortlisted for you: ${selectionUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '580px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--text)',
              }}
            >
              Shortlist Venues for {clientName}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              Select up to 3 venues · Client prefers: {venueType || 'Any'} · {guestCount} guests
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
          }}
        >
          {done ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
                Venue selection link created!
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Share this link with {clientName} so they can pick their preferred venue.
              </div>
              <div
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                {selectionUrl}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={copyLink}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '99px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy Link
                </button>
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '99px',
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Share via WhatsApp
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading venues...
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {selected.length}/3 venues selected. Venues matching client preferences shown first.
              </div>

              {venues.map((venue) => {
                const isSelected = selected.includes(venue.id);
                const isMatch = venueType
                  ? venue.category?.toLowerCase().includes(venueType.toLowerCase()) ||
                    venueType.toLowerCase().includes(venue.category?.toLowerCase())
                  : false;

                return (
                  <div
                    key={venue.id}
                    onClick={() => toggleVenue(venue.id)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? '#7c3aed' : 'var(--border)',
                      background: isSelected ? 'rgba(124,58,237,0.06)' : 'var(--surface2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: '80px',
                        height: '70px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--border)',
                      }}
                    >
                      {venue.thumbnailUrl ? (
                        <img
                          src={venue.thumbnailUrl}
                          alt={venue.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            background: 'rgba(124,58,237,0.1)',
                          }}
                        >
                          🏛️
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>{venue.name}</span>
                        {isMatch && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'rgba(16,185,129,0.1)',
                              color: '#10b981',
                              padding: '1px 7px',
                              borderRadius: '99px',
                              fontWeight: 600,
                              border: '1px solid rgba(16,185,129,0.2)',
                            }}
                          >
                            ✓ Matches preference
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>
                          <Users size={10} style={{ display: 'inline', marginRight: '3px' }} />
                          Up to {venue.capacity}
                        </span>
                        {venue.location && (
                          <span>
                            <MapPin size={10} style={{ display: 'inline', marginRight: '3px' }} />
                            {venue.location}
                          </span>
                        )}
                      </div>
                      {venue.description && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '300px',
                          }}
                        >
                          {venue.description}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isSelected ? '#7c3aed' : 'var(--border)',
                        background: isSelected ? '#7c3aed' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    >
                      {isSelected && <Check size={12} style={{ color: 'white' }} />}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {!done && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {selected.length === 0
                ? 'Select venues to shortlist'
                : `${selected.length} venue${selected.length > 1 ? 's' : ''} selected`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '99px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || selected.length === 0}
                style={{
                  padding: '8px 20px',
                  borderRadius: '99px',
                  background:
                    selected.length === 0 ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isSending
                  ? 'Creating link...'
                  : `Send ${selected.length} Venue${selected.length !== 1 ? 's' : ''} to Client →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

