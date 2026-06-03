// Error Boundary - Catches React errors and shows fallback UI
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg)' }}
        >
          <div
            className="p-8 text-center max-w-md"
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--border)',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans',
                color: 'var(--text-muted)',
                marginBottom: 16,
              }}
            >
              Something went wrong loading this view.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-3"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
