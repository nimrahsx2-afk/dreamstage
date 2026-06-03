/**
 * Public API - Unauthenticated endpoints for homepage.
 */

import { api } from '../../services/api';
import type { VenueTemplate } from '../booking/booking.types';

export async function getPublicVenues(): Promise<VenueTemplate[]> {
  const response = await api.get('/public/venues');
  return response.data.data;
}

export async function getPublicVenue(venueId: string): Promise<VenueTemplate> {
  const response = await api.get(`/public/venues/${venueId}`);
  return response.data.data;
}
