// Budget Module Types

export interface BudgetItem {
  id: string;
  eventId: string;
  assetId: string | null;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitPriceOverride: number | null;
  vendorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetItemInput {
  assetId?: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitPriceOverride?: number;
  vendorId?: string;
}

export interface BudgetItemUpdate {
  description?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  unitPriceOverride?: number | null;
  vendorId?: string | null;
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  totalContractAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  category: string;
  totalContractAmount: number;
  notes?: string;
}

export interface VendorUpdate {
  name?: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string;
  totalContractAmount?: number;
  notes?: string | null;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  type: 'deposit' | 'final';
  paidAt: Date;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: Date;
}

export interface VendorPaymentInput {
  amount: number;
  type: 'deposit' | 'final';
  paidAt?: Date;
  notes?: string;
  receiptUrl?: string;
}

export interface VendorQuote {
  id: string;
  vendorId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface BudgetSummary {
  totalAssetCost: number;
  totalVendorCost: number;
  totalPaid: number;
  totalRemaining: number;
  grandTotal: number;
  budgetCeiling: number | null;
  isOverBudget: boolean;
  overBudgetAmount: number;
}

export interface CategoryBreakdown {
  category: string;
  itemCount: number;
  totalCost: number;
  percentage: number;
}

export interface VendorSummary {
  vendorId: string;
  vendorName: string;
  company: string | null;
  category: string;
  totalContractAmount: number;
  totalPaid: number;
  balance: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

// Database row types
export interface DbBudgetItem {
  id: string;
  event_id: string;
  asset_id: string | null;
  description: string;
  category: string;
  quantity: number;
  unit_price: string;
  unit_price_override: string | null;
  vendor_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbVendor {
  id: string;
  event_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  total_contract_amount: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbVendorPayment {
  id: string;
  vendor_id: string;
  amount: string;
  payment_type: 'deposit' | 'final';
  paid_at: Date;
  notes: string | null;
  created_at: Date;
}

export interface DbVendorQuote {
  id: string;
  vendor_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: Date;
}
