import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import * as requirementsApi from './requirements.api';
import './RequirementsFormPage.css';

interface FormData {
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
}

const STEP_LABELS = ['About you', 'Venue', 'Food & extras', 'Budget'] as const;

const EVENT_TYPES = ['Wedding', 'Mehndi', 'Birthday', 'Corporate', 'Other'] as const;

const VENUE_TYPES = [
  { label: 'Banquet Hall', icon: '🏛️', desc: 'Indoor formal hall' },
  { label: 'Marquee / Tent', icon: '⛺', desc: 'Covered outdoor tent' },
  { label: 'Farmhouse', icon: '🌾', desc: 'Open rustic grounds' },
  { label: 'Hotel Ballroom', icon: '🏨', desc: 'Luxury hotel venue' },
  { label: 'Outdoor Garden', icon: '🌳', desc: 'Open-air greenery' },
  { label: 'Rooftop', icon: '🌆', desc: 'Elevated city views' },
  { label: 'Beach / Resort', icon: '🏖️', desc: 'Waterside setting' },
  { label: 'Custom / Other', icon: '📍', desc: 'Something unique' },
] as const;

const SEATING_STYLES = [
  { label: 'Banquet', icon: '🪑' },
  { label: 'Theatre', icon: '🎭' },
  { label: 'Cocktail', icon: '🍸' },
  { label: 'Custom', icon: '✏️' },
] as const;

const MEAL_OPTIONS = [
  { label: 'Basic', price: 'From Rs. 800/head', desc: 'Simple served meal' },
  { label: 'Standard Buffet', price: 'From Rs. 1,500/head', desc: 'Popular variety' },
  { label: 'Premium Buffet', price: 'From Rs. 2,500/head', desc: 'Gourmet selection' },
  { label: 'Custom Menu', price: 'Price on request', desc: 'Tailored to you' },
] as const;

const ADDONS = [
  { label: 'Special lighting', icon: '💡' },
  { label: 'Custom decorations', icon: '🎨' },
  { label: 'Extra seating', icon: '🪑' },
  { label: 'Premium stage design', icon: '🎪' },
  { label: 'Floral arrangements', icon: '🌸' },
  { label: 'Photography', icon: '📸' },
  { label: 'Videography', icon: '🎥' },
  { label: 'Sound system', icon: '🔊' },
] as const;

const BUDGETS = [
  'Under Rs. 50,000',
  'Rs. 50,000 – 150,000',
  'Rs. 150,000 – 300,000',
  'Rs. 300,000 – 500,000',
  'Above Rs. 500,000',
] as const;

const LIGHTING = ['Basic', 'Fairy Lights', 'LED', 'Chandeliers', 'Custom'] as const;

