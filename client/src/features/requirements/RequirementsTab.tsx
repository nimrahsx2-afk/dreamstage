import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as requirementsApi from './requirements.api';

function getRecommendedPackage(
  budgetRange: string,
  guestCount: number
): 'Basic' | 'Standard' | 'Premium' {
  const isHighBudget =
    budgetRange.includes('300,000') ||
    budgetRange.includes('500,000') ||
    budgetRange.includes('Above');
  const isMidBudget =
    budgetRange.includes('150,000') || budgetRange.includes('50,000 –');
  if (isHighBudget || guestCount > 300) return 'Premium';
  if (isMidBudget || guestCount > 100) return 'Standard';
  return 'Basic';
}

export function RequirementsTab() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [req, setReq] = useState<any | null>(null);
  const [link, setLink] = useState<{ token: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const row = await requirementsApi.getRequirementsForEvent(eventId);
      setReq(row);
      setLink(row?.shareToken ? { token: row.shareToken, url: `${window.location.origin}/requirements/${row.shareToken}` } : null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleGenerate = async () => {
    if (!eventId) return;
    setError(null);
    try {
      const res = await requirementsApi.generateRequirementsLink(eventId);
      setLink(res);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to generate link');
    }
  };

  const handleCopy = async () => {
    if (!link?.url) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const whatsAppUrl = link?.url
    ? `https://wa.me/?text=${encodeURIComponent(`Please fill in your requirements: ${link.url}`)}`
    : null;

  const submitted = req?.isSubmitted === true;

  const recommended = useMemo(() => {
    if (!submitted) return 'Basic' as const;
    return getRecommendedPackage(req.budgetRange || '', Number(req.guestCount || 0));
  }, [submitted, req]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    boxShadow: 'var(--shadow)',
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="p-6" style={cardStyle}>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="p-6" style={cardStyle}>
        <h2
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 6,
          }}
        >
          Client Requirements
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
          Share this form with your client to collect their event requirements
        </p>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {!submitted ? (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="px-5 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}
            >
              Generate Form Link
            </button>

            {link?.url && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Form link</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', wordBreak: 'break-all' }}>{link.url}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-lg font-medium"
                    style={{ background: 'var(--text)', color: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  {whatsAppUrl && (
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg font-medium"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none' }}
                    >
                      Share via WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-5" style={cardStyle}>
                <h3 style={{ fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: 10, color: 'var(--text)' }}>
                  Event Details
                </h3>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
                  <div>Type: <span style={{ color: 'var(--text)' }}>{req.eventType || '—'}</span></div>
                  <div>Date: <span style={{ color: 'var(--text)' }}>{req.eventDate || '—'}</span></div>
                  <div>Guests: <span style={{ color: 'var(--text)' }}>{req.guestCount ?? '—'}</span></div>
                </div>
              </div>

              <div className="p-5" style={cardStyle}>
                <h3 style={{ fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: 10, color: 'var(--text)' }}>
                  Venue Preferences
                </h3>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
                  <div>Venue type: <span style={{ color: 'var(--text)' }}>{req.venueType || '—'}</span></div>
                  <div>Hall name: <span style={{ color: 'var(--text)' }}>{req.hallPreference || '—'}</span></div>
                  <div>Seating style: <span style={{ color: 'var(--text)' }}>{req.seatingStyle || '—'}</span></div>
                  <div style={{ marginTop: 6 }}>Notes: <span style={{ color: 'var(--text)' }}>{req.seatingNotes || '—'}</span></div>
                </div>
              </div>

              <div className="p-5" style={cardStyle}>
                <h3 style={{ fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: 10, color: 'var(--text)' }}>
                  Food & Services
                </h3>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
                  <div>Meal: <span style={{ color: 'var(--text)' }}>{req.mealPreference || '—'}</span></div>
                  <div style={{ marginTop: 6 }}>
                    Add-ons:{' '}
                    <span style={{ color: 'var(--text)' }}>
                      {Array.isArray(req.addons) && req.addons.length ? req.addons.join(', ') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5" style={cardStyle}>
                <h3 style={{ fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: 10, color: 'var(--text)' }}>
                  Budget & Notes
                </h3>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
                  <div>Budget: <span style={{ color: 'var(--text)' }}>{req.budgetRange || '—'}</span></div>
                  <div>Lighting: <span style={{ color: 'var(--text)' }}>{req.lightingPreference || '—'}</span></div>
                  <div>Decoration: <span style={{ color: 'var(--text)' }}>{req.decorationPreference || '—'}</span></div>
                  <div style={{ marginTop: 6 }}>Requests: <span style={{ color: 'var(--text)' }}>{req.specialRequests || '—'}</span></div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(192,132,252,0.08)',
              border: '1px solid rgba(192,132,252,0.2)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>
                  Ready to set your budget?
                </p>
                <p style={{ fontSize: 13, color: '#9d8aba' }}>
                  Client selected: <strong>{req.budgetRange}</strong> · {req.guestCount} guests
                </p>
              </div>
              <button
                onClick={() => navigate(`/events/${eventId}/settings`)}
                style={{
                  background: 'linear-gradient(135deg, #c084fc, #f472b6)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Set Budget →
              </button>
            </div>

            <div className="p-6" style={cardStyle}>
              <h3
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: 14,
                }}
              >
                Package Recommendation
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { name: 'Basic' as const, range: 'Rs. 50,000–100,000', desc: 'Basic hall, simple décor, basic meal' },
                  { name: 'Standard' as const, range: 'Rs. 100,000–300,000', desc: 'Mid-range hall, standard buffet, fairy lights' },
                  { name: 'Premium' as const, range: 'Rs. 300,000+', desc: 'Premium hall, full buffet, premium lighting & décor' },
                ].map((p) => {
                  const isRec = recommended === p.name;
                  return (
                    <div
                      key={p.name}
                      className="p-5"
                      style={{
                        ...cardStyle,
                        border: isRec ? '1px solid var(--accent)' : (cardStyle.border as string),
                        position: 'relative',
                      }}
                    >
                      {isRec && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: 'rgba(192,132,252,0.18)',
                            color: 'var(--text)',
                            fontSize: 12,
                            fontFamily: 'DM Sans, sans-serif',
                            fontWeight: 700,
                          }}
                        >
                          Recommended
                        </div>
                      )}
                      <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem' }}>
                        {p.name}
                      </div>
                      <div style={{ marginTop: 6, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
                        {p.range}
                      </div>
                      <div style={{ marginTop: 10, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
                        {p.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

