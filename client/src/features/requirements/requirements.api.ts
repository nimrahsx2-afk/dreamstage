import { api } from '@/services/api';

export interface RequirementsMetaResponse {
  meta: {
    eventId: string;
    eventName: string;
    plannerName: string;
    isSubmitted: boolean;
  };
  existing: any | null;
}

export async function getRequirementsPublic(token: string): Promise<RequirementsMetaResponse> {
  const res = await api.get(`/requirements/${token}`);
  return res.data.data;
}

export async function submitRequirementsPublic(token: string, data: any): Promise<void> {
  await api.post(`/requirements/${token}`, data);
}

export async function generateRequirementsLink(eventId: string): Promise<{ token: string; url: string }> {
  const res = await api.post(`/events/${eventId}/requirements/generate-link`);
  return res.data.data;
}

export async function getRequirementsForEvent(eventId: string): Promise<any | null> {
  const res = await api.get(`/events/${eventId}/requirements`);
  return res.data.data;
}

