/**
 * VenuesLayout - Uses AppLayout for authenticated users, public nav for guests.
 * Ensures logged-in planners see the planner navbar on /venues and /venues/:venueId.
 * Passes embedded=true to children when authenticated so they skip rendering their own nav.
 */

import React from 'react';
import { AppLayout } from './AppLayout';

function isAuthenticated(): boolean {
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

export function VenuesLayout({ children }: { children: React.ReactNode }) {
  const authenticated = isAuthenticated();
  const child = React.Children.only(children);
  const withEmbedded = React.isValidElement(child)
    ? React.cloneElement(child as React.ReactElement<{ embedded?: boolean }>, { embedded: authenticated })
    : child;

  if (authenticated) {
    return <AppLayout>{withEmbedded}</AppLayout>;
  }

  return <>{withEmbedded}</>;
}
