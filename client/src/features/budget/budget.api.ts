// Budget API Service - Uses nested route: /api/events/:eventId/budget/*

import { api } from '@/services/api';
import type {
  BudgetItem,
  BudgetItemInput,
  BudgetSummary,
  CategoryBreakdown,
  Vendor,
  VendorInput,
  VendorPayment,
  VendorPaymentInput,
  VendorQuote,
  VendorSummary,
} from './budget.types';

// ============ BUDGET ITEMS ============

export async function getBudgetItems(eventId: string): Promise<BudgetItem[]> {
  const response = await api.get(`/events/${eventId}/budget/items`);
  return response.data.data;
}

export async function createBudgetItem(
  eventId: string,
  input: BudgetItemInput
): Promise<BudgetItem> {
  const response = await api.post(`/events/${eventId}/budget/items`, input);
  return response.data.data;
}

export async function updateBudgetItem(
  eventId: string,
  itemId: string,
  input: Partial<BudgetItemInput>
): Promise<BudgetItem> {
  const response = await api.put(`/events/${eventId}/budget/items/${itemId}`, input);
  return response.data.data;
}

export async function deleteBudgetItem(
  eventId: string,
  itemId: string
): Promise<void> {
  await api.delete(`/events/${eventId}/budget/items/${itemId}`);
}

// ============ BUDGET SUMMARY ============

export async function syncBudgetFromScene(
  eventId: string,
  placedAssets: { assetId: string; quantity?: number; priceOverride?: number }[]
): Promise<void> {
  await api.post(`/events/${eventId}/budget/sync-from-scene`, {
    placedAssets: placedAssets.map((a) => ({
      assetId: a.assetId,
      quantity: a.quantity ?? 1,
      priceOverride: a.priceOverride,
    })),
  });
}

export async function syncBudgetFromSavedScene(eventId: string): Promise<void> {
  await api.post(`/events/${eventId}/budget/sync-from-saved-scene`);
}

export async function getBudgetSummary(eventId: string): Promise<BudgetSummary> {
  const response = await api.get(`/events/${eventId}/budget/summary`);
  return response.data.data;
}

export async function getCategoryBreakdown(
  eventId: string
): Promise<CategoryBreakdown[]> {
  const response = await api.get(`/events/${eventId}/budget/breakdown`);
  return response.data.data;
}

// ============ VENDORS ============

export async function getVendors(eventId: string): Promise<Vendor[]> {
  const response = await api.get(`/events/${eventId}/budget/vendors`);
  return response.data.data;
}

export async function createVendor(
  eventId: string,
  input: VendorInput
): Promise<Vendor> {
  const response = await api.post(`/events/${eventId}/budget/vendors`, input);
  return response.data.data;
}

export async function updateVendor(
  eventId: string,
  vendorId: string,
  input: Partial<VendorInput>
): Promise<Vendor> {
  const response = await api.put(
    `/events/${eventId}/budget/vendors/${vendorId}`,
    input
  );
  return response.data.data;
}

export async function deleteVendor(
  eventId: string,
  vendorId: string
): Promise<void> {
  await api.delete(`/events/${eventId}/budget/vendors/${vendorId}`);
}

export async function getVendorSummaries(
  eventId: string
): Promise<VendorSummary[]> {
  const response = await api.get(`/events/${eventId}/budget/vendors/summaries`);
  return response.data.data;
}

// ============ VENDOR PAYMENTS ============

export async function getVendorPayments(
  eventId: string,
  vendorId: string
): Promise<VendorPayment[]> {
  const response = await api.get(
    `/events/${eventId}/budget/vendors/${vendorId}/payments`
  );
  return response.data.data;
}

export async function createVendorPayment(
  eventId: string,
  vendorId: string,
  input: VendorPaymentInput
): Promise<VendorPayment> {
  const response = await api.post(
    `/events/${eventId}/budget/vendors/${vendorId}/payments`,
    input
  );
  return response.data.data;
}

export async function deleteVendorPayment(
  eventId: string,
  vendorId: string,
  paymentId: string
): Promise<void> {
  await api.delete(
    `/events/${eventId}/budget/vendors/${vendorId}/payments/${paymentId}`
  );
}

// ============ VENDOR QUOTES ============

export async function getVendorQuotes(
  eventId: string,
  vendorId: string
): Promise<VendorQuote[]> {
  const response = await api.get(
    `/events/${eventId}/budget/vendors/${vendorId}/quotes`
  );
  return response.data.data;
}

export async function uploadVendorQuote(
  eventId: string,
  vendorId: string,
  file: File
): Promise<VendorQuote> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/events/${eventId}/budget/vendors/${vendorId}/quotes`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
}

export async function deleteVendorQuote(
  eventId: string,
  vendorId: string,
  quoteId: string
): Promise<void> {
  await api.delete(
    `/events/${eventId}/budget/vendors/${vendorId}/quotes/${quoteId}`
  );
}
