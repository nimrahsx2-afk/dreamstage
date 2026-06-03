import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Pencil, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import * as inquiriesApi from './inquiries.api';
import { createEventFromInquiry } from '../events/events.api';
import type { InquiryRecord } from './inquiries.api';
import { VenueShortlistModal } from './VenueShortlistModal';
import {
  EVENT_TYPES,
  VENUE_TYPES,
  SEATING_STYLES,
  MEAL_OPTIONS,
  ADDONS,
  BUDGETS,
  LIGHTING,
} from './inquiry.constants';

type EditDraft = {
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  venueType: string;
  hallPreference: string;
  seatingStyle: string;
  seatingNotes: string;
  mealPreference: string;
  addons: string[];
  budgetRange: string;
  lightingPreference: string;
  decorationPreference: string;
  specialRequests: string;
  inspirationImages: string[];
};

function recordToDraft(r: InquiryRecord): EditDraft {
  return {
    clientName: r.clientName ?? '',
    clientEmail: r.clientEmail ?? '',
    eventType: r.eventType ?? 'Wedding',
    eventDate: r.eventDate ?? '',
    guestCount: r.guestCount ?? 0,
    venueType: r.venueType ?? '',
    hallPreference: r.hallPreference ?? '',
    seatingStyle: r.seatingStyle ?? 'Banquet',
    seatingNotes: r.seatingNotes ?? '',
    mealPreference: r.mealPreference ?? 'Standard Buffet',
    addons: Array.isArray(r.addons) ? [...r.addons] : [],
    budgetRange: r.budgetRange ?? 'Rs. 150,000 – 300,000',
    lightingPreference: r.lightingPreference ?? 'Basic',
    decorationPreference: r.decorationPreference ?? '',
    specialRequests: r.specialRequests ?? '',
    inspirationImages: Array.isArray(r.inspirationImages) ? [...r.inspirationImages] : [],
  };
}

function formatDt(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PK');
  } catch {
    return iso;
  }
}

function calculateSetup(
  guestCount: number,
  venueType: string,
  eventType: string,
  mealPreference: string
) {
  void eventType;
  const g = guestCount || 0;

  const roundTables = Math.ceil(g / 10);
  const chairs = g;

  const sofas = Math.ceil((g * 0.2) / 3);

  const mealBase = mealPreference.split(' — ')[0].trim();
  const guestsPerBuffet =
    mealBase === 'Premium Buffet'
      ? 20
      : mealBase === 'Finger Food / Hi-Tea'
        ? 35
        : mealBase === 'Daig / Deg Style'
          ? 22
          : mealBase === 'Custom Menu'
            ? 25
            : mealBase === 'Standard Buffet'
              ? 25
              : 25;
  const buffetTables = Math.ceil(g / guestsPerBuffet);

  const chandeliers = Math.ceil(g / 50);

  const fairyLightStrands = Math.ceil(g / 20);

  const stages = g >= 300 ? 2 : 1;
  const backdrops = stages;

  const floralArrangements = Math.ceil(g / 30);

  const tableCenterpieces = roundTables;

  const isOutdoor =
    venueType === 'Farmhouse' ||
    venueType === 'Outdoor Garden' ||
    venueType === 'Rooftop' ||
    venueType === 'Beach / Resort' ||
    venueType === 'Marquee / Tent';

  const outdoorLights = isOutdoor ? Math.ceil(g / 15) : 0;

  const diningCapacity = roundTables * 10;
  const loungeCapacity = sofas * 3;
  const totalCapacity = diningCapacity + loungeCapacity;

  return {
    seating: {
      roundTables,
      chairs,
      sofas,
      diningCapacity,
      loungeCapacity,
      totalCapacity,
    },
    dining: {
      buffetTables,
      mealType: mealPreference,
    },
    lighting: {
      chandeliers,
      fairyLightStrands,
      outdoorLights,
      isOutdoor,
    },
    staging: {
      stages,
      backdrops,
    },
    decor: {
      floralArrangements,
      tableCenterpieces,
    },
  };
}

