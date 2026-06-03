// Events Module Types (Frontend)

export interface Event {
  id: string;
  plannerId: string;
  venueTemplateId: string | null;
  name: string;
  eventType: string;
  eventDate: string;
  status: 'draft' | 'approved' | 'locked';
  shareToken: string;
  budgetCeiling: number | null;
  showBudgetDetails: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  name: string;
  eventType: string;
  eventDate: string;
  guestCount?: number;
  venueTemplateId?: string;
  budgetCeiling?: number;
  notes?: string;
}

export type EventStatus = 'draft' | 'approved' | 'locked';

export const EVENT_TYPES = [
  'wedding',
  'corporate',
  'birthday',
  'engagement',
  'mehndi',
  'walima',
  'conference',
  'exhibition',
  'other',
] as const;
