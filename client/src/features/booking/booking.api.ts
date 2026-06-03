// Venue Booking API Service

import { api } from '../../services/api';
import type {
  VenueTemplate,
  VenueBooking,
  VenueBookingWithDetails,
  BookVenueInput,
  VenueAvailability,
} from './booking.types';

// ============ VENUE TEMPLATES ============

// Get all venue templates
export async function getVenueTemplates(activeOnly: boolean = true): Promise<VenueTemplate[]> {
  const response = await api.get('/booking/venues', {
    params: { activeOnly: String(activeOnly) },
  });
  return response.data.data;
}

// Get single venue template
export async function getVenueTemplate(venueId: string): Promise<VenueTemplate> {
  const response = await api.get(`/booking/venues/${venueId}`);
  return response.data.data;
}

// ============ VENUE AVAILABILITY ============

// Check if venue is available on a specific date
export async function checkVenueAvailability(
  venueId: string,
  date: string
): Promise<{ available: boolean; bookedBy?: string }> {
  const response = await api.get(`/booking/venues/${venueId}/availability`, {
    params: { date },
  });
  return response.data.data;
}

// Get availability for a date range
export async function getVenueAvailabilityRange(
  venueId: string,
  startDate: string,
  endDate: string
): Promise<VenueAvailability[]> {
  const response = await api.get(`/booking/venues/${venueId}/availability`, {
    params: { startDate, endDate },
  });
  return response.data.data;
}

// Get all booked dates for a venue
export async function getVenueBookedDates(venueId: string): Promise<string[]> {
  const response = await api.get(`/booking/venues/${venueId}/availability`);
  return response.data.data.bookedDates;
}

// ============ EVENT BOOKINGS ============

// Get booking for an event
export async function getEventBooking(eventId: string): Promise<VenueBookingWithDetails | null> {
  const response = await api.get(`/booking/events/${eventId}`, {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  return response.data.data ?? null;
}

// Book a venue for an event
export async function bookVenue(
  eventId: string,
  input: BookVenueInput
): Promise<VenueBookingWithDetails> {
  const response = await api.post(`/booking/events/${eventId}`, input);
  return response.data.data;
}

// Confirm a provisional booking
export async function confirmBooking(eventId: string): Promise<VenueBooking> {
  const response = await api.put(`/booking/events/${eventId}/confirm`);
  return response.data.data;
}

// Change booking date
export async function changeBookingDate(
  eventId: string,
  newDate: string
): Promise<VenueBookingWithDetails> {
  const response = await api.put(`/booking/events/${eventId}/date`, { newDate });
  return response.data.data;
}

// Cancel a booking
export async function cancelBooking(eventId: string): Promise<void> {
  await api.delete(`/booking/events/${eventId}`);
}

// ============ ADMIN OPERATIONS ============

// Create venue template (Admin)
export async function createVenueTemplate(input: Partial<VenueTemplate>): Promise<VenueTemplate> {
  const response = await api.post('/booking/venues', input);
  return response.data.data;
}

// Update venue template (Admin)
export async function updateVenueTemplate(
  venueId: string,
  input: Partial<VenueTemplate>
): Promise<VenueTemplate> {
  const response = await api.put(`/booking/venues/${venueId}`, input);
  return response.data.data;
}

// Delete venue template (Admin)
export async function deleteVenueTemplate(venueId: string): Promise<void> {
  await api.delete(`/booking/venues/${venueId}`);
}
