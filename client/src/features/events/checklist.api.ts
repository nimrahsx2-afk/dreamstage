// Checklist API - Checklist items, milestones, timeline

import { api } from '@/services/api';

export interface ChecklistItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isComplete: boolean;
  isSystemGenerated: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  eventId: string;
  title: string;
  targetDate: string;
  isComplete: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  eventId: string;
  timeSlot: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function getChecklistItems(eventId: string): Promise<ChecklistItem[]> {
  const response = await api.get(`/events/${eventId}/checklist`);
  return response.data.data;
}

export async function toggleChecklistItem(
  eventId: string,
  itemId: string,
  isComplete: boolean
): Promise<ChecklistItem> {
  const response = await api.patch(`/events/${eventId}/checklist/${itemId}`, {
    isComplete,
  });
  return response.data.data;
}

export async function addChecklistItem(
  eventId: string,
  title: string,
  dueDate?: string | null
): Promise<ChecklistItem> {
  const response = await api.post(`/events/${eventId}/checklist`, {
    title,
    dueDate: dueDate ?? null,
  });
  return response.data.data;
}

export async function deleteChecklistItem(
  eventId: string,
  itemId: string
): Promise<void> {
  await api.delete(`/events/${eventId}/checklist/${itemId}`);
}

export async function getMilestones(eventId: string): Promise<Milestone[]> {
  const response = await api.get(`/events/${eventId}/milestones`);
  return response.data.data;
}

export async function createMilestone(
  eventId: string,
  title: string,
  targetDate: string
): Promise<Milestone> {
  const response = await api.post(`/events/${eventId}/milestones`, {
    title,
    targetDate,
  });
  return response.data.data;
}

export async function updateMilestone(
  eventId: string,
  milestoneId: string,
  updates: { title?: string; targetDate?: string; isComplete?: boolean }
): Promise<Milestone> {
  const response = await api.patch(
    `/events/${eventId}/milestones/${milestoneId}`,
    updates
  );
  return response.data.data;
}

export async function deleteMilestone(
  eventId: string,
  milestoneId: string
): Promise<void> {
  await api.delete(`/events/${eventId}/milestones/${milestoneId}`);
}

export async function getTimelineEntries(eventId: string): Promise<TimelineEntry[]> {
  const response = await api.get(`/events/${eventId}/timeline`);
  return response.data.data;
}

export async function createTimelineEntry(
  eventId: string,
  timeSlot: string,
  title: string,
  description?: string | null,
  sortOrder?: number
): Promise<TimelineEntry> {
  const response = await api.post(`/events/${eventId}/timeline`, {
    timeSlot,
    title,
    description: description ?? null,
    sortOrder,
  });
  return response.data.data;
}

export async function updateTimelineEntry(
  eventId: string,
  entryId: string,
  updates: { timeSlot?: string; title?: string; description?: string | null; sortOrder?: number }
): Promise<TimelineEntry> {
  const response = await api.patch(
    `/events/${eventId}/timeline/${entryId}`,
    updates
  );
  return response.data.data;
}

export async function deleteTimelineEntry(
  eventId: string,
  entryId: string
): Promise<void> {
  await api.delete(`/events/${eventId}/timeline/${entryId}`);
}
