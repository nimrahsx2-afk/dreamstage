// Events API Service

import { api } from '@/services/api';
import type { Event, EventInput } from './events.types';

// Get all events for current planner
export async function getEvents(): Promise<Event[]> {
  const response = await api.get('/events');
  return response.data.data;
}

// Get single event
export async function getEvent(eventId: string): Promise<Event> {
  const response = await api.get(`/events/${eventId}`);
  return response.data.data;
}

// Create new event
export async function createEvent(input: EventInput): Promise<Event> {
  const response = await api.post('/events', input);
  return response.data.data;
}

export async function createEventFromInquiry(inquiryId: string): Promise<Event> {
  const response = await api.post(`/events/from-inquiry/${inquiryId}`);
  return response.data.data;
}

// Update event
export async function updateEvent(
  eventId: string,
  input: Partial<EventInput>
): Promise<Event> {
  const response = await api.put(`/events/${eventId}`, input);
  return response.data.data;
}

// Delete event
export async function deleteEvent(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}`);
}

// Update share settings
export async function updateShareSettings(
  eventId: string,
  input: { sharePassword?: string | null; showBudgetDetails?: boolean }
): Promise<Event> {
  const response = await api.patch(`/events/${eventId}/share`, input);
  return response.data.data;
}

// Unlock scene (planner, with confirmation)
export async function unlockEvent(eventId: string): Promise<void> {
  await api.patch(`/events/${eventId}/unlock`, { confirm: true });
}

// Get comments (planner) - includes all comments and replies
export async function getComments(eventId: string): Promise<Array<{
  id: string;
  parentCommentId: string | null;
  clientIdentifier: string;
  content: string;
  isPlannerReply: boolean;
  createdAt: string;
}>> {
  const response = await api.get(`/events/${eventId}/comments`, {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  const data = response.data?.data;
  console.log('[EventComments] GET /api/events/:eventId/comments response:', {
    fullResponse: response.data,
    dataType: typeof data,
    isArray: Array.isArray(data),
    count: Array.isArray(data) ? data.length : 0,
    raw: JSON.stringify(response.data),
  });
  return Array.isArray(data) ? data : [];
}

// Add planner reply - POST /api/events/:eventId/comments with { content, parentCommentId }
export async function addComment(
  eventId: string,
  input: { content: string; parentCommentId?: string | null }
): Promise<unknown> {
  const body = {
    content: input.content,
    ...(input.parentCommentId != null && { parentCommentId: input.parentCommentId }),
  };
  const response = await api.post(`/events/${eventId}/comments`, body);
  return response.data.data;
}
