// Register Page - New account creation form

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/services/api';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';

export function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register(formData);
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/events');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(
        err.response?.data?.error || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{ background: 'var(--bg)' }}
    >
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-2 transition-opacity hover:opacity-70"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div
        className="w-full max-w-md p-8"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="text-center mb-8">
          <Logo to="/" className="block mb-2 hover:opacity-80 transition-opacity" />
          <h1
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            Create Account
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem',
            }}
          >
            Join DreamStage as a planner
          </p>
        </div>

        {error && (
          <div
            className="mb-6 px-4 py-3"
            style={{
              background: 'var(--rose)',
              borderRadius: '8px',
              color: '#8a2840',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '0.5rem',
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3"
              placeholder="John Doe"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.9rem',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '0.5rem',
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3"
              placeholder="you@example.com"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.9rem',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '0.5rem',
              }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 pr-12"
                placeholder="••••••••"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.9rem',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '0.5rem',
              }}
            >
              Minimum 8 characters with uppercase, lowercase, number and special character
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
