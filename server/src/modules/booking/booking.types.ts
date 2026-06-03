// Venue Booking Module Types

export type BookingStatus = 'provisional' | 'confirmed';

export interface VenueTemplate {
  id: string;
  name: string;
  category: string;
  capacity: number;
  thumbnailUrl: string | null;
  modelRef: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Relative paths (/uploads/...) or absolute URLs */
  galleryImages: string[];
  videoUrl: string | null;
  pricePerHead: number | null;
  location: string | null;
}

export interface VenueTemplateInput {
  name: string;
  category: string;
  capacity: number;
  thumbnailUrl?: string;
  modelRef?: string;
  description?: string;
  isActive?: boolean;
}

export interface VenueTemplateUpdate {
  name?: string;
  category?: string;
  capacity?: number;
  thumbnailUrl?: string | null;
  modelRef?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface VenueBooking {
  id: string;
  eventId: string;
  venueTemplateId: string;
  bookingDate: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VenueBookingWithDetails extends VenueBooking {
  venueName: string;
  venueCategory: string;
  venueCapacity: number;
  thumbnailUrl?: string | null;
  location?: string | null;
  bookedByClient?: boolean;
}

export interface BookVenueInput {
  venueTemplateId: string;
  bookingDate: string;
}

export interface BookingConflict {
  venueTemplateId: string;
  venueName: string;
  bookingDate: string;
  conflictingEventId: string;
}

export interface VenueAvailability {
  venueTemplateId: string;
  venueName: string;
  date: string;
  isAvailable: boolean;
  bookedBy?: string;
}

// Database row types
export interface DbVenueTemplate {
  id: string;
  name: string;
  category: string;
  capacity: number;
  thumbnail_url: string | null;
  model_ref: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  price_per_head?: string | null;
  location?: string | null;
  gallery_images?: unknown;
  video_url?: string | null;
}

export interface DbVenueBooking {
  id: string;
  event_id: string;
  venue_template_id: string;
  booking_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbVenueBookingWithDetails extends DbVenueBooking {
  venue_name: string;
  venue_category: string;
  venue_capacity: number;
  thumbnail_url?: string | null;
  location?: string | null;
  booked_by_client?: boolean;
}