export function RequirementsFormPage() {
  const { token } = useParams<{ token: string }>();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [themeIsDark, setThemeIsDark] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [progressHidden, setProgressHidden] = useState(false);

  const [meta, setMeta] = useState<{ eventName: string; plannerName: string; isSubmitted: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  const [form, setForm] = useState<FormData>({
    clientName: '',
    clientEmail: '',
    eventType: 'Wedding',
    eventDate: '',
    guestCount: 200,
    venueType: '',
    hallPreference: '',
    seatingStyle: 'Banquet',
    seatingNotes: '',
    mealPreference: 'Standard Buffet',
    addons: ['Special lighting', 'Premium stage design', 'Photography'],
    budgetRange: 'Rs. 150,000 – 300,000',
    lightingPreference: 'Fairy Lights',
    decorationPreference: '',
    specialRequests: '',
  });

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTheme = () => {
    setThemeIsDark((d) => !d);
  };

  const themeButtonLabel = themeIsDark ? '☀️ Light mode' : '🌙 Dark mode';

  const progressNodes = useMemo(() => {
    return STEP_LABELS.map((label, i) => {
      const n = i + 1;
      const state = currentStep > n ? 'done' : currentStep === n ? 'active' : 'inactive';
      return { n, label, state };
    });
  }, [currentStep]);

  const animateCard = useCallback((dir: 'forward' | 'backward' | 'none') => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--slide-from', dir === 'forward' ? '20px' : dir === 'backward' ? '-20px' : '0px');
    card.classList.remove('step-anim');
    // trigger reflow
    void card.offsetWidth;
    card.classList.add('step-anim');
  }, []);

  const goStep = (n: number, dir: 'forward' | 'backward') => {
    setCurrentStep(n);
    animateCard(dir);
  };

  const submitForm = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await requirementsApi.submitRequirementsPublic(token, form);
      setApprovedSuccess(true);
      setProgressHidden(true);
      animateCard('none');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await requirementsApi.getRequirementsPublic(token);
        if (cancelled) return;
        setMeta({
          eventName: data.meta.eventName,
          plannerName: data.meta.plannerName,
          isSubmitted: data.meta.isSubmitted,
        });
        if (data.meta.isSubmitted) {
          setApprovedSuccess(true);
          setProgressHidden(true);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.error || 'Invalid link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const successTitle = useMemo(() => {
    const name = form.clientName?.trim() || 'there';
    return `Thank you, ${name}!`;
  }, [form.clientName]);

  const successMeta = useMemo(() => {
    const eventType = form.eventType || 'Event';
    const budget = form.budgetRange || 'Budget TBD';
    return `${eventType} · ${form.guestCount} guests · ${budget}`;
  }, [form.eventType, form.guestCount, form.budgetRange]);

  if (loading) {
    return (
      <div className="req-theme">
        <div className="ds-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`req-theme ${themeIsDark ? '' : 'light'}`}>
        <div className="ds-root">
          <div className="ds-header">
            <div className="ds-logo">✦ Dream<span>Stage</span></div>
            <button className="theme-toggle" type="button" onClick={toggleTheme}>
              {themeButtonLabel}
            </button>
          </div>

          <div className="card">
            <p className="step-heading">Unable to open form</p>
            <p className="step-sub">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`req-theme ${themeIsDark ? '' : 'light'}`}>
      <div className="ds-root" id="app">
        <div className="ds-header">
          <div className="ds-logo">✦ Dream<span>Stage</span></div>
          <button className="theme-toggle" type="button" onClick={toggleTheme}>
            {themeButtonLabel}
          </button>
        </div>

        {!progressHidden && (
          <div className="progress-bar" id="progressBar">
            {progressNodes.map((s) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div className="prog-step">
                  <div className={`prog-circle ${s.state}`}>{s.state === 'done' ? '✓' : s.n}</div>
                  <div className={`prog-label ${s.state === 'active' ? 'active-lbl' : ''}`}>{s.label}</div>
                </div>
                {s.n < 4 && <div className={`prog-line ${currentStep > s.n ? 'done-line' : ''}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="card step-anim" id="stepCard" ref={cardRef} style={{ ['--slide-from' as any]: '20px' }}>
          {/* STEP 1 */}
          <div className={`step ${!approvedSuccess && currentStep === 1 ? 'active' : ''}`} id="step-1">
            <p className="step-heading">Tell us about yourself</p>
            <p className="step-sub">Step 1 of 4 — Your basic event info</p>

            <div className="row2">
              <div className="field-group">
                <label className="field-label">Full name *</label>
                <input
                  className="ds-input"
                  id="clientName"
                  placeholder="Your name"
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Email address *</label>
                <input
                  className="ds-input"
                  id="clientEmail"
                  type="email"
                  placeholder="you@email.com"
                  value={form.clientEmail}
                  onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Event type</label>
              <div className="pills" id="eventTypePills">
                {EVENT_TYPES.map((t) => (
                  <div
                    key={t}
                    className={`pill ${form.eventType === t ? 'selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, eventType: t }))}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="row2">
              <div className="field-group">
                <label className="field-label">Preferred event date</label>
                <input
                  className="ds-input"
                  id="eventDate"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Number of guests</label>
                <input
                  className="ds-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 250"
                  value={form.guestCount || ''}
                  onChange={(e) => set('guestCount', parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div className="btn-row">
              <span />
              <button className="btn-next" type="button" onClick={() => goStep(2, 'forward')}>
                Next →
              </button>
            </div>
          </div>

          {/* STEP 2 */}
          <div className={`step ${!approvedSuccess && currentStep === 2 ? 'active' : ''}`} id="step-2">
            <p className="step-heading">Your venue preferences</p>
            <p className="step-sub">Step 2 of 4 — Where the magic happens</p>

            <div className="field-group">
              <label className="field-label">Venue type</label>
              <div className="venue-grid" id="venueGrid">
                {VENUE_TYPES.map((v) => (
                  <div
                    key={v.label}
                    className={`venue-card ${form.venueType === v.label ? 'selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, venueType: v.label }))}
                  >
                    <div className="venue-icon">{v.icon}</div>
                    <div className="venue-name">{v.label}</div>
                    <div className="venue-desc">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Preferred hall / marquee name</label>
              <input
                className="ds-input"
                id="hallPreference"
                placeholder="e.g. Pearl Continental Ballroom, outdoor garden..."
                value={form.hallPreference}
                onChange={(e) => setForm((f) => ({ ...f, hallPreference: e.target.value }))}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Seating style</label>
              <div className="pills" id="seatPills">
                {SEATING_STYLES.map((s) => (
                  <div
                    key={s.label}
                    className={`pill ${form.seatingStyle === s.label ? 'selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, seatingStyle: s.label }))}
                  >
                    <span className="seat-icon">{s.icon}</span> {s.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Special seating requirements</label>
              <textarea
                className="ds-input"
                id="seatingNotes"
                rows={3}
                placeholder="e.g. Reserved front row for family, wheelchair accessible aisle..."
                value={form.seatingNotes}
                onChange={(e) => setForm((f) => ({ ...f, seatingNotes: e.target.value }))}
              />
            </div>

            <div className="btn-row">
              <button className="btn-prev" type="button" onClick={() => goStep(1, 'backward')}>
                ← Previous
              </button>
              <button className="btn-next" type="button" onClick={() => goStep(3, 'forward')}>
                Next →
              </button>
            </div>
          </div>

          {/* STEP 3 */}
          <div className={`step ${!approvedSuccess && currentStep === 3 ? 'active' : ''}`} id="step-3">
            <p className="step-heading">Food & extras</p>
            <p className="step-sub">Step 3 of 4 — Catering and add-on services</p>

            <div className="field-group">
              <label className="field-label">Meal preference</label>
              <div className="meal-cards">
                {MEAL_OPTIONS.map((m) => (
                  <div
                    key={m.label}
                    className={`meal-card ${form.mealPreference === m.label ? 'selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, mealPreference: m.label }))}
                  >
                    <div className="meal-title">{m.label}</div>
                    <div className="meal-desc">{m.desc}</div>
                    <div className="meal-price">{m.price}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '1rem' }}>
              <label className="field-label">Add-on services</label>
              <div className="addon-grid">
                {ADDONS.map((a) => {
                  const selected = form.addons.includes(a.label);
                  return (
                    <div
                      key={a.label}
                      className={`addon-item ${selected ? 'selected' : ''}`}
                      onClick={() =>
                        setForm((f) => {
                          const next = new Set(f.addons);
                          if (next.has(a.label)) next.delete(a.label);
                          else next.add(a.label);
                          return { ...f, addons: Array.from(next) };
                        })
                      }
                    >
                      <div className="addon-check">
                        {selected ? <span className="addon-check-mark">✓</span> : null}
                      </div>
                      <span className="addon-icon">{a.icon}</span>
                      <span className="addon-label">{a.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-prev" type="button" onClick={() => goStep(2, 'backward')}>
                ← Previous
              </button>
              <button className="btn-next" type="button" onClick={() => goStep(4, 'forward')}>
                Next →
              </button>
            </div>
          </div>

          {/* STEP 4 */}
          <div className={`step ${!approvedSuccess && currentStep === 4 ? 'active' : ''}`} id="step-4">
            <p className="step-heading">Budget & final notes</p>
            <p className="step-sub">Step 4 of 4 — Last details before we get started</p>

            <div className="field-group">
              <label className="field-label">Budget range</label>
              <div className="pills" id="budgetPills" style={{ flexDirection: 'column', gap: 6 }}>
                {BUDGETS.map((b) => (
                  <div
                    key={b}
                    className={`pill budget-pill ${form.budgetRange === b ? 'selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, budgetRange: b }))}
                  >
                    {b}
                  </div>
                ))}
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '1rem' }}>
              <label className="field-label">Lighting preference</label>
              <div className="pills" id="lightPills">
                {LIGHTING.map((l) => (
                  <div
                    key={l}
                    className={`pill ${form.lightingPreference === l ? 'selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, lightingPreference: l }))}
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Decoration preference</label>
              <input
                className="ds-input"
                id="decorationPreference"
                placeholder="e.g. Rustic floral, modern minimalist, royal gold..."
                value={form.decorationPreference}
                onChange={(e) => setForm((f) => ({ ...f, decorationPreference: e.target.value }))}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Special requests</label>
              <textarea
                className="ds-input"
                id="specialRequests"
                rows={3}
                placeholder="Anything else your planner should know..."
                value={form.specialRequests}
                onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
              />
            </div>

            {meta?.eventName && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                Submitting for <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{meta.eventName}</span>
              </div>
            )}

            <div className="btn-row">
              <button className="btn-prev" type="button" onClick={() => goStep(3, 'backward')}>
                ← Previous
              </button>
              <button
                className="btn-next"
                type="button"
                onClick={submitForm}
                disabled={isSubmitting}
                style={isSubmitting ? { opacity: 0.75, transform: 'none', cursor: 'not-allowed' } : undefined}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Requirements →'}
              </button>
            </div>
          </div>

          {/* SUCCESS */}
          <div className={`step ${approvedSuccess ? 'active' : ''}`} id="step-success">
            <div className="success-screen">
              <div className="success-icon">✓</div>
              <p className="success-title" id="successTitle">
                {successTitle}
              </p>
              <p className="success-sub">
                Your requirements have been submitted.
                <br />
                Your planner will review everything and get back to you shortly.
              </p>
              <div className="success-meta">
                <p className="success-meta-label">Submitted for</p>
                <p className="success-meta-value" id="successMeta">
                  {successMeta}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

