/**
 * Shared DreamStage logo - "Dream" in text color, "Stage" in gradient (rose → lavender → sky).
 * Reused across all pages for consistent branding.
 */

import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import './Logo.css';

export interface LogoProps {
  /** If set, renders as Link to this path; otherwise as span */
  to?: string;
  /** Additional CSS class for size/variant overrides */
  className?: string;
}

export function Logo({ to, className = '' }: LogoProps) {
  const content = (
    <>
      <Sparkles className="logo-icon" aria-hidden />
      <span className="logo-text">Dream</span><span className="logo-gradient">Stage</span>
    </>
  );

  const baseClass = `dreamstage-logo ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={baseClass} aria-label="DreamStage home">
        {content}
      </Link>
    );
  }

  return (
    <span className={baseClass} aria-label="DreamStage">
      {content}
    </span>
  );
}
