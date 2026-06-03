/**
 * Theme toggle button - Light/Dark mode switch.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="theme-toggle flex items-center gap-1 p-1.5 rounded-full transition-colors hover:opacity-80"
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
      }}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      ) : (
        <Sun className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      )}
    </button>
  );
}
