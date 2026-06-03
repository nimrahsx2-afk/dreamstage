// Events Module Types

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
  venueTemplateId?: string;
  budgetCeiling?: number;
  notes?: string;
}

export interface EventUpdate {
  name?: string;
  eventType?: string;
  eventDate?: string;
  venueTemplateId?: string | null;
  budgetCeiling?: number | null;
  showBudgetDetails?: boolean;
  notes?: string | null;
}

export interface DbEvent {
  id: string;
  planner_id: string;
  venue_template_id: string | null;
  name: string;
  event_type: string;
  event_date: Date;
  status: 'draft' | 'approved' | 'locked';
  share_token: string;
  share_password_hash: string | null;
  budget_ceiling: string | null;
  show_budget_details: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
