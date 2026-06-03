/**
 * Admin API - venues, assets, planners CRUD.
 */

import { AxiosHeaders } from 'axios';
import { api } from '../../services/api';
import type {
  AdminVenue,
  AdminAsset,
  AdminPlanner,
  PaginatedResponse,
  CreateVenueInput,
  UpdateVenueInput,
  CreateAssetInput,
  UpdateAssetInput,
  AdminStats,
  AdminActivityItem,
} from './admin.types';

const base = '/admin';

// ============ DASHBOARD ============

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get(`${base}/stats`, {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  return res.data.data as AdminStats;
}

export async function getAdminActivity(): Promise<AdminActivityItem[]> {
  const res = await api.get(`${base}/activity`, {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  return res.data.data as AdminActivityItem[];
}

export async function getBudgetBreakdown(): Promise<
  Array<{
    eventName: string;
    eventType: string;
    plannerName: string;
    eventDate: string | null;
    budgetCeiling: number;
  }>
> {
  const res = await api.get(`${base}/budget-breakdown`);
  return res.data.data;
}

// ============ VENUES ============

export async function listVenues(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminVenue>> {
  const res = await api.get(`${base}/venues`, { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function listVenuesFlat(limit = 300): Promise<AdminVenue[]> {
  const res = await api.get(`${base}/venues`, { params: { flat: true, limit } });
  return res.data.data as AdminVenue[];
}

export async function getVenue(id: string): Promise<AdminVenue> {
  const res = await api.get(`${base}/venues/${id}`);
  return res.data.data;
}

export async function createVenue(input: CreateVenueInput): Promise<AdminVenue> {
  const res = await api.post(`${base}/venues`, input);
  return res.data.data;
}

export async function updateVenue(id: string, input: UpdateVenueInput): Promise<AdminVenue> {
  const res = await api.put(`${base}/venues/${id}`, input);
  return res.data.data;
}

export async function patchVenue(id: string, input: UpdateVenueInput): Promise<AdminVenue> {
  const res = await api.patch(`${base}/venues/${id}`, input);
  return res.data.data;
}

export async function uploadVenueImages(venueId: string, files: File[]): Promise<AdminVenue> {
  const formData = new FormData();
  files.forEach((file) => {
    if (file instanceof File) {
      formData.append('images', file);
    }
  });
  const res = await api.post(`${base}/venues/${venueId}/images`, formData, {
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData && headers) {
          if (headers instanceof AxiosHeaders) {
            headers.delete('Content-Type');
          } else {
            const h = headers as Record<string, unknown>;
            delete h['Content-Type'];
            delete h['content-type'];
          }
        }
        return data;
      },
    ],
  });
  return res.data.data as AdminVenue;
}

export async function toggleVenue(id: string): Promise<AdminVenue> {
  const res = await api.patch(`${base}/venues/${id}/toggle`);
  return res.data.data;
}

export async function deleteVenue(id: string): Promise<void> {
  await api.delete(`${base}/venues/${id}`);
}

// ============ ASSETS ============

export async function listAssets(params?: {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}): Promise<PaginatedResponse<AdminAsset>> {
  const res = await api.get(`${base}/assets`, { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function listAssetsFlat(): Promise<AdminAsset[]> {
  const res = await api.get(`${base}/assets`, { params: { flat: true, limit: 500 } });
  return res.data.data as AdminAsset[];
}

export async function getAsset(id: string): Promise<AdminAsset> {
  const res = await api.get(`${base}/assets/${id}`);
  return res.data.data;
}

export async function createAsset(input: CreateAssetInput): Promise<AdminAsset> {
  const res = await api.post(`${base}/assets`, input);
  return res.data.data;
}

export async function uploadAssetWithFiles(input: {
  name: string;
  category: string;
  pricePerUnit: number;
  modelFile: File;
  thumbnailFile?: File | null;
}): Promise<AdminAsset> {
  const formData = new FormData();
  formData.append('name', input.name);
  formData.append('category', input.category);
  formData.append('price_per_unit', String(input.pricePerUnit));
  formData.append('model', input.modelFile);
  if (input.thumbnailFile) {
    formData.append('thumbnail', input.thumbnailFile);
  }
  const res = await api.post(`${base}/assets`, formData, {
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData && headers) {
          if (headers instanceof AxiosHeaders) {
            headers.delete('Content-Type');
          } else {
            const h = headers as Record<string, unknown>;
            delete h['Content-Type'];
            delete h['content-type'];
          }
        }
        return data;
      },
    ],
  });
  return res.data.data as AdminAsset;
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<AdminAsset> {
  const res = await api.put(`${base}/assets/${id}`, input);
  return res.data.data;
}

export async function patchAssetMetadata(
  id: string,
  input: { name?: string; category?: string; price_per_unit?: number }
): Promise<AdminAsset> {
  const res = await api.patch(`${base}/assets/${id}`, input);
  return res.data.data as AdminAsset;
}

export async function softDeleteAsset(id: string): Promise<void> {
  await api.delete(`${base}/assets/${id}`);
}

export async function adjustAssetStock(id: string, delta: number): Promise<AdminAsset> {
  const res = await api.patch(`${base}/assets/${id}/stock`, { delta });
  return res.data.data;
}

export async function toggleAsset(id: string): Promise<AdminAsset> {
  const res = await api.patch(`${base}/assets/${id}/toggle`);
  return res.data.data;
}

// ============ PLANNERS ============

export async function listPlanners(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminPlanner>> {
  const res = await api.get(`${base}/planners`, { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function listPlannersFlat(): Promise<AdminPlanner[]> {
  const res = await api.get(`${base}/planners`, { params: { flat: true } });
  return res.data.data as AdminPlanner[];
}

export async function getPlanner(id: string): Promise<AdminPlanner> {
  const res = await api.get(`${base}/planners/${id}`);
  return res.data.data;
}

export async function togglePlannerStatus(id: string): Promise<AdminPlanner> {
  const res = await api.patch(`${base}/planners/${id}/status`);
  return res.data.data;
}

export async function suspendPlanner(id: string): Promise<AdminPlanner> {
  const res = await api.patch(`${base}/planners/${id}/suspend`);
  return res.data.data;
}
