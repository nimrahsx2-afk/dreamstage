/**
 * Recent admin activity feed (merged timeline).
 */

import { queryAll } from '../../db/client';

export type AdminActivityType =
  | 'event_created'
  | 'booking_confirmed'
  | 'design_approved'
  | 'inquiry_submitted'
  | 'inquiry_converted';

export interface AdminActivityItem {
  id: string;
  type: AdminActivityType;
  title: string;
  subtitle: string | null;
  createdAt: string;
}

export async function getRecentActivity(limit = 10): Promise<AdminActivityItem[]> {
  const events = await queryAll<{ id: string; name: string; created_at: Date }>(
    `SELECT id, name, created_at FROM events ORDER BY created_at DESC LIMIT 8`
  );
  const bookings = await queryAll<{
    id: string;
    created_at: Date;
    event_name: string;
    booking_date: string;
  }>(
    `SELECT vb.id, vb.created_at, e.name AS event_name, vb.booking_date::text
     FROM venue_bookings vb
     INNER JOIN events e ON e.id = vb.event_id
     WHERE vb.status = 'confirmed'
     ORDER BY vb.created_at DESC LIMIT 6`
  );
  const approvals = await queryAll<{
    id: string;
    client_identifier: string;
    approved_at: Date;
    event_name: string;
  }>(
    `SELECT a.id, a.client_identifier, a.approved_at, e.name AS event_name
     FROM approvals a
     INNER JOIN events e ON e.id = a.event_id
     ORDER BY a.approved_at DESC LIMIT 8`
  );
  const inquirySubmitted = await queryAll<{
    id: string;
    client_name: string | null;
    event_type: string | null;
    submitted_at: Date;
  }>(
    `SELECT id, client_name, event_type, submitted_at FROM inquiries
     WHERE is_submitted = true AND submitted_at IS NOT NULL
     ORDER BY submitted_at DESC LIMIT 8`
  );
  const inquiryConverted = await queryAll<{
    id: string;
    client_name: string | null;
    converted_at: Date;
    event_name: string;
  }>(
    `SELECT i.id, i.client_name, i.converted_at, e.name AS event_name
     FROM inquiries i
     INNER JOIN events e ON e.id = i.converted_event_id
     WHERE i.converted_at IS NOT NULL
     ORDER BY i.converted_at DESC LIMIT 8`
  );

  const merged: AdminActivityItem[] = [];

  for (const r of events) {
    merged.push({
      id: `evt-${r.id}`,
      type: 'event_created',
      title: `New event: ${r.name}`,
      subtitle: 'Created',
      createdAt: r.created_at.toISOString(),
    });
  }
  for (const r of bookings) {
    merged.push({
      id: `book-${r.id}`,
      type: 'booking_confirmed',
      title: `Booking confirmed: ${r.event_name}`,
      subtitle: r.booking_date,
      createdAt: r.created_at.toISOString(),
    });
  }
  for (const r of approvals) {
    merged.push({
      id: `appr-${r.id}`,
      type: 'design_approved',
      title: `Design approved: ${r.event_name}`,
      subtitle: `Client: ${r.client_identifier}`,
      createdAt: r.approved_at.toISOString(),
    });
  }
  for (const r of inquirySubmitted) {
    const who = r.client_name?.trim() ? r.client_name.trim() : 'Client';
    const et = r.event_type?.trim() ? r.event_type.trim() : 'Inquiry';
    merged.push({
      id: `inq-sub-${r.id}`,
      type: 'inquiry_submitted',
      title: `Inquiry submitted: ${who} — ${et}`,
      subtitle: 'Planner lead',
      createdAt: r.submitted_at.toISOString(),
    });
  }
  for (const r of inquiryConverted) {
    merged.push({
      id: `inq-conv-${r.id}`,
      type: 'inquiry_converted',
      title: `Inquiry converted: ${r.event_name}`,
      subtitle: r.client_name?.trim()
        ? `Client: ${r.client_name.trim()}`
        : 'Linked to planner event',
      createdAt: r.converted_at.toISOString(),
    });
  }

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged.slice(0, limit);
}