function AiSetupCard({ row }: { row: InquiryRecord }) {
  const [expanded, setExpanded] = useState(false);

  if (!row.isSubmitted || row.guestCount == null || row.guestCount <= 0) {
    return null;
  }

  const guests = row.guestCount;

  const setup = calculateSetup(
    guests,
    row.venueType || '',
    row.eventType || 'Wedding',
    row.mealPreference || 'Standard Buffet'
  );

  const s = setup.seating;
  const isOver = s.totalCapacity < guests;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.05))',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: '12px',
        padding: '14px 16px',
        marginTop: '12px',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((x) => !x);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: expanded ? '14px' : '0',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🤖</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>AI Suggested Setup</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
              For {guests} guests · {row.venueType || 'General venue'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isOver ? (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '99px',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              ⚠ Check capacity
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '99px',
                background: 'rgba(16,185,129,0.1)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              ✓ {s.totalCapacity} seats covered
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {!expanded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {[
            { icon: '🪑', label: `${s.roundTables} tables` },
            { icon: '🛋️', label: `${s.sofas} sofas` },
            { icon: '🍽️', label: `${setup.dining.buffetTables} buffet` },
            { icon: '💡', label: `${setup.lighting.chandeliers} chandeliers` },
            { icon: '🎪', label: `${setup.staging.stages} stage${setup.staging.stages > 1 ? 's' : ''}` },
            { icon: '🌸', label: `${setup.decor.floralArrangements} florals` },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '99px',
                background: 'var(--surface2, rgba(0,0,0,0.1))',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '8px',
              }}
            >
              🪑 Seating
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: 'Round tables (10 seats)', value: s.roundTables, note: `${s.diningCapacity} seats` },
                { label: 'Chairs total', value: s.chairs, note: '1 per guest' },
                { label: 'Sofas (lounge area)', value: s.sofas, note: `${s.loungeCapacity} lounge seats` },
                {
                  label: 'Total capacity',
                  value: s.totalCapacity,
                  note: s.totalCapacity >= row.guestCount ? '✓ Sufficient' : '⚠ Add more seating',
                  highlight: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: item.highlight
                      ? s.totalCapacity >= guests
                        ? 'rgba(16,185,129,0.08)'
                        : 'rgba(239,68,68,0.08)'
                      : 'var(--surface2, rgba(0,0,0,0.08))',
                    border: `1px solid ${
                      item.highlight
                        ? s.totalCapacity >= guests
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(239,68,68,0.2)'
                        : 'var(--border)'
                    }`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label}</div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: item.highlight
                        ? s.totalCapacity >= guests
                          ? '#10b981'
                          : '#ef4444'
                        : 'var(--text-muted)',
                      marginTop: '2px',
                      fontWeight: 500,
                    }}
                  >
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '8px',
              }}
            >
              🍽️ Dining
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                {
                  label: 'Buffet tables',
                  value: setup.dining.buffetTables,
                  note: `1 per ${
                    setup.dining.mealType === 'Premium Buffet' ? 20 : setup.dining.mealType === 'Basic' ? 30 : 25
                  } guests`,
                },
                { label: 'Table centerpieces', value: setup.decor.tableCenterpieces, note: '1 per dining table' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--surface2, rgba(0,0,0,0.08))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '8px',
              }}
            >
              💡 Lighting & Décor
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {(
                [
                  { label: 'Chandeliers', value: setup.lighting.chandeliers, note: '1 per 50 guests' },
                  { label: 'Fairy light strands', value: setup.lighting.fairyLightStrands, note: '1 per 20 guests' },
                  { label: 'Floral arrangements', value: setup.decor.floralArrangements, note: '1 per 30 guests' },
                  ...(setup.lighting.isOutdoor
                    ? [
                        {
                          label: 'Outdoor string lights',
                          value: setup.lighting.outdoorLights,
                          note: 'Extra for outdoor venue',
                        },
                      ]
                    : []),
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--surface2, rgba(0,0,0,0.08))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '8px',
              }}
            >
              🎪 Staging
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                {
                  label: 'Main stage',
                  value: setup.staging.stages,
                  note: guests >= 300 ? 'Main + side stage' : 'Standard setup',
                },
                { label: 'Backdrops', value: setup.staging.backdrops, note: '1 per stage' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--surface2, rgba(0,0,0,0.08))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const notes =
                `AI Setup for ${guests} guests:\n` +
                `Seating: ${s.roundTables} round tables, ${s.sofas} sofas, ${s.chairs} chairs\n` +
                `Dining: ${setup.dining.buffetTables} buffet tables\n` +
                `Lighting: ${setup.lighting.chandeliers} chandeliers, ${setup.lighting.fairyLightStrands} fairy light strands\n` +
                `Staging: ${setup.staging.stages} stage(s), ${setup.staging.backdrops} backdrop(s)\n` +
                `Decor: ${setup.decor.floralArrangements} florals, ${setup.decor.tableCenterpieces} centerpieces`;
              void navigator.clipboard.writeText(notes).then(() => {
                toast.success('Setup copied to clipboard!');
              });
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '99px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              alignSelf: 'flex-start',
            }}
          >
            📋 Copy setup notes
          </button>
        </div>
      )}
    </div>
  );
}

