// Login Page - Pixel-perfect recreation of dreamstage-login.html

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/services/api';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/Logo';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { toggle: toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'planner' | 'admin'>('planner');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    const commonTypos: Record<string, string> = {
      'gamil.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'yaho.com': 'yahoo.com',
      'outlok.com': 'outlook.com',
    };
    const domain = formData.email.trim().split('@')[1]?.toLowerCase();
    if (domain && commonTypos[domain]) {
      setError(`Did you mean ${formData.email.trim().split('@')[0]}@${commonTypos[domain]}?`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login({
        ...formData,
        role: selectedRole,
      });
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate(user.role === 'admin' ? '/admin' : '/events');
    } catch (err: unknown) {
      console.error('Login failed:', err);
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePassword = () => setShowPassword((prev) => !prev);

  const emailLower = formData.email.trim().toLowerCase();
  const emailLooksLikeAdmin =
    emailLower.includes('admin') || emailLower.includes('administrator');
  const emailLooksLikePlanner = emailLower.includes('planner');

  const roles = [
    { id: 'planner' as const, emoji: '🎯', label: 'Planner' },
    { id: 'admin' as const, emoji: '⚙️', label: 'Admin' },
  ];

  return (
    <div className="login-page">
      {/* ── LEFT PANEL ── */}
      <div className="login-left-panel">
        <div className="login-left-bg" aria-hidden />
        <div className="login-orb login-orb-1" aria-hidden />
        <div className="login-orb login-orb-2" aria-hidden />
        <div className="login-orb login-orb-3" aria-hidden />
        <div className="login-orb login-orb-4" aria-hidden />
        <div className="login-orb login-orb-5" aria-hidden />

        <div className="login-left-top">
          <Logo to="/" />
        </div>

        <div className="login-left-content">
          <div className="login-left-badge">
            <div className="login-badge-dot" />
            3D Event Planning Platform
          </div>

          <h1 className="login-left-heading">
            Where every event
            <br />
            becomes a <em>masterpiece</em>
          </h1>

          <p className="login-left-sub">
            Design stunning 3D venue layouts, manage your budget in real time, and get client sign-off — all
            before the day arrives.
          </p>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon login-fi-rose">🏛️</div>
              <span>Drag-and-drop 3D venue designer</span>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon login-fi-lavender">💰</div>
              <span>Live budget tracking with every change</span>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon login-fi-mint">✅</div>
              <span>Client approval with audit trail</span>
            </div>
          </div>
        </div>

        <div className="login-mini-mockup">
          <div className="login-mockup-card">
            <div className="login-mockup-preview">
              <div className="login-mockup-furn login-mf1" aria-hidden />
              <div className="login-mockup-furn login-mf2" aria-hidden />
              <div className="login-mockup-furn login-mf3" aria-hidden />
            </div>
            <div className="login-mockup-info">
              <div className="login-mockup-event-name">Grand Ballroom — Winter Gala</div>
              <div className="login-mockup-meta">23 March 2026 · Rs. 3,000,000</div>
              <div className="login-mockup-pills">
                <div className="login-mockup-pill login-mp-rose">Editing</div>
                <div className="login-mockup-pill login-mp-mint">Budget synced</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right-panel">
        <button
          type="button"
          className="login-theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        />

        <div className="login-form-container">
          <div className="login-form-header">
            <h2 className="login-form-title">
              Welcome <em>back</em>
            </h2>
            <p className="login-form-subtitle">
              Sign in to continue planning something extraordinary
            </p>
          </div>

          {/* Role selector (cosmetic) */}
          <div className="login-role-selector">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`login-role-btn ${selectedRole === role.id ? 'login-active' : ''}`}
                onClick={() => setSelectedRole(role.id)}
              >
                <span className="login-role-emoji">{role.emoji}</span>
                {role.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field-group">
              <div className="login-field">
                <label htmlFor="login-email">Email address</label>
                <div className="login-field-wrap">
                  <span className="login-field-icon">✉️</span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {emailLooksLikeAdmin && selectedRole === 'planner' && (
                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    style={{
                      fontSize: '11px',
                      color: '#f59e0b',
                      cursor: 'pointer',
                      marginTop: '4px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    💡 Looks like an admin email? Switch to Admin tab →
                  </button>
                )}
                {emailLooksLikePlanner && selectedRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setSelectedRole('planner')}
                    style={{
                      fontSize: '11px',
                      color: '#f59e0b',
                      cursor: 'pointer',
                      marginTop: '4px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    💡 Looks like a planner email? Switch to Planner tab →
                  </button>
                )}
              </div>
              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-field-wrap">
                  <span className="login-field-icon">🔒</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="login-field-suffix"
                    onClick={togglePassword}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            </div>

            <div className="login-forgot-row">
              <a href="#" className="login-forgot-link">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-btn-submit"
            >
              <span>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in to DreamStage →'
                )}
              </span>
            </button>
          </form>

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#ef4444',
                fontSize: '13px',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">or continue with</span>
            <div className="login-divider-line" />
          </div>

          <div className="login-social-row">
            <button type="button" className="login-btn-social" disabled>
              <span className="login-social-icon">G</span>
              Google
            </button>
            <button type="button" className="login-btn-social" disabled>
              <span className="login-social-icon">🍎</span>
              Apple
            </button>
          </div>

          <div className="login-signup-row">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="login-signup-link">
              Create one free
            </Link>
          </div>

          <div className="login-security-note">
            🔐 256-bit encrypted · SOC 2 compliant
          </div>
        </div>
      </div>
    </div>
  );
}
