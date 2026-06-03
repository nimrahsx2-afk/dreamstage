import { api } from '@/services/api';

export interface InquiryMetaResponse {
  meta: {
    plannerName: string;
    isSubmitted: boolean;
  };
}

export interface InquiryRecord {
  id: string;
  plannerId: string;
  shareToken: string;
  clientName: string | null;
  clientEmail: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  venueType: string | null;
  hallPreference: string | null;
  seatingStyle: string | null;
  seatingNotes: string | null;
  mealPreference: string | null;
  lightingPreference: string | null;
  decorationPreference: string | null;
  addons: string[] | null;
  budgetRange: string | null;
  specialRequests: string | null;
  inspirationImages: string[] | null;
  selectedVenueId?: string | null;
  selectedVenueName?: string | null;
  venueHoldExpiresAt?: string | null;
  convertedEventId?: string | null;
  convertedEventName?: string | null;
  convertedAt?: string | null;
  isSubmitted: boolean;
  submittedAt: string | null;
  createdAt: string;
}

export async function getInquiryPublic(token: string): Promise<InquiryMetaResponse> {
  const res = await api.get(`/inquiries/${token}`);
  return res.data.data;
}

export async function submitInquiryPublic(token: string, formData: FormData): Promise<void> {
  await api.post(`/inquiries/${token}/submit`, formData, {
    transformRequest: [(data, headers) => {
      if (data instanceof FormData) {
        delete headers['Content-Type'];
      }
      return data;
    }],
  });
}

export async function generateInquiryLink(): Promise<{ token: string; url: string }> {
  const res = await api.post('/inquiries/generate-link');
  return res.data.data;
}

export async function listInquiries(): Promise<InquiryRecord[]> {
  const res = await api.get('/inquiries');
  return res.data.data;
}

export async function updateInquiry(
  id: string,
  payload: Record<string, unknown>
): Promise<InquiryRecord> {
  const res = await api.put(`/inquiries/${id}`, payload);
  return res.data.data;
}

export async function deleteInquiry(id: string): Promise<void> {
  await api.delete(`/inquiries/${id}`);
}