export function InquiriesPlannerPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingEventFor, setCreatingEventFor] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shortlistInquiryId, setShortlistInquiryId] = useState<string | null>(null);
  const [shortlistRow, setShortlistRow] = useState<InquiryRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inquiriesApi.listInquiries();
      setRows(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setError(null);
    try {
      const res = await inquiriesApi.generateInquiryLink();
      setLinkModal({ url: res.url });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to generate link');
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const whatsappUrl = (url: string) =>
    `https://wa.me/?text=${encodeURIComponent(`Please fill in your event requirements: ${url}`)}`;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditingId(null);
    setDraft(null);
  };

  const startEdit = (r: InquiryRecord) => {
    setExpandedId(r.id);
    setEditingId(r.id);
    setDraft(recordToDraft(r));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await inquiriesApi.updateInquiry(id, {
        ...draft,
        guestCount: Number(draft.guestCount) || 0,
        inspirationImages: draft.inspirationImages.filter(Boolean),
      });
      setEditingId(null);
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEvent = async (inquiryId: string, clientName: string) => {
    if (
      !window.confirm(
        `Create an event for ${clientName}? This will pre-fill all their details automatically.`
      )
    ) {
      return;
    }

    setCreatingEventFor(inquiryId);
    try {
      const newEvent = await createEventFromInquiry(inquiryId);
      toast.success(`Event "${newEvent.name}" created successfully!`);
      navigate(`/events/${newEvent.id}`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create event');
    } finally {
      setCreatingEventFor(null);
    }
  };

  const removeInquiry = async (r: InquiryRecord) => {
    if (!window.confirm('Delete this inquiry? This cannot be undone.')) return;
    setError(null);
    try {
      await inquiriesApi.deleteInquiry(r.id);
      if (expandedId === r.id) setExpandedId(null);
      setEditingId(null);
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete');
    }
  };

  const cardShell: React.CSSProperties = useMemo(
    () => ({
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: 'var(--shadow)',
    }),
    []
  );

  const pending = rows.filter((r) => !r.isSubmitted);
  const done = rows.filter((r) => r.isSubmitted);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading inquiries…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {error && (
        <div className="ev-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ ...cardShell, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 6,
          }}
        >
          Client Inquiries
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Generate a unique link for each client. Their submitted form will appear here.
        </p>
        <button
          type="button"
          className="ev-btn-new"
          style={{
            background: 'linear-gradient(135deg, #c084fc, #f472b6)',
            color: '#fff',
            borderRadius: 10,
          }}
          onClick={handleGenerate}
        >
          <Plus className="w-4 h-4" />
          Generate New Link
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="ev-empty-state" style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }} aria-hidden>
            📋
          </div>
          <h3 className="ev-empty-title">No inquiries yet</h3>
          <p className="ev-empty-sub">Generate a link and share it with your first client</p>
          <button
            type="button"
            className="ev-btn-new"
            style={{
              marginTop: '1rem',
              background: 'linear-gradient(135deg, #c084fc, #f472b6)',
              color: '#fff',
              borderRadius: 10,
            }}
            onClick={handleGenerate}
          >
            <Plus className="w-4 h-4" />
            Generate New Link
          </button>
        </div>
      ) : (
        <div className="ev-events-list" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
          {pending.map((r) => (
            <div key={r.id} style={{ ...cardShell, padding: '1rem 1.25rem' }}>
              <div className="ev-event-card-inner" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'rgba(245,158,11,0.18)',
                    color: '#b45309',
                  }}
                >
                  Awaiting Response
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Link created {formatDateOnly(r.createdAt)}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="ev-icon-btn"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', width: 'auto', borderRadius: 8 }}
                    onClick={() => copyUrl(`${window.location.origin}/inquiry/${r.shareToken}`)}
                  >
                    Copy Link
                  </button>
                  <button
                    type="button"
                    className="ev-icon-btn"
                    style={{ color: '#dc2626', fontSize: '0.8rem', padding: '0.35rem 0.75rem', width: 'auto', borderRadius: 8 }}
                    onClick={() => removeInquiry(r)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {done.map((r) => {
            const expanded = expandedId === r.id;
            const editing = editingId === r.id;
            const status = (() => {
              if (r.convertedEventId) {
                return {
                  label: 'Converted',
                  style: {
                    background: 'rgba(124,58,237,0.1)',
                    color: '#7c3aed',
                    border: '1px solid rgba(124,58,237,0.2)',
                  } as React.CSSProperties,
                };
              }
              if (r.isSubmitted) {
                return {
                  label: 'Submitted',
                  style: {
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.2)',
                  } as React.CSSProperties,
                };
              }
              return {
                label: 'Awaiting',
                style: {
                  background: 'rgba(251,191,36,0.1)',
                  color: '#f59e0b',
                  border: '1px solid rgba(251,191,36,0.2)',
                } as React.CSSProperties,
              };
            })();
            return (
              <div key={r.id} style={{ ...cardShell, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      ...status.style,
                    }}
                  >
                    {status.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.clientName || 'Client'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {r.eventType || '—'} · {r.guestCount ?? '—'} guests · {r.budgetRange || '—'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {r.convertedEventId ? `Converted ${formatDt(r.convertedAt)}` : `Submitted ${formatDt(r.submittedAt)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="ev-icon-btn"
                      style={{ width: 'auto', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.8rem' }}
                      onClick={() => toggleExpand(r.id)}
                    >
                      {expanded ? (
                        <>
                          Collapse <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Expand <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    {!editing && (
                      <button
                        type="button"
                        className="ev-icon-btn"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.8rem' }}
                        onClick={() => startEdit(r)}
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    )}
                    {r.convertedEventId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '99px',
                            background: 'rgba(16,185,129,0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.2)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ✓ Event Created
                        </span>
                        <a
                          href={`/events/${r.convertedEventId}`}
                          style={{
                            fontSize: '12px',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Open Event →
                        </a>
                      </div>
                    ) : (
                      r.isSubmitted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCreateEvent(r.id, r.clientName || 'this client');
                          }}
                          disabled={creatingEventFor === r.id}
                          title="Create event from this inquiry"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            background:
                              creatingEventFor === r.id
                                ? '#9ca3af'
                                : 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '99px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: creatingEventFor === r.id ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CalendarPlus size={11} />
                          {creatingEventFor === r.id ? 'Creating...' : 'Create Event'}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      className="ev-icon-btn"
                      style={{ color: '#dc2626', width: 'auto', padding: '0.35rem 0.75rem', borderRadius: 8 }}
                      onClick={() => removeInquiry(r)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      padding: '1rem 1.25rem 1.25rem',
                      background: 'var(--surface2)',
                    }}
                  >
                    {editing && draft ? (
                      <EditInquiryForm
                        draft={draft}
                        setDraft={setDraft}
                        saving={saving}
                        onCancel={cancelEdit}
                        onSave={() => saveEdit(r.id)}
                      />
                    ) : (
                      <>
                        <InquiryReadOnlyDetails inquiry={r} onImageClick={setLightbox} />
                        {r.isSubmitted && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                            {r.convertedEventId ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '6px 12px',
                                    borderRadius: '99px',
                                    background: 'rgba(16,185,129,0.1)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  ✓ Event Created
                                </span>
                                <a
                                  href={`/events/${r.convertedEventId}`}
                                  style={{
                                    fontSize: '13px',
                                    color: 'var(--accent)',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Open Event →
                                </a>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleCreateEvent(r.id, r.clientName || 'this client')}
                                disabled={creatingEventFor === r.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 16px',
                                  background:
                                    creatingEventFor === r.id
                                      ? '#9ca3af'
                                      : 'linear-gradient(135deg, #10b981, #059669)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '99px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: creatingEventFor === r.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <CalendarPlus size={14} />
                                {creatingEventFor === r.id ? 'Creating...' : 'Create Event'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShortlistInquiryId(r.id);
                                setShortlistRow(r);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '99px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🏛️ Shortlist Venues for Client
                            </button>
                          </div>
                        )}

                        {r.selectedVenueName && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '8px 12px',
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              borderRadius: '10px',
                              marginTop: '8px',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                                ✓ Client booked a venue!
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {r.selectedVenueName} · Auto-confirmed
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: '99px',
                                background: '#10b981',
                                color: 'white',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ✓ Booked
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <AiSetupCard row={r} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {linkModal && (
        <div className="ev-modal-overlay" onClick={(e) => e.target === e.currentTarget && setLinkModal(null)}>
          <div className="ev-modal">
            <div className="ev-modal-header">
              <div className="ev-modal-title">Share this link</div>
              <button type="button" className="ev-modal-close" onClick={() => setLinkModal(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="ev-modal-field">
              <label className="ev-modal-label">Inquiry URL</label>
              <div className="ev-modal-input" style={{ wordBreak: 'break-all', height: 'auto', minHeight: 44 }}>
                {linkModal.url}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button type="button" className="ev-modal-btn" onClick={() => copyUrl(linkModal.url)}>
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <a
                className="ev-modal-btn"
                href={whatsappUrl(linkModal.url)}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Share via WhatsApp
              </a>
              <button type="button" className="ev-modal-close" style={{ padding: '10px 16px', marginLeft: 'auto' }} onClick={() => setLinkModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {shortlistInquiryId && shortlistRow && (
        <VenueShortlistModal
          inquiryId={shortlistInquiryId}
          clientName={shortlistRow.clientName || 'Client'}
          guestCount={shortlistRow.guestCount || 100}
          venueType={shortlistRow.venueType || ''}
          eventDate={shortlistRow.eventDate || ''}
          onClose={() => {
            setShortlistInquiryId(null);
            setShortlistRow(null);
          }}
        />
      )}

      {lightbox && (
        <button
          type="button"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.75)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setLightbox(null)}
          aria-label="Close image"
        >
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, pointerEvents: 'none' }} />
        </button>
      )}
    </div>
  );
}

function InquiryReadOnlyDetails({
  inquiry: r,
  onImageClick,
}: {
  inquiry: InquiryRecord;
  onImageClick: (url: string) => void;
}) {
  const addonStr = Array.isArray(r.addons) && r.addons.length ? r.addons.join(', ') : '—';
  const imgs = Array.isArray(r.inspirationImages) ? r.inspirationImages : [];

  const sec = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: '1rem' }}>
      <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{title}</h4>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sec(
        'Event Details',
        <>
          <div>
            Type: <span style={{ color: 'var(--text)' }}>{r.eventType || '—'}</span>
          </div>
          <div>
            Date: <span style={{ color: 'var(--text)' }}>{r.eventDate || '—'}</span>
          </div>
          <div>
            Guests: <span style={{ color: 'var(--text)' }}>{r.guestCount ?? '—'}</span>
          </div>
          <div>
            Name: <span style={{ color: 'var(--text)' }}>{r.clientName || '—'}</span>
          </div>
          <div>
            Email: <span style={{ color: 'var(--text)' }}>{r.clientEmail || '—'}</span>
          </div>
        </>
      )}
      {sec(
        'Venue Preferences',
        <>
          <div>
            Venue type: <span style={{ color: 'var(--text)' }}>{r.venueType || '—'}</span>
          </div>
          <div>
            Hall: <span style={{ color: 'var(--text)' }}>{r.hallPreference || '—'}</span>
          </div>
          <div>
            Seating: <span style={{ color: 'var(--text)' }}>{r.seatingStyle || '—'}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            Notes: <span style={{ color: 'var(--text)' }}>{r.seatingNotes || '—'}</span>
          </div>
        </>
      )}
      {sec(
        'Food & Services',
        <>
          <div>
            Meal: <span style={{ color: 'var(--text)' }}>{r.mealPreference || '—'}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            Add-ons: <span style={{ color: 'var(--text)' }}>{addonStr}</span>
          </div>
        </>
      )}
      {sec(
        'Budget & Notes',
        <>
          <div>
            Budget: <span style={{ color: 'var(--text)' }}>{r.budgetRange || '—'}</span>
          </div>
          <div>
            Lighting: <span style={{ color: 'var(--text)' }}>{r.lightingPreference || '—'}</span>
          </div>
          <div>
            Decoration: <span style={{ color: 'var(--text)' }}>{r.decorationPreference || '—'}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            Requests: <span style={{ color: 'var(--text)' }}>{r.specialRequests || '—'}</span>
          </div>
        </>
      )}
      <div className="md:col-span-2">
        <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Inspiration Images</h4>
        {imgs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>—</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {imgs.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => onImageClick(url)}
                style={{ padding: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in', background: 'none' }}
              >
                <img src={url} alt="" style={{ width: 88, height: 88, objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditInquiryForm({
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.9rem',
  };

  const set = (patch: Partial<EditDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full name</span>
          <input style={inputStyle} value={draft.clientName} onChange={(e) => set({ clientName: e.target.value })} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</span>
          <input style={inputStyle} type="email" value={draft.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Event date</span>
          <input style={inputStyle} type="date" value={draft.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Guests</span>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={draft.guestCount || ''}
            onChange={(e) => set({ guestCount: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Event type</div>
        <div className="ev-filter-tabs" style={{ flexWrap: 'wrap' }}>
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`ev-filter-tab ${draft.eventType === t ? 'ev-active' : ''}`}
              onClick={() => set({ eventType: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Venue type</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
          {VENUE_TYPES.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => set({ venueType: v.label })}
              style={{
                padding: '8px 6px',
                borderRadius: 10,
                border: `1px solid ${draft.venueType === v.label ? 'var(--accent, #9333ea)' : 'var(--border)'}`,
                background: draft.venueType === v.label ? 'rgba(192,132,252,0.12)' : 'var(--surface)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--text)',
              }}
            >
              <div>{v.icon}</div>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hall preference</span>
        <input style={inputStyle} value={draft.hallPreference} onChange={(e) => set({ hallPreference: e.target.value })} />
      </label>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Seating style</div>
        <div className="ev-filter-tabs" style={{ flexWrap: 'wrap' }}>
          {SEATING_STYLES.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`ev-filter-tab ${draft.seatingStyle === s.label ? 'ev-active' : ''}`}
              onClick={() => set({ seatingStyle: s.label })}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seating notes</span>
        <textarea style={{ ...inputStyle, minHeight: 72 }} value={draft.seatingNotes} onChange={(e) => set({ seatingNotes: e.target.value })} />
      </label>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Meal preference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
          {MEAL_OPTIONS.map((m) => {
            const mealPicked =
              draft.mealPreference === m.label || draft.mealPreference.startsWith(`${m.label} — `);
            return (
            <button
              key={m.label}
              type="button"
              onClick={() => set({ mealPreference: m.label })}
              style={{
                textAlign: 'left',
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${mealPicked ? 'var(--accent, #9333ea)' : 'var(--border)'}`,
                background: mealPicked ? 'rgba(192,132,252,0.1)' : 'var(--surface)',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ marginRight: 6 }} aria-hidden>{m.icon}</span>
              <strong>{m.label}</strong>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.description}</div>
            </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Add-ons</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
          {ADDONS.map((a) => {
            const selected = draft.addons.includes(a.label);
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  const next = new Set(draft.addons);
                  if (next.has(a.label)) next.delete(a.label);
                  else next.add(a.label);
                  set({ addons: Array.from(next) });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${selected ? 'var(--accent, #9333ea)' : 'var(--border)'}`,
                  background: selected ? 'rgba(192,132,252,0.08)' : 'var(--surface)',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontSize: '0.8rem',
                }}
              >
                <span>{a.icon}</span> {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Budget range</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BUDGETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set({ budgetRange: b })}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${draft.budgetRange === b ? 'var(--accent, #9333ea)' : 'var(--border)'}`,
                background: draft.budgetRange === b ? 'rgba(192,132,252,0.1)' : 'var(--surface)',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '0.85rem',
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Lighting</div>
        <div className="ev-filter-tabs" style={{ flexWrap: 'wrap' }}>
          {LIGHTING.map((l) => (
            <button
              key={l}
              type="button"
              className={`ev-filter-tab ${draft.lightingPreference === l ? 'ev-active' : ''}`}
              onClick={() => set({ lightingPreference: l })}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Decoration preference</span>
        <input style={inputStyle} value={draft.decorationPreference} onChange={(e) => set({ decorationPreference: e.target.value })} />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Special requests</span>
        <textarea style={{ ...inputStyle, minHeight: 88 }} value={draft.specialRequests} onChange={(e) => set({ specialRequests: e.target.value })} />
      </label>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Inspiration image URLs (one per line)</div>
        <textarea
          style={{ ...inputStyle, minHeight: 100, fontFamily: 'monospace', fontSize: '0.8rem' }}
          value={draft.inspirationImages.join('\n')}
          onChange={(e) =>
            set({
              inspirationImages: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="ev-modal-close" style={{ padding: '10px 18px', borderRadius: 8 }} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="ev-modal-btn"
          style={{
            background: 'linear-gradient(135deg, #c084fc, #f472b6)',
            border: 'none',
            color: '#fff',
          }}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
