/**
 * Venue Detail Page - Public venue detail at /venues/:venueId
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Building2, Box } from 'lucide-react';
import { getPublicVenue } from '../home/public.api';
import type { VenueTemplate } from '../booking/booking.types';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/Logo';
import { publicAssetUrl } from '@/lib/publicAssetUrl';
import { toYouTubeEmbedUrl } from '@/lib/youtubeEmbed';
import './VenueDetailPage.css';

// Unsplash placeholder images by category (search terms: banquet hall, wedding venue, etc.)
const CAROUSEL_IMAGES: Record<string, string[]> = {
  'Banquet Hall': [
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200',
    'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200',
  ],
  Outdoor: [
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200',
    'https://images.unsplash.com/photo-1530103862676-8b0f9afa0f1d?w=1200',
  ],
  Conference: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
    'https://images.unsplash.com/photo-1575320181282-9afab399332c?w=1200',
  ],
  Intimate: [
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200',
    'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200',
  ],
  Heritage: [
    'https://images.unsplash.com/photo-1548013146-7247f659dca0?w=1200',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200',
  ],
  default: [
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200',
  ],
};

const AMENITIES_BY_CATEGORY: Record<string, string[]> = {
  'Banquet Hall': ['Grand ballroom', 'Stage', 'AV equipment', 'Catering kitchen', 'Parking'],
  Outdoor: ['Garden space', 'Marquee option', 'Natural scenery', 'Parking'],
  Conference: ['Meeting rooms', 'AV equipment', 'Wi-Fi', 'Catering'],
  Intimate: ['Private dining', 'Cozy atmosphere', 'Personal service'],
  Heritage: ['Historic charm', 'Architecture', 'Photo opportunities'],
  default: ['Full service', 'Flexible layout', 'Event coordination'],
};

function getUser(): { role: string } | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return { role: u?.role ?? 'planner' };
  } catch {
    return null;
  }
}

export function VenueDetailPage({ embedded }: { embedded?: boolean } = {}) {
  const { venueId } = useParams<{ venueId: string }>();
  const { toggle } = useTheme();
  const [venue, setVenue] = useState<VenueTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!venueId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicVenue(venueId);
        if (!cancelled) setVenue(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Venue not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [venueId]);

  const images = venue
    ? venue.galleryImages?.length
      ? venue.galleryImages.map((u) => publicAssetUrl(u))
      : CAROUSEL_IMAGES[venue.category] ?? CAROUSEL_IMAGES.default
    : [];
  const embedUrl = venue?.videoUrl ? toYouTubeEmbedUrl(venue.videoUrl) : null;

  useEffect(() => {
    setCarouselIndex(0);
  }, [venue?.id, images.length]);

  const amenities = venue ? (AMENITIES_BY_CATEGORY[venue.category] ?? AMENITIES_BY_CATEGORY.default) : [];
  const user = getUser();
  const isPlanner = user?.role === 'planner';
  const showEditButton = isPlanner && venue?.modelRef;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const isLoggedIn = !!token;

  const prevSlide = () => setCarouselIndex((i) => (i - 1 + images.length) % images.length);
  const nextSlide = () => setCarouselIndex((i) => (i + 1) % images.length);

  if (loading) {
    return (
      <div className="venue-detail-page" style={{ background: 'var(--bg)', paddingTop: embedded ? 0 : undefined }}>
        {!embedded && (
          <nav className="venue-detail-nav">
            <Logo to="/" />
            <ul className="venue-detail-nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/venues" className="active">Venues</Link></li>
            </ul>
            <div className="venue-detail-nav-right">
              <button type="button" className="venue-detail-theme-toggle" onClick={toggle} aria-label="Toggle theme" />
              <Link to="/login" className="venue-detail-btn-nav">Login</Link>
            </div>
          </nav>
        )}
        <div className="venue-detail-loading">
          <Loader2 className="venue-detail-spinner" size={40} />
          <p>Loading venue...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="venue-detail-page" style={{ background: 'var(--bg)', paddingTop: embedded ? 0 : undefined }}>
        {!embedded && (
          <nav className="venue-detail-nav">
            <Logo to="/" />
            <ul className="venue-detail-nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/venues" className="active">Venues</Link></li>
            </ul>
            <div className="venue-detail-nav-right">
              <button type="button" className="venue-detail-theme-toggle" onClick={toggle} aria-label="Toggle theme" />
              <Link to="/login" className="venue-detail-btn-nav">Login</Link>
            </div>
          </nav>
        )}
        <div className="venue-detail-error">
          <p>{error ?? 'Venue not found'}</p>
          <Link to="/venues" className="venue-detail-back">← Back to Venues</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="venue-detail-page" style={{ background: 'var(--bg)', paddingTop: embedded ? 0 : undefined }}>
      {!embedded && (
        <nav className="venue-detail-nav">
          <Logo to="/" />
          <ul className="venue-detail-nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/venues" className="active">Venues</Link></li>
          </ul>
          <div className="venue-detail-nav-right">
            <button type="button" className="venue-detail-theme-toggle" onClick={toggle} aria-label="Toggle theme" />
            {isLoggedIn ? (
              <Link to="/events" className="venue-detail-btn-nav">Dashboard</Link>
            ) : (
              <Link to="/login" className="venue-detail-btn-nav">Login</Link>
            )}
          </div>
        </nav>
      )}

      <main className="venue-detail-main">
        {/* Hero carousel */}
        <div className="venue-detail-hero">
          <div className="venue-detail-carousel">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={`venue-detail-slide ${i === carouselIndex ? 'active' : ''}`}
                style={{ backgroundImage: `url(${src})` }}
              />
            ))}
          </div>
          <button type="button" className="venue-detail-carousel-prev" onClick={prevSlide} aria-label="Previous">
            <ChevronLeft size={24} />
          </button>
          <button type="button" className="venue-detail-carousel-next" onClick={nextSlide} aria-label="Next">
            <ChevronRight size={24} />
          </button>
          <div className="venue-detail-carousel-dots">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`venue-detail-dot ${i === carouselIndex ? 'active' : ''}`}
                onClick={() => setCarouselIndex(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {embedUrl && (
          <section className="venue-detail-video-band">
            <div className="venue-detail-video-inner">
              <h2 className="venue-detail-video-title">Promo video</h2>
              <div className="venue-detail-video-wrap">
                <iframe
                  title="Venue promo video"
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )}

        <div className="venue-detail-content">
        <div className="venue-detail-header">
          <Link to="/venues" className="venue-detail-back-link">← Back to Venues</Link>
          <h1 className="venue-detail-title">{venue.name}</h1>
          <div className="venue-detail-badges">
            <span className="venue-detail-category">{venue.category}</span>
            <span className="venue-detail-capacity">
              <Building2 size={16} /> Up to {venue.capacity} guests
            </span>
          </div>
          <p className="venue-detail-price">Price range: Contact for pricing</p>
        </div>

          {venue.description && (
            <section className="venue-detail-section">
              <h2>About</h2>
              <p className="venue-detail-desc">{venue.description}</p>
            </section>
          )}

          <section className="venue-detail-section">
            <h2>Amenities & Features</h2>
            <ul className="venue-detail-amenities">
              {amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>

          {showEditButton && (
            <div className="venue-detail-actions">
              <Link to="/events" className="venue-detail-edit-btn">
                <Box size={20} />
                Edit in 3D Editor
              </Link>
              <p className="venue-detail-edit-hint">Create an event with this venue to design in the 3D editor.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
