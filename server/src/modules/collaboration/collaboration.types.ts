// Collaboration Module Types - Client shared view, comments, approval

export interface SharedViewData {
  event: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    status: 'draft' | 'approved' | 'locked';
    showBudgetDetails: boolean;
    venueTemplateId: string | null;
    venueModelRef: string | null;
  };
  sceneJson: {
    placedAssets: unknown[];
    lighting: unknown;
    venue: unknown;
    version: number;
  } | null;
  isLocked: boolean;
  budgetSummary?: {
    grandTotal: number;
    budgetCeiling: number | null;
    isOverBudget: boolean;
  };
}

export interface ClientComment {
  id: string;
  parentCommentId: string | null;
  clientIdentifier: string;
  content: string;
  isPlannerReply: boolean;
  createdAt: string;
}

export interface ClientCommentInput {
  clientIdentifier: string;
  content: string;
  parentCommentId?: string | null;
}

export interface ApprovalRecord {
  id: string;
  eventId: string;
  clientIdentifier: string;
  sceneVersionRef: number;
  approvedAt: string;
}
