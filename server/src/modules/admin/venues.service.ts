/**
 * Venue template management service.
 * Handles CRUD operations for venue templates (admin only).
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import {
  CreateVenueInput,
  UpdateVenueInput,
  VenueResponse,
  DbVenue,
  PaginationParams,
  PaginatedResponse,
} from './admin.types';

/**
 * Get paginated list of all venue templates.
 */
export async function getVenuesFlat(limit: number): Promise<VenueResponse[]> {
  const venues = await queryAll<DbVenue>(
    `SELECT * FROM venue_templates ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return venues.map(formatVenueResponse);
}

export async function getAllVenues(
  pagination: PaginationParams
): Promise<PaginatedResponse<VenueResponse>> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) FROM venue_templates'
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get paginated venues
  const venues = await queryAll<DbVenue>(
    `SELECT * FROM venue_templates 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    data: venues.map(formatVenueResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single venue template by ID.
 */
export async function getVenueById(id: string): Promise<VenueResponse> {
  const venue = await queryOne<DbVenue>(
    'SELECT * FROM venue_templates WHERE id = $1',
    [id]
  );

  if (!venue) {
    throw new NotFoundError('Venue template not found');
  }

  return formatVenueResponse(venue);
}

/**
 * Create a new venue template.
 */
export async function createVenue(input: CreateVenueInput): Promise<VenueResponse> {
  const gallery = JSON.stringify(input.galleryImages ?? []);
  const venue = await queryOne<DbVenue>(
    `INSERT INTO venue_templates (
       id, name, category, capacity, description, thumbnail_url, model_ref,
       price_per_head, location, gallery_images, video_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
     RETURNING *`,
    [
      uuidv4(),
      input.name,
      input.category,
      input.capacity,
      input.description ?? null,
      input.thumbnailUrl ?? null,
      input.modelRef ?? null,
      input.pricePerHead ?? null,
      input.location ?? null,
      gallery,
      input.videoUrl ?? null,
    ]
  );

  if (!venue) {
    throw new Error('Failed to create venue template');
  }

  return formatVenueResponse(venue);
}

/**
 * Update an existing venue template.
 */
export async function updateVenue(
  id: string,
  input: UpdateVenueInput
): Promise<VenueResponse> {
  // Check venue exists
  const existing = await queryOne<DbVenue>(
    'SELECT id FROM venue_templates WHERE id = $1',
    [id]
  );

  if (!existing) {
    throw new NotFoundError('Venue template not found');
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.capacity !== undefined) {
    updates.push(`capacity = $${paramIndex++}`);
    values.push(input.capacity);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.thumbnailUrl !== undefined) {
    updates.push(`thumbnail_url = $${paramIndex++}`);
    values.push(input.thumbnailUrl);
  }
  if (input.modelRef !== undefined) {
    updates.push(`model_ref = $${paramIndex++}`);
    values.push(input.modelRef);
  }
  if (input.pricePerHead !== undefined) {
    updates.push(`price_per_head = $${paramIndex++}`);
    values.push(input.pricePerHead);
  }
  if (input.location !== undefined) {
    updates.push(`location = $${paramIndex++}`);
    values.push(input.location);
  }
  if (input.galleryImages !== undefined) {
    updates.push(`gallery_images = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(input.galleryImages));
  }
  if (input.videoUrl !== undefined) {
    updates.push(`video_url = $${paramIndex++}`);
    values.push(input.videoUrl);
  }

  if (updates.length === 0) {
    return getVenueById(id);
  }

  values.push(id);
  const venue = await queryOne<DbVenue>(
    `UPDATE venue_templates 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (!venue) {
    throw new Error('Failed to update venue template');
  }

  return formatVenueResponse(venue);
}

/**
 * Toggle venue active status (enable/disable).
 */
export async function toggleVenueActive(id: string): Promise<VenueResponse> {
  const venue = await queryOne<DbVenue>(
    `UPDATE venue_templates 
     SET is_active = NOT is_active
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (!venue) {
    throw new NotFoundError('Venue template not found');
  }

  return formatVenueResponse(venue);
}

/**
 * Delete a venue template.
 * Only allowed if no events are using this venue.
 */
export async function deleteVenue(id: string): Promise<void> {
  // Check if venue is in use
  const inUse = await queryOne<{ count: string }>(
    'SELECT COUNT(*) FROM events WHERE venue_template_id = $1',
    [id]
  );

  if (parseInt(inUse?.count ?? '0', 10) > 0) {
    throw new ConflictError(
      'Cannot delete venue template - it is being used by existing events'
    );
  }

  const result = await query(
    'DELETE FROM venue_templates WHERE id = $1',
    [id]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Venue template not found');
  }
}

/**
 * Append uploaded image paths (relative URLs like /uploads/venues/...) to gallery_images.
 */
export async function appendVenueImages(id: string, savedBasenames: string[]): Promise<VenueResponse> {
  const venue = await queryOne<DbVenue>('SELECT * FROM venue_templates WHERE id = $1', [id]);
  if (!venue) {
    throw new NotFoundError('Venue template not found');
  }
  const current = parseGalleryImages(venue.gallery_images);
  const newPaths = savedBasenames.map((f) => `/uploads/venues/${f}`);
  const merged = [...current, ...newPaths].slice(0, 50);
  const thumbFill = venue.thumbnail_url ?? merged[0] ?? null;
  const updated = await queryOne<DbVenue>(
    `UPDATE venue_templates
     SET gallery_images = $1::jsonb,
         thumbnail_url = COALESCE(thumbnail_url, $2)
     WHERE id = $3
     RETURNING *`,
    [JSON.stringify(merged), thumbFill, id]
  );
  if (!updated) {
    throw new Error('Failed to update venue images');
  }
  return formatVenueResponse(updated);
}

/**
 * Format database venue to response object.
 */
function parseGalleryImages(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatVenueResponse(venue: DbVenue): VenueResponse {
  const price =
    venue.price_per_head != null && venue.price_per_head !== ''
      ? parseFloat(String(venue.price_per_head))
      : null;
  return {
    id: venue.id,
    name: venue.name,
    category: venue.category,
    capacity: venue.capacity,
    description: venue.description,
    thumbnailUrl: venue.thumbnail_url,
    modelRef: venue.model_ref,
    isActive: venue.is_active,
    createdAt: venue.created_at.toISOString(),
    updatedAt: venue.updated_at.toISOString(),
    pricePerHead: price != null && Number.isFinite(price) ? price : null,
    location: venue.location ?? null,
    galleryImages: parseGalleryImages(venue.gallery_images),
    videoUrl: venue.video_url ?? null,
  };
}
