// Venue Booking Frontend Types

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
  galleryImages: string[];
  videoUrl: string | null;
  pricePerHead: number | null;
  location: string | null;
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

export interface VenueAvailability {
  venueTemplateId: string;
  venueName: string;
  date: string;
  isAvailable: boolean;
  bookedBy?: string;
}
