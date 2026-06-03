// Checklist Module Types - ChecklistItem, Milestone, TimelineEntry

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
  timeSlot: string; // HH:MM or HH:MM:SS
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
