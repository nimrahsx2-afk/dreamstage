// Vendor Service - CRUD operations for event vendors

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '../../db/client';
import type {
  Vendor,
  VendorInput,
  VendorUpdate,
  VendorPayment,
  VendorPaymentInput,
  VendorQuote,
  VendorSummary,
  DbVendor,
  DbVendorPayment,
  DbVendorQuote,
} from './budget.types';
import { calculateVendorSummaries } from './budget.calculations';

// Transform database row to Vendor
function transformVendor(row: DbVendor): Vendor {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    category: row.category,
    totalContractAmount: parseFloat(row.total_contract_amount ?? '0'),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Transform database row to VendorPayment
function transformPayment(row: DbVendorPayment): VendorPayment {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    amount: parseFloat(row.amount),
    type: row.payment_type,
    paidAt: row.paid_at,
    notes: row.notes,
    receiptUrl: null,
    createdAt: row.created_at,
  };
}

// Transform database row to VendorQuote
function transformQuote(row: DbVendorQuote): VendorQuote {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

// ============ VENDOR CRUD ============

// Get all vendors for an event
export async function getEventVendors(eventId: string): Promise<Vendor[]> {
  const rows = await queryAll<DbVendor>(
    `SELECT * FROM vendors WHERE event_id = $1 ORDER BY name ASC`,
    [eventId]
  );
  return rows.map(transformVendor);
}

// Get a single vendor
export async function getVendor(vendorId: string): Promise<Vendor | null> {
  const row = await queryOne<DbVendor>(
    `SELECT * FROM vendors WHERE id = $1`,
    [vendorId]
  );
  return row ? transformVendor(row) : null;
}

// Create a new vendor
export async function createVendor(
  eventId: string,
  input: VendorInput
): Promise<Vendor> {
  const id = uuidv4();

  const row = await queryOne<DbVendor>(
    `INSERT INTO vendors (id, event_id, name, company, email, phone, category, total_contract_amount, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      eventId,
      input.name,
      input.company || null,
      input.email || null,
      input.phone || null,
      input.category,
      input.totalContractAmount,
      input.notes || null,
    ]
  );

  return transformVendor(row!);
}

// Update a vendor
export async function updateVendor(
  vendorId: string,
  input: VendorUpdate
): Promise<Vendor | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.company !== undefined) {
    updates.push(`company = $${paramIndex++}`);
    values.push(input.company);
  }
  if (input.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(input.email);
  }
  if (input.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(input.phone);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }
  if (input.totalContractAmount !== undefined) {
    updates.push(`total_contract_amount = $${paramIndex++}`);
    values.push(input.totalContractAmount);
  }

  if (updates.length === 0) {
    return getVendor(vendorId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(vendorId);

  const row = await queryOne<DbVendor>(
    `UPDATE vendors SET ${updates.join(', ')} 
     WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return row ? transformVendor(row) : null;
}

// Delete a vendor (cascades to payments and quotes)
export async function deleteVendor(vendorId: string): Promise<boolean> {
  const result = await query(`DELETE FROM vendors WHERE id = $1`, [vendorId]);
  return (result.rowCount ?? 0) > 0;
}

// ============ VENDOR PAYMENTS ============

// Get all payments for a vendor
export async function getVendorPayments(
  vendorId: string
): Promise<VendorPayment[]> {
  const rows = await queryAll<DbVendorPayment>(
    `SELECT * FROM vendor_payments WHERE vendor_id = $1 ORDER BY paid_at DESC`,
    [vendorId]
  );
  return rows.map(transformPayment);
}

// Get all payments for an event (across all vendors)
export async function getEventPayments(
  eventId: string
): Promise<VendorPayment[]> {
  const rows = await queryAll<DbVendorPayment>(
    `SELECT vp.* FROM vendor_payments vp
     JOIN vendors v ON vp.vendor_id = v.id
     WHERE v.event_id = $1
     ORDER BY vp.paid_at DESC`,
    [eventId]
  );
  return rows.map(transformPayment);
}

// Create a vendor payment
// Validates: cannot pay more than remaining balance (total contract - already paid)
export async function createVendorPayment(
  vendorId: string,
  input: VendorPaymentInput
): Promise<VendorPayment> {
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  const existingPayments = await getVendorPayments(vendorId);
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = vendor.totalContractAmount - totalPaid;
  if (input.amount > remaining) {
    throw new Error(
      `Cannot pay more than remaining balance (Rs. ${remaining.toLocaleString('en-PK')})`
    );
  }
  if (input.amount <= 0) {
    throw new Error('Payment amount must be positive');
  }

  const id = uuidv4();

  const row = await queryOne<DbVendorPayment>(
    `INSERT INTO vendor_payments (id, vendor_id, amount, payment_type, paid_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id,
      vendorId,
      input.amount,
      input.type,
      input.paidAt || new Date(),
      input.notes || null,
    ]
  );

  return transformPayment(row!);
}

// Delete a vendor payment
export async function deleteVendorPayment(paymentId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM vendor_payments WHERE id = $1`,
    [paymentId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ============ VENDOR QUOTES ============

// Get all quotes for a vendor
export async function getVendorQuotes(vendorId: string): Promise<VendorQuote[]> {
  const rows = await queryAll<DbVendorQuote>(
    `SELECT * FROM vendor_quotes WHERE vendor_id = $1 ORDER BY uploaded_at DESC`,
    [vendorId]
  );
  return rows.map(transformQuote);
}

// Create a vendor quote record (after upload to storage)
export async function createVendorQuote(
  vendorId: string,
  fileName: string,
  fileUrl: string,
  fileSize: number
): Promise<VendorQuote> {
  const id = uuidv4();

  const row = await queryOne<DbVendorQuote>(
    `INSERT INTO vendor_quotes (id, vendor_id, file_name, file_url, file_size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, vendorId, fileName, fileUrl, fileSize]
  );

  return transformQuote(row!);
}

// Delete a vendor quote
export async function deleteVendorQuote(quoteId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM vendor_quotes WHERE id = $1`,
    [quoteId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ============ VENDOR SUMMARIES ============

// Get vendor summaries with payment status for an event
export async function getEventVendorSummaries(
  eventId: string
): Promise<VendorSummary[]> {
  const vendors = await getEventVendors(eventId);
  const payments = await getEventPayments(eventId);
  return calculateVendorSummaries(vendors, payments);
}

// Verify vendor belongs to event
export async function verifyVendorOwnership(
  vendorId: string,
  eventId: string
): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `SELECT id FROM vendors WHERE id = $1 AND event_id = $2`,
    [vendorId, eventId]
  );
  return result !== null;
}
