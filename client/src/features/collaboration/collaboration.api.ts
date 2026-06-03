// Collaboration API - Shared view (no auth, token in URL)

import { api } from '@/services/api';

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

export async function getSharedView(
  token: string,
  password?: string | null
): Promise<SharedViewData> {
  const params = password ? { password, _t: Date.now() } : { _t: Date.now() };
  const response = await api.get(`/shared/${token}`, {
    params,
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  return response.data.data;
}

export async function validateSharedToken(
  token: string,
  password?: string
): Promise<boolean> {
  try {
    const response = await api.post(`/shared/${token}/validate`, {
      password: password || undefined,
    });
    return response.data.data?.valid === true;
  } catch {
    return false;
  }
}

export async function getSharedComments(
  token: string,
  password?: string | null
): Promise<ClientComment[]> {
  const params = password ? { password, _t: Date.now() } : { _t: Date.now() };
  const response = await api.get(`/shared/${token}/comments`, {
    params,
    headers: { 'Cache-Control': 'no-cache' },
  });
  const data = response.data?.data;
  console.log('[ClientView] GET /api/shared/:token/comments response:', {
    fullResponse: response.data,
    dataType: typeof data,
    isArray: Array.isArray(data),
    count: Array.isArray(data) ? data.length : 0,
    raw: JSON.stringify(response.data),
  });
  return Array.isArray(data) ? data : [];
}

export async function addSharedComment(
  token: string,
  input: { clientIdentifier: string; content: string; parentCommentId?: string | null },
  password?: string | null
): Promise<ClientComment> {
  const params = password ? { password } : undefined;
  const response = await api.post(`/shared/${token}/comments`, input, { params });
  return response.data.data;
}

export async function submitApproval(
  token: string,
  clientIdentifier: string,
  password?: string | null
): Promise<void> {
  const params = password ? { password } : undefined;
  await api.post(`/shared/${token}/approve`, { clientIdentifier }, { params });
}
