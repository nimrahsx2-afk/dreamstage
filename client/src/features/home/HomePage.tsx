/**
 * Public Homepage - Pixel-perfect recreation of dreamstage (3).html
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/Logo';
import './HomePage.css';

function isLoggedIn(): boolean {
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

export function HomePage() {
  const { toggle } = useTheme();
  const loggedIn = isLoggedIn();
  const budgetVizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = budgetVizRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const bars = e.target.querySelectorAll('.home-budget-bar-fill');
            bars.forEach((bar) => {
              (bar as HTMLElement).style.animation = 'none';
              (bar as HTMLElement).offsetHeight; // trigger reflow
              (bar as HTMLElement).style.animation = '';
            });
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Nav */}
      <nav className="home-nav">
        <Logo to="/" />
        <ul className="home-nav-links">
          <li><a href="#modules">Modules</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#roles">For you</a></li>
          <li><Link to="/venues">Venues</Link></li>
        </ul>
        <div className="home-nav-right">
          <button
            type="button"
            className="home-theme-toggle"
            onClick={toggle}
            aria-label="Toggle theme"
          />
          {loggedIn ? (
            <Link to="/events" className="home-btn-nav">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="home-btn-nav">
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-bg">
          <div className="home-orb home-orb-1" aria-hidden />
          <div className="home-orb home-orb-2" aria-hidden />
          <div className="home-orb home-orb-3" aria-hidden />
          <div className="home-orb home-orb-4" aria-hidden />
          <div className="home-orb home-orb-5" aria-hidden />
        </div>

        <div className="home-hero-badge">
          <div className="home-badge-dot" />
          3D Event Planning Platform
        </div>

        <h1>Design your <em>dream event</em>, before the day arrives</h1>

        <p className="home-hero-sub">
          Walk through your venue in 3D, manage your budget in real time, and get client sign-off — all in one place. No spreadsheets. No email chains.
        </p>

        <div className="home-hero-ctas">
          <Link to="/register" className="home-btn-primary">
            Start for free
          </Link>
          <a href="#how" className="home-btn-secondary">
            ▶ Watch demo
          </a>
        </div>

        <div className="home-hero-mockup">
          <div className="home-mockup-bar">
            <div className="home-dot home-dot-r" />
            <div className="home-dot home-dot-y" />
            <div className="home-dot home-dot-g" />
          </div>
          <div className="home-mockup-content">
            <div className="home-mock-sidebar">
              <div className="home-mock-nav-item active"><span>🏛️</span> 3D Editor</div>
              <div className="home-mock-nav-item"><span>💰</span> Budget</div>
              <div className="home-mock-nav-item"><span>✅</span> Approvals</div>
              <div className="home-mock-nav-item"><span>📦</span> Inventory</div>
              <div className="home-mock-nav-item"><span>📋</span> Projects</div>
            </div>
            <div className="home-mock-main">
              <div className="home-mock-header-row">
                <div className="home-mock-title">Grand Ballroom — Winter Gala</div>
                <div className="home-mock-pills">
                  <div className="home-mock-pill home-mock-pill-rose">Editing</div>
                  <div className="home-mock-pill home-mock-pill-mint">Budget synced</div>
                </div>
              </div>
              <div className="home-mock-3d-area">
                <div className="home-furn home-furn-1" aria-hidden />
                <div className="home-furn home-furn-2" aria-hidden />
                <div className="home-furn home-furn-3" aria-hidden />
                <div className="home-furn home-furn-4" aria-hidden />
                <div className="home-mock-floor" aria-hidden />
                <div className="home-mock-3d-inner">
                  <div className="home-mock-3d-label">✦ 3D Venue Editor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="home-stats">
        <div className="home-stats-inner">
          <div>
            <div className="home-stat-num">5</div>
            <div className="home-stat-label">Integrated modules</div>
          </div>
          <div>
            <div className="home-stat-num">∞</div>
            <div className="home-stat-label">Décor combinations</div>
          </div>
          <div>
            <div className="home-stat-num">0</div>
            <div className="home-stat-label">Spreadsheets needed</div>
          </div>
          <div>
            <div className="home-stat-num">1</div>
            <div className="home-stat-label">Platform for everything</div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <section className="home-modules home-section" id="modules">
        <div className="home-modules-inner">
          <div className="home-modules-top">
            <div className="home-section-label">Platform modules</div>
            <h2>Every tool you need, finally in one place</h2>
          </div>
          <div className="home-modules-grid">
            <div className="home-module-card home-card-rose">
              <div className="home-module-icon home-icon-rose">🏛️</div>
              <h3>3D Venue Editor</h3>
              <p>Drag and drop furniture, lighting, and décor inside photorealistic 3D venue environments. No specialist software. Just your browser.</p>
            </div>
            <div className="home-module-card home-card-lavender">
              <div className="home-module-icon home-icon-lavender">💰</div>
              <h3>Live Budget Engine</h3>
              <p>Every design decision instantly updates your cost estimate. Never lose track of spend — your budget is always in sync with your layout.</p>
            </div>
            <div className="home-module-card home-card-mint">
              <div className="home-module-icon home-icon-mint">✅</div>
              <h3>Client Approval Flow</h3>
              <p>Share a private link with your client. They can view the 3D layout, leave comments, and submit a formal approval with an immutable audit trail.</p>
            </div>
            <div className="home-module-card home-card-peach">
              <div className="home-module-icon home-icon-peach">📦</div>
              <h3>Décor Inventory</h3>
              <p>Real-time stock tracking prevents over-commitment. The editor warns you instantly if you try to place more items than are available.</p>
            </div>
            <div className="home-module-card home-card-sky">
              <div className="home-module-icon home-icon-sky">📅</div>
              <h3>Venue Availability</h3>
              <p>Conflict-detection engine automatically blocks double-bookings. Every venue, every date — tracked and managed without manual checking.</p>
            </div>
            <div className="home-module-card home-card-lemon">
              <div className="home-module-icon home-icon-lemon">📋</div>
              <h3>Project Dashboard</h3>
              <p>Run multiple events simultaneously. Smart checklists auto-prioritize by days remaining, so you always know what needs attention next.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="home-how home-section" id="how">
        <div className="home-how-inner">
          <div>
            <div className="home-section-label">How it works</div>
            <h2>From blank canvas to signed-off in four steps</h2>
            <div className="home-how-steps">
              <div className="home-step">
                <div className="home-step-num">1</div>
                <div className="home-step-content">
                  <h4>Pick your venue template</h4>
                  <p>Choose from professionally modelled 3D venues. Instantly see the real space your event will fill.</p>
                </div>
              </div>
              <div className="home-step">
                <div className="home-step-num">2</div>
                <div className="home-step-content">
                  <h4>Design & customize</h4>
                  <p>Drag furniture, lighting, and décor into place. Watch your budget update live with every decision.</p>
                </div>
              </div>
              <div className="home-step">
                <div className="home-step-num">3</div>
                <div className="home-step-content">
                  <h4>Share with your client</h4>
                  <p>Send a private link. Your client walks through the layout, drops comments, and approves — no account needed.</p>
                </div>
              </div>
              <div className="home-step">
                <div className="home-step-num">4</div>
                <div className="home-step-content">
                  <h4>Lock & deliver</h4>
                  <p>Approval locks the design and generates a timestamped record. Execute the event with confidence.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="home-how-visual" ref={budgetVizRef}>
            <div className="home-budget-viz">
              <div className="home-budget-title">Live Budget Breakdown</div>

              <div className="home-budget-bar-label"><span>Venue rental</span><span>£4,200</span></div>
              <div className="home-budget-bar-track"><div className="home-budget-bar-fill home-bar-rose" style={{ width: '78%' }} /></div>

              <div className="home-budget-bar-label"><span>Florals & décor</span><span>£2,600</span></div>
              <div className="home-budget-bar-track"><div className="home-budget-bar-fill home-bar-lavender" style={{ width: '58%' }} /></div>

              <div className="home-budget-bar-label"><span>Catering</span><span>£3,100</span></div>
              <div className="home-budget-bar-track"><div className="home-budget-bar-fill home-bar-mint" style={{ width: '68%' }} /></div>

              <div className="home-budget-bar-label"><span>AV & lighting</span><span>£1,850</span></div>
              <div className="home-budget-bar-track"><div className="home-budget-bar-fill home-bar-peach" style={{ width: '42%' }} /></div>

              <div className="home-budget-bar-label"><span>Staffing</span><span>£1,200</span></div>
              <div className="home-budget-bar-track"><div className="home-budget-bar-fill home-bar-sky" style={{ width: '28%' }} /></div>

              <div className="home-budget-total">
                <div>
                  <div className="home-budget-total-label">Total estimate</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated just now</div>
                </div>
                <div className="home-budget-total-val">£12,950</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="home-roles home-section" id="roles">
        <div className="home-roles-inner">
          <div className="home-roles-top">
            <div className="home-section-label">Built for everyone</div>
            <h2>Three roles, one seamless platform</h2>
          </div>
          <div className="home-roles-grid">
            <div className="home-role-card">
              <div className="home-role-emoji">🎯</div>
              <h3>Event Planner</h3>
              <ul>
                <li>Create and manage multiple event projects</li>
                <li>Design 3D layouts and track live budget</li>
                <li>Share password-protected client links</li>
                <li>Manage checklists and day-of timelines</li>
                <li>Full vendor payment logging</li>
              </ul>
            </div>
            <div className="home-role-card">
              <div className="home-role-emoji">💫</div>
              <h3>Client</h3>
              <ul>
                <li>Access via unique URL — no sign-up required</li>
                <li>Walkthrough and orbit the 3D venue</li>
                <li>Leave timestamped comments on designs</li>
                <li>Submit formal design approval</li>
                <li>View transparent budget summary</li>
              </ul>
            </div>
            <div className="home-role-card">
              <div className="home-role-emoji">⚙️</div>
              <h3>Admin</h3>
              <ul>
                <li>Manage the venue template library</li>
                <li>Set décor stock quantities and pricing</li>
                <li>Monitor all venue bookings platform-wide</li>
                <li>Moderate planner accounts</li>
                <li>Resolve booking conflicts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta-section">
        <div className="home-section-label">Get started</div>
        <h2>Your next event deserves to be <em>seen</em> before it happens</h2>
        <p>Stop juggling apps, emails, and spreadsheets. DreamStage brings everything together so you can focus on creating unforgettable experiences.</p>
        <div className="home-cta-pills">
          <div className="home-cta-pill home-cta-pill-1">✓ No 3D experience needed</div>
          <div className="home-cta-pill home-cta-pill-2">✓ Free for event planners</div>
          <div className="home-cta-pill home-cta-pill-3">✓ Client-ready from day one</div>
        </div>
        <Link to="/register" className="home-btn-primary" style={{ fontSize: '1rem', padding: '1rem 2.8rem' }}>
          Request early access →
        </Link>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <Logo className="home-footer-logo" />
        <div className="home-footer-note">3D Event Planning & Venue Visualization Platform · Final Year Project</div>
      </footer>
    </div>
  );
}
